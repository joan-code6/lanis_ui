const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// A small hook host lets us exercise request races and keyboard events without a browser.
let hooks = [], cursor = 0, effects = [], dirty = false, tree;
const timers = new Map();
let timerId = 0;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const React = {
  useState(initial) {
    const i = cursor++;
    if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
    return [hooks[i], value => {
      const next = typeof value === 'function' ? value(hooks[i]) : value;
      if (!Object.is(next, hooks[i])) { hooks[i] = next; dirty = true; }
    }];
  },
  useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
  useMemo(fn, deps) {
    const i = cursor++;
    if (!same(hooks[i]?.deps, deps)) hooks[i] = { deps, value: fn() };
    return hooks[i].value;
  },
  useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!same(hooks[i]?.deps, deps)) effects.push(() => {
      hooks[i]?.cleanup?.();
      hooks[i] = { deps, cleanup: fn() };
    });
  },
};
const jsx = (type, props) => ({ type, props });
function load(path, require) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports, require, AbortController,
    DOMParser: class { parseFromString(text) { return { body: { textContent: text.replace(/<[^>]*>/g, '') } }; } },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return module.exports;
}
const matching = load('src/utils/search.ts');
const semanticRequests = [];
const personalCaches = {};
let moduleReads = 0;
const pending = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const empty = async () => ({ success: false });
const navigated = [];
const api = {
  authAPI: { getUserProfile: empty }, messagesAPI: { searchRecipients: empty, getMessageHeaders: empty },
  calendarAPI: { getEvents: empty }, coursesAPI: { getCourses: empty }, appsAPI: { getModules: empty },
  timetableAPI: { getTimetable: empty }, studyGroupsAPI: { getStudyGroups: empty }, dateiverteilungAPI: { getOverview: empty },
  searchAPI: { semanticSearch(token, query, count, signal) {
    const request = { ...pending(), query, signal }; semanticRequests.push(request); return request.promise;
  } },
};
const Component = load('src/components/search/GlobalSearch.tsx', name => {
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (name === 'react-router-dom') return { useNavigate: () => href => navigated.push(href) };
  if (name.endsWith('/AuthContext')) return { useAuth: () => ({ token: 'test', user: null }) };
  if (name.endsWith('/services/api')) return api;
  if (name.endsWith('/utils/search')) return matching;
  if (name.endsWith('/moduleCache')) return { readModulesCache: () => { moduleReads++; return []; } };
  if (name.endsWith('/courseNormalization')) return { normalizeCourseList: () => [] };
  if (name.endsWith('/accountDataWrites')) return { readPersonalCache: key => personalCaches[key] || null };
  if (name.endsWith('/analytics/client')) return { capture: empty };
  if (name.endsWith('/analytics/policy')) return { resultCountBucket: () => '0', searchCategory: x => x };
  if (name.startsWith('@heroicons')) return new Proxy({}, { get: () => 'icon' });
  throw new Error(`Unexpected import ${name}`);
}).default;
let props = { isOpen: true, onClose() {}, basePath: '/demo' };
function render() {
  let passes = 0;
  do {
    dirty = false; cursor = 0; effects = [];
    tree = Component(props);
    effects.forEach(effect => effect());
    assert(++passes < 20, 'render should settle');
  } while (dirty);
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
const input = () => nodes(tree).find(node => node.type === 'input');
const options = () => nodes(tree).filter(node => node.props?.role === 'option');
const related = () => {
  const button = nodes(tree).find(node => node.type === 'button' && node.props.children === 'Ähnliche Inhalte suchen');
  assert(button, 'related search should be available explicitly');
  button.props.onClick(); render();
};
const type = value => { input().props.onChange({ target: { value } }); render(); };
const key = value => { input().props.onKeyDown({ key: value, preventDefault() {} }); render(); };
const runTimers = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); };
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); render(); };
const result = (id, category, href) => ({ id, category, href, title: id, subtitle: '', icon: '' });
(async () => {
  render();
  type('hkpu'); runTimers(); await flush();
  assert.equal(semanticRequests.length, 0, 'a short specific query must not automatically request unrelated semantic matches');
  assert.equal(options().length, 0);
  type('old'); related(); runTimers(); await flush();
  type('new');
  key('ArrowDown'); // Navigating an empty list must keep the selection at zero.
  assert(semanticRequests[0].signal.aborted, 'replaced query cancels in-flight semantics');
  related(); runTimers(); await flush();
  semanticRequests[1].resolve({ success: true, results: [
    { ...result('sem-msg-1', 'Nachrichten', '/messages?conversation=1'), subtitle: 'Von: 1724128' },
    result('sem-crs-1', 'Unterricht', '/courses/1'),
    result('sem-msg-2', 'Nachrichten', '/messages?conversation=2'),
  ] });
  await flush();
  semanticRequests[0].resolve({ success: true, results: [result('stale', 'Kalender', '/calendar')] });
  await flush();
  assert.equal(options().length, 3, 'old responses must not overwrite the current results');
  assert(!JSON.stringify(options()).includes('Von: 1724128'), 'related results also hide unresolved numeric sender IDs');
  assert(options()[0].props['aria-selected'], 'first arriving result remains selected after an empty-list arrow press');
  key('ArrowDown');
  assert.equal(options().find(node => node.props['aria-selected']).props.children[1].props.children[0].props.children, 'sem-msg-2');
  key('Enter');
  assert.equal(navigated.at(-1), '/demo/messages?conversation=2', 'Enter opens the highlighted row in displayed group order');
  // A slow source must not hold back results from a completed source.
  api.calendarAPI.getEvents = () => new Promise(() => {});
  api.messagesAPI.searchRecipients = async () => ({ success: true, results: [
    { id: 'person-1', name: 'Partial Person', username: 'partial' },
  ] });
  type('partial'); related(); runTimers(); await flush();
  assert.equal(options().length, 1, 'fast keyword results appear while calendar and semantics are pending');
  api.messagesAPI.getMessageHeaders = async () => ({ success: true, conversations: [
    { Id: '1', Uniquid: '1', Betreff: 'API Test', Sender: '1724128', SenderName: '1724128' },
  ] });
  api.messagesAPI.searchRecipients = async () => ({ success: true, results: [
    { id: '1724128', name: 'Known Person', username: 'hkpu' },
  ] });
  type('hkpu'); runTimers(); await flush();
  // Name resolution also lets a username query match that person's messages.
  assert(options().some(node => JSON.stringify(node).includes('Von: Known Person')), 'live results resolve numeric senders');
  assert(!options().some(node => JSON.stringify(node).includes('Von: 1724128')));
  api.messagesAPI.getMessageHeaders = async () => ({ success: true, conversations: Array.from({ length: 20 }, (_, i) => ({
    Id: String(i), Uniquid: String(i), Betreff: `Specific target ${i}`, Sender: '1724128',
  })) });
  api.messagesAPI.searchRecipients = empty;
  type('specific'); runTimers(); await flush();
  assert.equal(options().length, 3, 'initial results must not flood the dialog with one category');
  const more = nodes(tree).find(node => node.type === 'button' && node.props.children === 'Weitere Treffer anzeigen');
  assert(more); more.props.onClick(); render();
  assert.equal(options().length, 20, 'additional direct results remain available on request');
  const listbox = nodes(tree).find(node => node.props?.role === 'listbox');
  const groups = listbox.props.children.flat(Infinity).filter(Boolean);
  assert(groups.every(node => node.props.role === 'group'));
  assert(groups.every(group => nodes(group).some(node => node.props?.id === group.props['aria-labelledby'])));
  assert(options().every(node => node.props.tabIndex === -1));
  assert(!nodes(listbox).some(node => node.props?.role === 'status'));

  const staleHeaders = pending();
  api.messagesAPI.getMessageHeaders = () => staleHeaders.promise;
  type('stalelive'); runTimers(); await flush();
  api.messagesAPI.getMessageHeaders = empty;
  type('replacement'); runTimers(); await flush();
  staleHeaders.resolve({ success: true, conversations: [{ Id: 'stale', Betreff: 'stalelive', Sender: 'Someone' }] });
  await flush();
  assert.equal(options().length, 0, 'late live results for the previous query must not append');

  personalCaches.username_cache = JSON.stringify({ data: { '1724128': 'Cached Person' } });
  props = { ...props, basePath: '' }; render();
  type('Cached Person'); runTimers(); await flush();
  assert(JSON.stringify(options()).includes('Cached Person'));
  assert(!JSON.stringify(options()).includes('Username: 1724128'));
  const readsBeforeNavigation = moduleReads;
  key('ArrowDown'); key('ArrowUp');
  assert.equal(moduleReads, readsBeforeNavigation, 'selection changes must not re-read the module cache');

  type('uniquezz'); runTimers(); await flush();
  assert.equal(options().length, 0, 'a new query resets expanded and related results');
  const closedHeaders = pending();
  api.messagesAPI.getMessageHeaders = () => closedHeaders.promise;
  type('closedlive'); related(); runTimers(); await flush();
  props = { ...props, isOpen: false }; render();
  assert(semanticRequests.at(-1).signal.aborted, 'closing cancels active search');
  semanticRequests.at(-1).resolve({ success: true, results: [result('late', 'Kalender', '/calendar')] });
  closedHeaders.resolve({ success: true, conversations: [{ Id: 'late', Betreff: 'closedlive', Sender: 'Someone' }] });
  await flush();
  assert.equal(tree, null);
  props = { ...props, isOpen: true }; render();
  assert.equal(options().length, 0, 'closing and reopening must not restore late live results');
  console.log('Global search lifecycle checks passed: explicit related search, compact/expanded results, sender names, request races, and keyboard navigation.');
})().catch(error => { console.error(error); process.exitCode = 1; });

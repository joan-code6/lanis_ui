const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const transpile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let generation = 1;
let calls = 0;
let rejectNext = false;
let now = 1000;
let nextRequest;
const cacheCode = fs.readFileSync('src/services/api.ts', 'utf8').split('// Only speculative reads')[1].split('// Startup deletion recovery')[0];
const context = {
  exports: {}, Map, Date: { now: () => now }, window: { location: { pathname: '/dashboard' } },
  captureAccountDataGeneration: () => generation, canUseAccountToken: () => true,
  axios: { CanceledError: Error },
  apiClient: { get: async () => { calls++; if (nextRequest) { const pending = nextRequest; nextRequest = undefined; return pending; } if (rejectNext) { rejectNext = false; throw Error('offline'); } return { data: { success: true } }; } },
};
vm.runInNewContext(transpile('//' + cacheCode), context);
const { readAPI, clearPrefetchedData } = context.exports;
const config = { headers: { 'X-Session-Token': 'test' }, params: { refresh: false } };
(async () => {
  await Promise.all([readAPI('/vertretungsplan', config, true), readAPI('/vertretungsplan', config)]);
  assert.equal(calls, 1, 'navigation shares in-flight prefetch');
  await readAPI('/vertretungsplan', config, true);
  await readAPI('/vertretungsplan', { ...config, params: {} });
  assert.equal(calls, 2, 'false refresh matches default');
  await readAPI('/vertretungsplan', { ...config, params: { refresh: true } });
  assert.equal(calls, 3, 'explicit refresh bypasses prefetch');
  await readAPI('/vertretungsplan', config, true);
  now += 30001;
  await readAPI('/vertretungsplan', config);
  assert.equal(calls, 5, 'expired data is fetched again');
  await readAPI('/vertretungsplan', config, true);
  generation++;
  await readAPI('/vertretungsplan', config);
  assert.equal(calls, 7, 'account generation invalidates cache');
  await readAPI('/vertretungsplan', config, true);
  await readAPI('/vertretungsplan', { headers: { 'X-Session-Token': 'other' } });
  assert.equal(calls, 9, 'different sessions never share data');
  clearPrefetchedData();
  rejectNext = true;
  await assert.rejects(readAPI('/vertretungsplan', config, true));
  await readAPI('/vertretungsplan', config);
  assert.equal(calls, 11, 'failed prefetch retries on navigation');
  await assert.rejects(readAPI('/vertretungsplan', { ...config, signal: { aborted: true } }));

  async function pendingPrefetchCase(outcome, options = {}) {
    clearPrefetchedData();
    let resolve, reject;
    nextRequest = new Promise((ok, fail) => { resolve = ok; reject = fail; });
    const signal = new AbortController();
    const startCalls = calls;
    const warm = readAPI('/vertretungsplan', config, true);
    const warmResult = warm.catch(() => undefined);
    const navigation = readAPI('/vertretungsplan', { ...config, signal: signal.signal });
    if (options.abort) signal.abort();
    if (options.changeSession) generation++;
    if (options.failRetry) rejectNext = true;
    if (outcome === 'reject') reject(Error('prefetch failed'));
    else resolve({ data: { success: false } });
    if (options.abort || options.changeSession || options.failRetry) await assert.rejects(navigation);
    else assert.equal((await navigation).data.success, true, 'navigation retries failed pending prefetch');
    await warmResult;
    assert.equal(calls - startCalls, options.abort || options.changeSession ? 1 : 2,
      'one live retry at most, and none after cancellation or session change');
  }
  await pendingPrefetchCase('reject');
  await pendingPrefetchCase('unsuccessful');
  await pendingPrefetchCase('reject', { failRetry: true });
  await pendingPrefetchCase('reject', { abort: true });
  await pendingPrefetchCase('unsuccessful', { changeSession: true });

  async function refreshInvalidatesDefault(pending) {
    clearPrefetchedData();
    const startCalls = calls;
    let resolve;
    if (pending) nextRequest = new Promise(ok => { resolve = ok; });
    const rootConfig = { ...config, params: { folder_id: 0, refresh: false } };
    const otherConfig = { ...config, params: { folder_id: 1 } };
    const warm = readAPI('/dateispeicher', rootConfig, true);
    if (!pending) await warm;
    const other = await readAPI('/dateispeicher', otherConfig, true);
    await readAPI('/dateispeicher', { ...rootConfig, params: { refresh: true, folder_id: 0 } });
    if (pending) resolve({ data: { success: true, version: 'old' } });
    await warm;
    await readAPI('/dateispeicher', rootConfig);
    assert.equal(calls - startCalls, 4, 'refresh invalidates matching default, including late prefetch completion');
    assert.equal(await readAPI('/dateispeicher', otherConfig), other, 'refresh preserves other request parameters');
    assert.equal(calls - startCalls, 4, 'unrelated prefetched response remains reusable');
  }
  await refreshInvalidatesDefault(false);
  await refreshInvalidatesDefault(true);

  const orderContext = { exports: {}, require: path => path.includes('sidebarNavigation') ? {
    normalizeSidebarOrder: order => order,
  } : { readAPI: async () => {} } };
  vm.runInNewContext(transpile(fs.readFileSync('src/utils/modulePrefetch.ts', 'utf8')), orderContext);
  const modules = ['Kalender', 'Nachrichten', 'Stundenplan', 'Dateispeicher', 'External'].map(name => ({ name, url: '/' + name.toLowerCase() + '.php' }));
  const preferences = { dashboard: { pinned_modules: ['Stundenplan', 'Kalender'], hidden_modules: ['Dateispeicher'] }, sidebar: { order: ['messages', 'calendar', 'timetable'], hidden_items: [] } };
  assert.deepEqual(Array.from(orderContext.exports.modulePreloadOrder(modules, preferences)), ['timetable', 'calendar', 'messages']);
  const preloadOrder = (dashboardHidden, sidebarHidden) => Array.from(orderContext.exports.modulePreloadOrder(modules, {
    ...preferences,
    dashboard: { ...preferences.dashboard, hidden_modules: dashboardHidden },
    sidebar: { ...preferences.sidebar, hidden_items: sidebarHidden },
  }));
  assert.deepEqual(preloadOrder(['Kalender', 'Dateispeicher'], []), ['timetable', 'messages', 'calendar'],
    'dashboard-hidden modules still preload in sidebar order');
  assert.deepEqual(preloadOrder(['Kalender', 'Dateispeicher'], ['calendar']), ['timetable', 'messages'],
    'modules hidden in both places are excluded, including stale pins');
  assert.deepEqual(preloadOrder(['Dateispeicher'], ['calendar']), ['timetable', 'calendar', 'messages'],
    'dashboard-visible pinned modules keep priority when hidden in sidebar');
  assert.deepEqual(preloadOrder([], ['dateispeicher']), ['timetable', 'calendar', 'messages', 'dateispeicher'],
    'dashboard-visible modules remain in fallback when hidden in sidebar');
  console.log('Module prefetch checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

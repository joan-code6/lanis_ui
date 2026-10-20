const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const transpile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let generation = 1;
let calls = 0;
let rejectNext = false;
let now = 1000;
const cacheCode = fs.readFileSync('src/services/api.ts', 'utf8').split('// Only speculative reads')[1].split('// Startup deletion recovery')[0];
const context = {
  exports: {}, Map, Date: { now: () => now }, window: { location: { pathname: '/dashboard' } },
  captureAccountDataGeneration: () => generation, canUseAccountToken: () => true,
  axios: { CanceledError: Error },
  apiClient: { get: async () => { calls++; if (rejectNext) { rejectNext = false; throw Error('offline'); } return { data: { success: true } }; } },
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

  const orderContext = { exports: {}, require: path => path.includes('sidebarNavigation') ? {
    normalizeSidebarOrder: order => order,
  } : { readAPI: async () => {} } };
  vm.runInNewContext(transpile(fs.readFileSync('src/utils/modulePrefetch.ts', 'utf8')), orderContext);
  const modules = ['Kalender', 'Nachrichten', 'Stundenplan', 'Dateispeicher', 'External'].map(name => ({ name, url: '/' + name.toLowerCase() + '.php' }));
  const preferences = { dashboard: { pinned_modules: ['Stundenplan', 'Kalender'], hidden_modules: ['Dateispeicher'] }, sidebar: { order: ['messages', 'calendar', 'timetable'], hidden_items: [] } };
  assert.deepEqual(Array.from(orderContext.exports.modulePreloadOrder(modules, preferences)), ['timetable', 'calendar', 'messages']);
  console.log('Module prefetch checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

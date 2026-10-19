const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('src/utils/resourceCache.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
const now = 1000;
vm.runInNewContext(compiled, {
  module: loaded, exports: loaded.exports, AbortController, Date: { now: () => now },
});
const { readResource, refreshResource, subscribeResource, clearResourceCache } = loaded.exports;

(async () => {
  const key = 'backend:account:timetable:personal:A';
  let calls = 0;
  let resolve;
  let force;
  const load = (_signal, refresh) => {
    calls++;
    force = refresh;
    return new Promise(done => { resolve = done; });
  };
  let notifications = 0;
  const unsubscribe = subscribeResource(key, () => notifications++);
  const first = refreshResource(key, load);
  assert.equal(refreshResource(key, load), first, 'concurrent mounts share one request');
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(force, false);
  resolve({ lesson: 'Maths' });
  await first;
  unsubscribe();
  assert.equal(readResource(key).data.lesson, 'Maths', 'navigation does not discard data');
  assert.equal(notifications, 2);
  assert.equal(readResource('other-account').data, undefined);
  assert.equal(readResource('backend:account:timetable:all:A').data, undefined);
  assert.equal(readResource('backend:account:timetable:personal:B').data, undefined);

  // Return immediately at the exact same timestamp: even newly cached data revalidates.
  const background = refreshResource(key, load);
  assert.equal(readResource(key).data.lesson, 'Maths', 'cached content remains during refresh');
  assert.equal(readResource(key).refreshing, true);
  assert.equal(refreshResource(key, load), background, 'revisiting during refresh shares the request');
  await Promise.resolve();
  assert.equal(calls, 2, 'every visit requests data regardless of cache age');
  assert.equal(force, true, 'background refresh bypasses backend cache');
  resolve({ lesson: 'Physics' });
  await background;
  assert.equal(readResource(key).data.lesson, 'Physics');

  await refreshResource(key, async () => { throw new Error('Offline'); }, true);
  assert.equal(readResource(key).data.lesson, 'Physics', 'failed refresh retains cached data');
  assert.equal(readResource(key).error, 'Offline');
  assert.equal(readResource(key).refreshing, false);
  await refreshResource(key, async (_signal, refresh) => {
    assert.equal(refresh, true, 'manual refresh explicitly requests fresh data');
    return [];
  }, true);
  assert.equal(readResource(key).data.length, 0, 'empty results are cached');
  assert.equal(readResource(key).error, '');

  const pendingLogout = refreshResource(key, load);
  await Promise.resolve();
  clearResourceCache();
  resolve({ lesson: 'Private old response' });
  await pendingLogout;
  assert.equal(readResource(key).data, undefined, 'logout discards in-flight responses');
  const nextLogin = refreshResource(key, async () => ({ lesson: 'New session' }));
  await nextLogin;
  assert.equal(readResource(key).data.lesson, 'New session');
  clearResourceCache();
  console.log('Resource cache checks passed: navigation, immediate revalidation on every visit, background replacement, deduplication, view/account separation, empty results, failure retention, manual refresh and logout races.');
})().catch(error => { console.error(error); process.exitCode = 1; });

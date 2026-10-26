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
const { readResource, refreshResource, subscribeResource, clearResourceCache, updateResource, resourceCacheGeneration } = loaded.exports;

// Exercise the real hook's scope calculation without needing a DOM or credentials.
let auth = { token: 'session-A', user: { school_id: '123', username: 'pupil-A' } };
let backend = 'https://backend-one.invalid';
let loginGeneration = 1;
const hookExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useCachedResource.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: hookExports,
  require(name) {
    if (name.endsWith('/AuthContext')) return { useAuth: () => auth };
    if (name.endsWith('/backendConfig')) return { getApiBaseUrl: () => backend };
    if (name.endsWith('/accountDataWrites')) return { captureAccountDataGeneration: () => loginGeneration };
    if (name === '../analytics/experience') return { startExperience: () => () => {}, resourceLabel: () => 'other' };
    if (name === '../analytics/client') return { capture: () => {}, analyticsEpoch: () => 0 };
    if (name.endsWith('/resourceCache')) return loaded.exports;
    if (name === 'react') return {};
    throw new Error(`Unexpected hook dependency: ${name}`);
  },
});
const scope = resource => hookExports.useResourceKey(resource);
const originalScope = scope('timetable:personal:A');
auth.token = 'rotated-A';
assert.equal(scope('timetable:personal:A'), originalScope, 'token rotation retains the current session cache');
assert(!originalScope.includes('session-A') && !originalScope.includes('rotated-A'), 'keys do not store session tokens');
assert.notEqual(scope('timetable:all:A'), originalScope, 'view options have separate caches');
auth.user.username = 'pupil-B';
assert.notEqual(scope('timetable:personal:A'), originalScope, 'accounts have separate caches');
auth.user.username = 'pupil-A';
auth.user.school_id = '456';
assert.notEqual(scope('timetable:personal:A'), originalScope, 'schools have separate caches');
auth.user.school_id = '123';
backend = 'https://backend-two.invalid';
assert.notEqual(scope('timetable:personal:A'), originalScope, 'backends have separate caches');
backend = 'https://backend-one.invalid';
loginGeneration++;
assert.notEqual(scope('timetable:personal:A'), originalScope, 'a new login cannot restore prior session data');
loginGeneration--;
auth.token = 'demo-test';
assert.notEqual(scope('timetable:personal:A'), originalScope, 'demo and live data remain separate');
assert.equal(hookExports.useResourceKey('search', false), null, 'disabled resources do not fetch');
auth.token = null;
assert.equal(scope('timetable:personal:A'), null, 'signed-out views have no cache key');

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
  const generation = resourceCacheGeneration();
  updateResource('interactive', { done: false }, generation);
  updateResource('interactive', previous => ({ ...previous, done: true }), generation);
  assert.equal(readResource('interactive').data.done, true, 'interactive changes update cached views');
  clearResourceCache();
  updateResource('interactive', { done: false }, generation);
  assert.equal(readResource('interactive').data, undefined, 'old interactive callbacks cannot restore a signed-out cache');
  updateResource('interactive', [], resourceCacheGeneration());
  assert.equal(readResource('interactive').data.length, 0, 'new session callbacks can cache an empty result');
  clearResourceCache();
  console.log('Resource cache checks passed: navigation, immediate revalidation on every visit, background replacement, deduplication, view/account separation, empty results, failure retention, manual refresh and logout races.');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function storage() {
  const map = new Map();
  return { get length() { return map.size; }, key: i => [...map.keys()][i] ?? null,
    getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k), clear: () => map.clear() };
}
const code = ts.transpileModule(fs.readFileSync('src/utils/appStorage.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const local = storage(), tab = storage();
local.setItem('auth_access_token', 'operator');
local.setItem('messages_cache', 'operator messages');
tab.setItem('unrelated', 'keep');
function load(hash, sessionStorage = tab) {
  const exports = {};
  vm.runInNewContext(code, { exports, window: { location: { hash }, sessionStorage, localStorage: local } });
  return exports;
}
const preview = load('#impersonate=launch');
assert.equal(preview.isImpersonating, true);
assert.equal(preview.appStorage.getItem('auth_access_token'), null);
preview.appStorage.setItem('auth_access_token', 'student');
preview.appStorage.setItem('messages_cache', 'student messages');
assert.equal(local.getItem('auth_access_token'), 'operator');
assert.equal(preview.appStorage.length, 2);
assert.equal(load('').appStorage.getItem('auth_access_token'), 'student', 'reload stays in preview');
assert.equal(load('', storage()).appStorage.getItem('auth_access_token'), 'operator', 'other tabs stay normal');
preview.appStorage.clear();
assert.equal(preview.appStorage.length, 0);
assert.equal(tab.getItem('unrelated'), 'keep');
assert.equal(tab.getItem('__lanis_preview_tab'), '1', 'ended preview cannot restore operator login');
assert.equal(local.getItem('messages_cache'), 'operator messages');
console.log('Preview storage: account/cache isolation, reload, tab separation, scoped clear and end-state isolation passed.');

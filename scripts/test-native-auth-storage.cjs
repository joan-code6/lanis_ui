const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

(async () => {
  const recoveryKey = '__lanis_account_deletion_recovery';
  const browser = new Map([['auth_access_token', 'legacy'], [recoveryKey, 'legacy-proof']]);
  let vault = { auth_access_token: 'access', auth_refresh_token: 'refresh' };
  let failSave = false;
  let cleared = 0;
  const plugin = {
    async getSession() { return { values: { ...vault }, backend: 'https://school.invalid' }; },
    async saveSession({ values }) {
      await Promise.resolve();
      if (failSave) throw new Error('vault locked');
      vault = { ...values };
    },
    async clearSession() { cleared += 1; vault = {}; },
  };
  const context = {
    exports: {},
    require(name) { assert.equal(name, './native'); return { isAndroid: true, LanisNative: plugin }; },
    localStorage: { removeItem(key) { browser.delete(key); }, getItem(key) { return browser.get(key) ?? null; } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/platform/authStorage.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const storage = context.exports;
  await storage.restoreNativeSession('https://school.invalid');
  assert.equal(browser.size, 0, 'Legacy credentials and recovery proofs must leave WebView storage');
  assert.equal(storage.authStorage.getItem('auth_refresh_token'), 'refresh');
  storage.authStorage.setItem(recoveryKey, 'encrypted-proof');
  storage.authStorage.setItem('auth_user', 'profile');
  await storage.clearNativeSession(true);
  assert.deepEqual(vault, { [recoveryKey]: 'encrypted-proof' }, 'Recovery retains only its encrypted proof after queued writes drain');
  assert.equal(storage.authStorage.getItem('auth_user'), null);
  storage.authStorage.removeItem(recoveryKey);
  await storage.flushAuthStorage();
  assert.deepEqual(vault, {});
  failSave = true;
  storage.authStorage.setItem('auth_access_token', 'unsaved');
  await assert.rejects(storage.flushAuthStorage(), /sicher gespeichert/);
  failSave = false;
  await storage.clearNativeSession();
  await storage.flushAuthStorage();
  assert.deepEqual(vault, {});
  assert.equal(cleared, 2);
  storage.authStorage.setItem('auth_access_token', 'old-account');
  const signingOut = storage.clearNativeSession();
  storage.authStorage.setItem('auth_access_token', 'new-account');
  await signingOut;
  await storage.flushAuthStorage();
  assert.equal(vault.auth_access_token, 'new-account', 'Queued native sign-out must finish before a later login is persisted');
  assert.equal(storage.authStorage.getItem('auth_access_token'), 'new-account');
  console.log('Android encrypted session regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });

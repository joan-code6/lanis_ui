// Isolated evidence for the current logout/cache finding. No network or real data.
// This asserts the vulnerable baseline, not a security guarantee/regression pass.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const values = new Map([
  ['auth_access_token', 'synthetic-token-a'],
  ['auth_refresh_token', 'synthetic-refresh-a'],
  ['auth_user', JSON.stringify({ username: 'account-a', school_id: '0000' })],
  ['profile_cache', JSON.stringify({ firstname: 'SYNTHETIC_ACCOUNT_A' })],
  ['messages_cache', JSON.stringify([{ Betreff: 'SYNTHETIC_ACCOUNT_A' }])],
  ['courses_cache', JSON.stringify([{ name: 'SYNTHETIC_ACCOUNT_A' }])],
]);
const localStorage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
let hookIndex = 0;
const react = {
  createContext: () => ({ Provider: 'provider' }),
  useContext: () => undefined,
  useState(initial) {
    const index = hookIndex++;
    const value = index === 1 ? 'synthetic-token-a'
      : index === 3 ? false
        : typeof initial === 'function' ? initial() : initial;
    return [value, () => {}];
  },
  useEffect() {},
  useCallback: fn => fn,
  createElement: (type, props, ...children) => ({ type, props, children }),
};
const services = {
  authAPI: {
    async logout() { return { status: 'ok' }; },
    async login() { return { username: 'account-b', school_id: '0000', encryption_ready: true, access_token: 'synthetic-token-b', refresh_token: 'synthetic-refresh-b', expires_in: 3600 }; },
    async getUserProfile() { return { success: false }; },
  },
  notificationsAPI: {},
  async unsubscribeBrowserPushSubscription() {},
};
const loaded = new Map();
function load(relativeFile) {
  const filename = path.resolve(__dirname, '..', relativeFile);
  if (loaded.has(filename)) return loaded.get(filename);
  const exports = {};
  loaded.set(filename, exports);
  const source = fs.readFileSync(filename, 'utf8')
    .replaceAll('import.meta.env.SSR', 'false')
    .replaceAll('import.meta.env.VITE_API_URL', '"https://synthetic.invalid"');
  const output = ts.transpileModule(source, { fileName: filename, compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(output, {
    exports,
    require(name) {
      if (name === 'react') return { __esModule: true, default: react, ...react };
      if (name === '../services/api') return services;
      const target = path.resolve(path.dirname(filename), name);
      for (const ext of ['.ts', '.tsx']) {
        if (fs.existsSync(target + ext)) return load(path.relative(path.resolve(__dirname, '..'), target + ext));
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
    localStorage,
    window: { localStorage, addEventListener() {}, setInterval() { return 1; }, clearInterval() {} },
    navigator: { locks: { async request(_name, callback) { return callback(); } } },
    document: { cookie: '' },
    URL, console,
  }, { filename });
  return exports;
}

(async () => {
  const { AuthProvider } = load('src/contexts/AuthContext.tsx');
  const provider = AuthProvider({ children: null });
  const auth = provider.props.value;
  await auth.logout();
  assert.equal(localStorage.getItem('auth_access_token'), null);
  for (const key of ['profile_cache', 'messages_cache', 'courses_cache']) {
    assert(localStorage.getItem(key)?.includes('SYNTHETIC_ACCOUNT_A'), `${key}: baseline changed; reassess finding`);
  }
  assert(await auth.login({ school_id: '0000', username: 'account-b', password: 'synthetic-only' }));
  assert.equal(JSON.parse(localStorage.getItem('auth_user')).username, 'account-b');
  assert.equal(JSON.parse(localStorage.getItem('profile_cache')).firstname, 'SYNTHETIC_ACCOUNT_A');
  for (const [file, key] of [
    ['src/components/profile/Profile.tsx', 'profile_cache'],
    ['src/components/messages/Messages.tsx', 'messages_cache'],
  ]) {
    assert(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8').includes(`localStorage.getItem('${key}')`));
  }
  console.log('VULNERABLE BASELINE REPRODUCED: actual logout and login retain account A caches after account B signs in. Component cache reads verified statically; this is not a browser rendering test.');
})().catch(error => { console.error(error); process.exitCode = 1; });

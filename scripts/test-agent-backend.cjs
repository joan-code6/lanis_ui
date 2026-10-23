const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadRouting() {
  const values = new Map();
  const storage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const context = { window: { localStorage: storage }, document: { cookie: '' }, URL, URLSearchParams, console };
  const evaluate = (file, requireFn) => {
    let source = readFileSync(path.join(__dirname, '..', 'src/utils', file), 'utf8');
    source = source.replace('import.meta.env.VITE_API_URL', "'https://default-api.example'");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(output, { ...context, exports, require: requireFn }, { filename: file });
    return exports;
  };
  const backend = evaluate('backendConfig.ts', () => { throw Error('Unexpected dependency'); });
  const agents = evaluate('agentBackend.ts', name => { assert.equal(name, './backendConfig'); return backend; });
  return { backend, agents, storage };
}

test('selected custom backend wins over the bundled default and clears old credentials on switch', () => {
  const { backend, storage } = loadRouting();
  assert.equal(backend.getApiBaseUrl(), 'https://default-api.example');
  storage.setItem('auth_access_token', 'old-backend-token');
  storage.setItem('auth_refresh_token', 'old-backend-refresh');
  backend.clearBackendScopedStorage();
  backend.setCustomBackendUrl('https://SCHOOL.example/api/');
  assert.equal(backend.getApiBaseUrl(), 'https://school.example/api');
  assert.equal(storage.getItem('auth_access_token'), null);
  assert.equal(storage.getItem('auth_refresh_token'), null);
});

test('issuer mismatch only builds a review link; it never changes the backend or transfers tokens', () => {
  const { backend, agents, storage } = loadRouting();
  storage.setItem('auth_access_token', 'default-only');
  const url = new URL(agents.agentBackendSwitchPath('opaque-request', 'https://SCHOOL.example/api/'), 'https://ui.example');
  assert.equal(url.pathname, '/set-custom-backend');
  assert.equal(url.searchParams.get('backend'), 'https://school.example/api');
  assert.equal(backend.getApiBaseUrl(), 'https://default-api.example');
  assert.equal(storage.getItem('auth_access_token'), 'default-only');
  const returnTo = agents.agentReturnPath(url.searchParams.get('returnTo'));
  const result = new URL(returnTo, 'https://ui.example');
  assert.equal(result.pathname, '/agents/authorize');
  assert.equal(result.searchParams.get('request'), 'opaque-request');
  assert.equal(result.searchParams.get('issuer'), 'https://school.example/api');
});

test('approval return paths reject open redirects and unsafe backend URLs', () => {
  const { agents } = loadRouting();
  for (const value of [null, '//evil.example', 'https://evil.example', '/login', '/agents/authorize?request=a&issuer=javascript:evil', '/agents/authorize?request=a&issuer=https://user:secret@evil.example', '/agents/authorize?request=a&issuer=http://remote.example', '/agents/authorize?request=a&issuer=https://school.example#fragment']) {
    assert.equal(agents.agentReturnPath(value), null, String(value));
  }
  assert.equal(agents.agentReturnPath('/agents/authorize?request=a&issuer=https://school.example&injected=discarded'), '/agents/authorize?request=a&issuer=https%3A%2F%2Fschool.example');
});


test('settings links remain issuer-bound through backend selection and login', () => {
  const { agents } = loadRouting();
  const path = agents.agentReturnPath('/settings/agents?issuer=https://SCHOOL.example/');
  assert.equal(path, '/settings/agents?issuer=https%3A%2F%2Fschool.example');
  const switchUrl = new URL(agents.agentSettingsSwitchPath('https://school.example'), 'https://ui.example');
  assert.equal(switchUrl.searchParams.get('returnTo'), path);
  assert.equal(agents.agentReturnPath('/settings/account?issuer=https://school.example'), null);
});

test('backend proposal ignores an independently injected backend and requires a valid agent destination', () => {
  const { agents } = loadRouting();
  const params = new URLSearchParams({ backend: 'https://attacker.example', returnTo: '/agents/authorize?request=opaque&issuer=https://SCHOOL.example/' });
  assert.equal(agents.agentBackendProposal(params), 'https://school.example');
  params.set('returnTo', '/settings/agents?issuer=https://school.example');
  assert.equal(agents.agentBackendProposal(params), 'https://school.example');
  params.set('returnTo', 'https://attacker.example');
  assert.equal(agents.agentBackendProposal(params), null);
  params.delete('returnTo');
  assert.equal(agents.agentBackendProposal(params), null);
});


test('callback hosts normalize default ports and still reject mismatches', () => {
  const { agents } = loadRouting();
  for (const [url, host] of [
    ['https://claude.ai:443/callback?code=x', 'claude.ai:443'],
    ['http://localhost:80/callback', 'localhost:80'],
    ['http://localhost:8123/callback', 'localhost:8123'],
  ]) assert.equal(agents.agentCallbackUrl(url, host), new URL(url).href);
  for (const [url, host] of [
    ['https://evil.example/callback', 'claude.ai:443'],
    ['https://claude.ai:444/callback', 'claude.ai:443'],
    ['javascript:alert(1)', 'claude.ai'],
  ]) assert.throws(() => agents.agentCallbackUrl(url, host));
});


test('authentication loss preserves validated agent destinations through login', () => {
  const { agents } = loadRouting();
  for (const path of [
    '/settings/agents?issuer=https://school.example',
    '/agents/authorize?request=opaque&issuer=https://school.example',
  ]) {
    const login = new URL(agents.agentLoginPath(path), 'https://ui.example');
    assert.equal(login.pathname, '/login');
    assert.equal(login.searchParams.get('returnTo'), agents.agentReturnPath(path));
  }
  for (const path of ['/messages', '/settings/agents?issuer=javascript:bad', 'https://evil.example']) {
    assert.equal(agents.agentLoginPath(path), '/login');
  }
});


test('issuer-less approvals remain bound to the selected backend after session expiry', () => {
  const { agents, backend } = loadRouting();
  backend.setCustomBackendUrl('https://custom.example/api');
  const login = new URL(agents.agentLoginPath('/agents/authorize?request=opaque'), 'https://ui.example');
  const approval = new URL(login.searchParams.get('returnTo'), 'https://ui.example');
  assert.equal(approval.pathname, '/agents/authorize');
  assert.equal(approval.searchParams.get('request'), 'opaque');
  assert.equal(approval.searchParams.get('issuer'), 'https://custom.example/api');
  assert.equal(agents.agentLoginPath('/agents/authorize?request=opaque&issuer='), '/login');
  assert.equal(agents.agentLoginPath('//evil.example/agents/authorize?request=opaque'), '/login');
});


test('direct Agents settings visits return after login without an issuer', () => {
  const { agents, backend } = loadRouting();
  backend.setCustomBackendUrl('https://custom.example');
  const login = new URL(agents.agentLoginPath('/settings/agents'), 'https://ui.example');
  assert.equal(login.pathname, '/login');
  assert.equal(login.searchParams.get('returnTo'), '/settings/agents?issuer=https%3A%2F%2Fcustom.example');
});

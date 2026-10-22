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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function browser(overrides = {}) {
  const key = Uint8Array.from({ length: 65 }, (_, i) => i === 0 ? 4 : i);
  const calls = { registered: [], subscribed: 0, unsubscribed: 0, permissionRequested: 0 };
  const controller = new AbortController();
  const repairState = { renewalPending: false };
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/browser',
    options: { applicationServerKey: key.buffer },
    async unsubscribe() { calls.unsubscribed++; state.subscription = null; return true; },
    toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'public', auth: 'auth' } }; },
  };
  const state = {
    subscription, enabled: true, configured: true, permission: 'granted', current: true,
    publicKey: Buffer.from(key).toString('base64url'), ...overrides,
  };
  const api = {
    async getConfig() { return { success: true, configured: state.configured, public_key: state.publicKey }; },
    async getPreferences() { return { success: true, preferences: { enabled: state.enabled } }; },
    async registerSubscription(token, payload, signal) {
      assert.equal(signal, controller.signal);
      calls.registered.push({ token, payload });
      return { success: state.registrationAccepted !== false };
    },
  };
  const context = {
    exports: {}, Uint8Array, atob,
    require(name) { assert.equal(name, '../services/api'); return { notificationsAPI: api }; },
    window: { Notification: {}, PushManager: {} },
    Notification: { get permission() { return state.permission; }, requestPermission() { calls.permissionRequested++; } },
    navigator: { serviceWorker: { async getRegistration() { return { pushManager: {
      async getSubscription() { return state.subscription; },
      async subscribe(options) {
        calls.subscribed++;
        if (state.subscribeFails) throw new Error('push service offline');
        state.subscription = { ...subscription, options: { applicationServerKey: options.applicationServerKey.buffer } };
        return state.subscription;
      },
    } }; } } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/browserPush.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { calls, state, api, controller, repair: () => context.exports.repairBrowserPushRegistration('session', controller.signal, () => state.current, repairState) };
}

test('an existing browser subscription is restored to the backend after its record is lost', async () => {
  const b = browser();
  assert.equal(await b.repair(), 'registered');
  assert.equal(b.calls.registered.length, 1);
  assert.equal(b.calls.registered[0].payload.endpoint, 'https://fcm.googleapis.com/browser');
  assert.equal(b.calls.subscribed, 0);
  assert.equal(b.calls.permissionRequested, 0);
});

test('server signing key rotation renews an already opted-in browser', async () => {
  const key = Buffer.alloc(65, 7); key[0] = 4;
  const b = browser({ publicKey: key.toString('base64url') });
  assert.equal(await b.repair(), 'registered');
  assert.equal(b.calls.unsubscribed, 1);
  assert.equal(b.calls.subscribed, 1);
  assert.equal(b.calls.registered.length, 1);
});

test('a normal server rejection is unsuccessful and preserves the subscription for retry', async () => {
  const b = browser({ registrationAccepted: false });
  assert.equal(await b.repair(), 'retry');
  assert.equal(b.calls.unsubscribed, 0);
  b.state.registrationAccepted = true;
  assert.equal(await b.repair(), 'registered');
  assert.equal(b.calls.registered.length, 2);
});

test('disabled accounts, unsupported permission, and new devices are never opted in automatically', async () => {
  for (const override of [{ enabled: false }, { permission: 'default' }, { permission: 'denied' }, { configured: false }, { subscription: null }]) {
    const b = browser(override);
    assert.equal(await b.repair(), 'inactive');
    assert.equal(b.calls.registered.length, 0);
    assert.equal(b.calls.subscribed, 0);
    assert.equal(b.calls.permissionRequested, 0);
  }
});

test('an interrupted key renewal retries without treating this as a new opt-in', async () => {
  const key = Buffer.alloc(65, 9); key[0] = 4;
  const b = browser({ publicKey: key.toString('base64url'), subscribeFails: true });
  await assert.rejects(b.repair(), /push service offline/);
  assert.equal(b.state.subscription, null);
  b.state.subscribeFails = false;
  assert.equal(await b.repair(), 'registered');
  assert.equal(b.calls.subscribed, 2);
  assert.equal(b.calls.registered.length, 1);
});

test('invalid server keys preserve the existing subscription', async () => {
  const b = browser({ publicKey: 'broken' });
  await assert.rejects(b.repair(), /Push-Schlüssel/);
  assert.equal(b.calls.unsubscribed, 0);
});

test('network failure retains the browser subscription for the next repair', async () => {
  const b = browser();
  b.api.getConfig = async () => { throw new Error('offline'); };
  await assert.rejects(b.repair(), /offline/);
  assert.equal(b.calls.unsubscribed, 0);
  b.api.getConfig = async () => ({ success: true, configured: true, public_key: b.state.publicKey });
  assert.equal(await b.repair(), 'registered');
});

test('logout, deletion, or backend switching during a request cancels registration', async () => {
  for (const invalidate of [b => { b.state.current = false; }, b => b.controller.abort()]) {
    const b = browser();
    b.api.getPreferences = async () => {
      invalidate(b);
      return { success: true, preferences: { enabled: true } };
    };
    assert.equal(await b.repair(), 'cancelled');
    assert.equal(b.calls.registered.length, 0);
    assert.equal(b.calls.unsubscribed, 0);
  }
});

function runtime(options = {}) {
  let now = 1_000_000;
  let cleanup;
  let timer;
  const calls = [];
  const events = new Map();
  const addEventListener = (event, handler) => events.set(event, handler);
  const removeEventListener = event => events.delete(event);
  const context = {
    exports: {}, AbortController,
    Date: { now: () => now },
    console: { warn() {} },
    localStorage: { getItem: () => 'refresh-session' },
    window: {
      Notification: {}, PushManager: {},
      Capacitor: { isNativePlatform: () => !!options.native },
      setInterval(handler) { timer = handler; return 1; },
      clearInterval() { timer = undefined; }, addEventListener, removeEventListener,
    },
    document: { visibilityState: 'visible', addEventListener, removeEventListener },
    navigator: { onLine: true, serviceWorker: { addEventListener, removeEventListener } },
    require(name) {
      if (name === 'react') return { useEffect(effect) { cleanup = effect(); } };
      if (name === 'react-router-dom') return { useLocation: () => ({ pathname: options.path || '/dashboard' }) };
      if (name === '../contexts/AuthContext') return { useAuth: () => ({ token: 'session', isAuthenticated: options.authenticated !== false, user: { school_id: '5201', username: 'user' } }) };
      if (name === '../utils/accountDataWrites') return { captureAccountDataGeneration: () => 1, canWriteAccountData: () => true };
      assert.equal(name, '../utils/browserPush');
      return { async repairBrowserPushRegistration(...args) {
        calls.push(args);
        if (options.fail) throw new Error('backend restarting');
        return options.result || (options.accepted === false ? 'retry' : 'registered');
      } };
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/BrowserPushRuntime.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  context.exports.default();
  return { calls, events, context, advance(ms) { now += ms; }, tick() { return timer?.(); }, cleanup: () => cleanup?.() };
}

test('normal dashboard visits repair registration, then periodically recheck and clean up listeners', async () => {
  const r = runtime();
  await new Promise(setImmediate);
  assert.equal(r.calls.length, 1);
  r.advance(60_000);
  await r.tick();
  assert.equal(r.calls.length, 1, 'Successful repairs are not repeated every minute');
  r.advance(14 * 60_000);
  await r.tick();
  assert.equal(r.calls.length, 2);
  const signal = r.calls[0][1];
  r.cleanup();
  assert.equal(signal.aborted, true);
  assert.equal(r.events.size, 0);
});

test('a server restart retries after one minute and offline/hidden tabs wait', async () => {
  const r = runtime({ fail: true });
  await new Promise(setImmediate);
  r.advance(60_000);
  r.context.navigator.onLine = false;
  await r.tick();
  assert.equal(r.calls.length, 1);
  r.context.navigator.onLine = true;
  r.context.document.visibilityState = 'hidden';
  await r.tick();
  assert.equal(r.calls.length, 1);
  r.context.document.visibilityState = 'visible';
  await r.events.get('online')();
  assert.equal(r.calls.length, 2);
  r.cleanup();
});

test('a resolved registration rejection uses the one-minute retry instead of the success cadence', async () => {
  const r = runtime({ accepted: false });
  await new Promise(setImmediate);
  assert.equal(r.calls.length, 1);
  r.advance(59_000);
  await r.tick();
  assert.equal(r.calls.length, 1);
  r.advance(1_000);
  await r.tick();
  assert.equal(r.calls.length, 2);
  r.cleanup();
});

test('successful inactive checks wait 15 minutes rather than polling APIs every minute', async () => {
  const r = runtime({ result: 'inactive' });
  await new Promise(setImmediate);
  r.advance(60_000);
  await r.tick();
  await r.events.get('focus')();
  await r.events.get('online')();
  assert.equal(r.calls.length, 1);
  r.advance(14 * 60_000 - 1);
  await r.tick();
  assert.equal(r.calls.length, 1);
  r.advance(1);
  await r.tick();
  assert.equal(r.calls.length, 2);
  r.cleanup();
});

test('unsuccessful config/preferences responses request a retry rather than an inactive cadence', async () => {
  for (const endpoint of ['getConfig', 'getPreferences']) {
    const b = browser();
    b.api[endpoint] = async () => ({ success: false });
    assert.equal(await b.repair(), 'retry');
    assert.equal(b.calls.registered.length, 0);
    assert.equal(b.calls.unsubscribed, 0);
  }
});

test('native apps, demo routes, signed-out users and notification settings do not run background repair', () => {
  for (const option of [{ native: true }, { path: '/demo/dashboard' }, { authenticated: false }, { path: '/settings/notifications' }]) {
    const r = runtime(option);
    assert.equal(r.calls.length, 0);
    assert.equal(r.events.size, 0);
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function runtime(signedIn = true) {
  const hooks = [], listeners = new Map(), calls = [], widgetPreferences = [], appearances = [];
  let preferencesLoading = false;
  let preferences = { appearance: { theme_mode: 'dark', theme_color: '#123456', secondary_theme_color: '#047857' }, timetable: { show_substitutions: true, class_colors: {} } };
  let cursor = 0, launchReads = 0, removed = 0;
  let route = '/dashboard', authenticated = signedIn;
  let popupOpen = false;
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ||= { current: value }; },
    useState(value) { cursor++; return [value, () => {}]; },
    useEffect(effect, deps) {
      const i = cursor++, previous = hooks[i];
      if (previous && deps.every((value, j) => Object.is(value, previous.deps[j]))) return;
      previous?.cleanup?.();
      hooks[i] = { deps, cleanup: effect() };
    },
  };
  const context = {
    exports: {}, URL, Event,
    window: { history: { state: {} }, location: { origin: 'https://localhost' }, dispatchEvent: () => true },
    document: { addEventListener() {}, removeEventListener() {} },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-router-dom') return {
        useLocation: () => ({ pathname: route }),
        // BrowserRouter's navigate identity changes when its location changes.
        useNavigate: () => { const from = route; return target => calls.push({ from, target }); },
      };
      if (name === '@capacitor/app') return { App: {
        async addListener(name, callback) {
          listeners.set(name, callback);
          return { remove: async () => { removed++; listeners.delete(name); } };
        },
        async getLaunchUrl() { launchReads++; return { url: 'https://localhost/timetable' }; },
      } };
      if (name === '@capacitor/browser') return { Browser: {} };
      if (name.endsWith('/AuthContext')) return { useAuth: () => ({ isAuthenticated: authenticated, token: authenticated ? 'test' : null }) };
      if (name.endsWith('/PreferencesContext')) return { usePreferences: () => ({ preferences, isLoading: preferencesLoading }) };
      if (name.endsWith('/ThemeContext')) return { useTheme: () => ({ isDark: false, themeColor: '#f43f5e', themeMode: 'light' }) };
      if (name.endsWith('/native')) return { isAndroid: true, LanisNative: { async sync() {}, async setAppearance(value) { appearances.push(value); }, async setWidgetPreferences(value) { widgetPreferences.push(value); } } };
      if (name.endsWith('/authStorage')) return { async flushAuthStorage() {}, authStorage: { getItem: () => 'test-owner' } };
      if (name.endsWith('/links')) return { nativeRoute: value => new URL(value).pathname };
      if (name.endsWith('/themeAssets')) return { getThemeAssetName: () => "ruby" };
      if (name.endsWith('/inputPopups')) return { dismissInputPopup: () => popupOpen };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/android/AndroidRuntime.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  function render(nextRoute = route, nextAuthenticated = authenticated) {
    route = nextRoute; authenticated = nextAuthenticated; cursor = 0;
    context.exports.default();
  }
  return { render, calls, listeners, widgetPreferences, appearances, setPopupOpen(value) { popupOpen = value; }, setLoading(value) { preferencesLoading = value; }, setPreferences(value) { preferences = { ...value, appearance: value.appearance || preferences.appearance }; }, get launchReads() { return launchReads; }, get removed() { return removed; } };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('Android back dismisses an input popup before navigating or closing its parent', async () => {
  const r = runtime();
  r.render(); await settle();
  r.calls.length = 0;
  r.setPopupOpen(true);
  r.listeners.get('backButton')();
  assert.deepEqual(r.calls, []);
});

test('widget launch is consumed once and subsequent navigation stays on the selected page', async () => {
  const r = runtime();
  r.render(); await settle();
  assert.deepEqual(r.calls.map(call => call.target), ['/timetable']);
  r.render('/timetable'); await settle();
  r.render('/messages'); await settle();
  r.render('/dashboard'); await settle();
  assert.equal(r.launchReads, 1);
  assert.equal(r.removed, 0, 'route changes must not replace native listeners');
  assert.equal(r.calls.length, 1, 'the launch URL must not pull navigation back');
  r.listeners.get('appUrlOpen')({ url: 'https://localhost/courses/123' });
  assert.deepEqual(r.calls.at(-1), { from: '/dashboard', target: '/courses/123' });
});

test('a signed-out launch waits for login and is not replayed after leaving the destination', async () => {
  const r = runtime(false);
  r.render('/login'); await settle();
  assert.equal(r.calls.length, 0);
  r.render('/dashboard', true); await settle();
  assert.deepEqual(r.calls.map(call => call.target), ['/timetable']);
  r.render('/timetable'); await settle();
  r.render('/messages'); await settle();
  assert.equal(r.launchReads, 1);
  assert.equal(r.calls.length, 1);
});


test('widget preferences follow changes and remain account-owned outside demo mode', async () => {
  const r = runtime();
  r.render(); await settle();
  assert.equal(r.widgetPreferences.length, 1);
  assert.equal(r.widgetPreferences[0].owner, 'test-owner');
  assert.equal(r.widgetPreferences[0].showSubstitutions, true);
  r.setPreferences({ timetable: { show_substitutions: false, class_colors: { 'subject:mathe': '#123456' } } });
  r.render(); await settle();
  assert.equal(r.widgetPreferences.at(-1).showSubstitutions, false);
  assert.equal(r.widgetPreferences.at(-1).classColors['subject:mathe'], '#123456');
  const count = r.widgetPreferences.length;
  r.setPreferences({ timetable: { show_substitutions: true, class_colors: {} } });
  r.render('/demo/timetable'); await settle();
  assert.equal(r.widgetPreferences.length, count, 'demo previews must not change home-screen widgets');
  r.render('/login', false); await settle();
  assert.equal(r.widgetPreferences.length, count, 'signed-out defaults must not replace account preferences');
});


test('stored account colours override a stale Ruby WebView theme, including appearance-only changes', async () => {
  const r = runtime();
  r.setLoading(true); r.render(); await settle();
  assert.equal(r.widgetPreferences.length, 0);
  assert.equal(r.appearances.length, 0, 'startup defaults must not overwrite saved appearance');
  r.setLoading(false); r.render(); await settle();
  assert.equal(r.widgetPreferences.at(-1).appearance.theme_color, '#123456');
  assert.equal(r.widgetPreferences.at(-1).appearance.theme_mode, 'dark');
  assert.equal(r.appearances.at(-1).accent, '#123456');
  assert.equal(r.appearances.at(-1).dark, true);
  r.setPreferences({ appearance: { theme_color: '#19a987', theme_mode: 'oled', secondary_theme_color: '#047857' }, timetable: { show_substitutions: true, class_colors: {} } });
  r.render(); await settle();
  assert.equal(r.widgetPreferences.at(-1).appearance.theme_color, '#19a987');
  assert.equal(r.appearances.at(-1).accent, '#19a987');
  assert.equal(r.appearances.at(-1).oled, true);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/contexts/PreferencesContext.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

function harness(cached) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let value;
  const storage = new Map();
  const auth = { token: 'token', user: { username: 'pupil', school_id: 'school' } };
  const get = deferred();
  const calls = [];
  const theme = { setThemeColor() {}, setThemeMode() {} };
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_type, props) => { value = props.value; return null; },
    useState(initial) { const id = cursor++; if (!(id in slots)) slots[id] = initial; return [slots[id], next => { slots[id] = typeof next === 'function' ? next(slots[id]) : next; }]; },
    useRef(initial) { const id = cursor++; return slots[id] ||= { current: initial }; },
    useCallback(fn, deps) { const id = cursor++; if (!slots[id] || deps.some((v, i) => v !== slots[id].deps[i])) slots[id] = { fn, deps }; return slots[id].fn; },
    useEffect(fn, deps) {
      const id = cursor++;
      if (!slots[id] || deps.some((v, i) => v !== slots[id].deps[i])) {
        slots[id]?.cleanup?.();
        slots[id] = { deps };
        effects.push(() => { slots[id].cleanup = fn(); });
      }
    },
  };
  const output = {};
  const api = {
    getPreferences: () => { calls.push('GET'); return get.promise; },
    updatePreferences: async (_token, patch) => {
      calls.push('PATCH');
      return { stored: true, preferences: { ...output.DEFAULT_USER_PREFERENCES, ...patch } };
    },
  };
  vm.runInNewContext(compiled, {
    exports: output, AbortController, console,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    require(path) {
      if (path === 'react') return { ...react, default: react };
      if (path.includes('AuthContext')) return { useAuth: () => auth };
      if (path.includes('ThemeContext')) return { useTheme: () => theme };
      if (path.includes('services/api')) return { settingsAPI: api };
      if (path.includes('sidebarNavigation')) return { DEFAULT_SIDEBAR_ORDER: [], normalizeSidebarOrder: order => order || [] };
      if (path.includes('accountDataWrites')) return { canWriteAccountData: () => true, captureAccountDataGeneration: () => 1 };
      if (path.includes('homeworkPreferences')) return { normalizeHideCompletedHomework: () => false };
      if (path.includes('themeAssets')) return { applyThemeColorPalette() {}, normalizeThemeColor: color => color, SECONDARY_THEME_COLOR_KEY: 'secondary' };
      if (path.includes('analytics/client')) return { capture() {} };
      throw Error(path);
    },
  });
  const defaults = output.DEFAULT_USER_PREFERENCES;
  if (cached) storage.set('lanis_preferences:school:pupil', JSON.stringify({ preferences: { ...defaults, onboarding: { version: 1, status: 'completed' } }, dirty: cached === 'dirty' }));
  const render = () => { cursor = 0; output.PreferencesProvider({ children: null }); const run = effects; effects = []; run.forEach(fn => fn()); return value; };
  return { render, get, calls, defaults, auth };
}

(async () => {
  let h = harness('clean');
  h.render();
  assert.equal(h.render().isLoading, false, 'saved preferences open the app before the server responds');
  await tick();
  assert.equal(h.calls[0], 'GET', 'saved preferences still revalidate');
  const save = h.render().updatePreferences({ timetable: { ...h.defaults.timetable, view_mode: 'week' } });
  h.get.resolve({ stored: true, preferences: h.defaults });
  await save;
  assert.equal(h.render().preferences.timetable.view_mode, 'week', 'delayed startup GET cannot undo a newer edit');
  assert.deepEqual(h.calls, ['GET', 'PATCH']);
  h.auth.user = { school_id: 'school', username: 'another-pupil' };
  assert.equal(h.render().isLoading, true, 'an account switch cannot expose the previous preferences');
  for (const mode of [null, 'dirty']) {
    h = harness(mode);
    h.render();
    assert.equal(h.render().isLoading, true, 'first login and pending migration still wait safely');
    h.get.resolve({ stored: true, preferences: h.defaults });
    await tick();
    assert.equal(h.render().isLoading, false);
    assert.deepEqual(h.calls, mode === 'dirty' ? ['GET', 'PATCH'] : ['GET']);
  }
  console.log('Startup preferences checks passed: nonblocking saved state, live refresh, edit races and account/migration gates.');
})().catch(error => { console.error(error); process.exitCode = 1; });

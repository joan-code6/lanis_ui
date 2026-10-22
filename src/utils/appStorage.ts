/** Account storage is tab-scoped during an operator preview, including all caches. */
const MARKER = '__lanis_preview_tab';
const PREFIX = '__lanis_preview:';
export const isImpersonating = typeof window !== 'undefined' && (
  window.location.hash?.startsWith('#impersonate=') || window.sessionStorage?.getItem(MARKER) === '1'
);
if (isImpersonating) window.sessionStorage.setItem(MARKER, '1');

export function previewStorage(storage: Storage): Storage {
  const keys = () => Array.from({ length: storage.length }, (_, i) => storage.key(i)!)
    .filter(key => key.startsWith(PREFIX));
  return {
    get length() { return keys().length; },
    key: (index: number) => keys()[index]?.slice(PREFIX.length) ?? null,
    getItem: (key: string) => storage.getItem(PREFIX + key),
    setItem: (key: string, value: string) => storage.setItem(PREFIX + key, value),
    removeItem: (key: string) => storage.removeItem(PREFIX + key),
    clear: () => keys().forEach(key => storage.removeItem(key)),
  };
}

// Resolve lazily so SSR and build-time rendering never access browser storage.
export const appStorage = new Proxy({} as Storage, {
  get(_target, property) {
    const storage = isImpersonating ? previewStorage(window.sessionStorage) : window.localStorage;
    const value = Reflect.get(storage, property, storage);
    return typeof value === 'function' ? value.bind(storage) : value;
  },
});

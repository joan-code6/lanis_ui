export const DEMO_STORAGE_SNAPSHOT_KEY = '__demo_storage_snapshot';
export const DEMO_TAB_ID_KEY = '__demo_tab_id';
const DEMO_ACTIVE_SESSION_KEY = '__demo_active_session';
const DEMO_HEARTBEAT_INTERVAL = 5000;
const DEMO_HEARTBEAT_TTL = 15000;

export const isDemoRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/');
};

export const getDemoTabId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const existing = window.sessionStorage.getItem(DEMO_TAB_ID_KEY);
  if (existing) return existing;

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(DEMO_TAB_ID_KEY, generated);
  return generated;
};

const readSnapshotStore = (): Record<string, Record<string, string | null>> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_SNAPSHOT_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, Record<string, string | null>>;
  } catch {
    return {};
  }
};

export const readDemoStorageSnapshot = (tabId: string | null): Record<string, string | null> | null => {
  if (!tabId) return null;
  const snapshot = readSnapshotStore()[tabId];
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : null;
};

export const writeDemoStorageSnapshot = (tabId: string, values: Record<string, string | null> | null): void => {
  if (typeof window === 'undefined') return;
  const snapshots = readSnapshotStore();
  if (values) snapshots[tabId] = values;
  else delete snapshots[tabId];

  if (Object.keys(snapshots).length === 0) window.localStorage.removeItem(DEMO_STORAGE_SNAPSHOT_KEY);
  else window.localStorage.setItem(DEMO_STORAGE_SNAPSHOT_KEY, JSON.stringify(snapshots));
};

const readActiveDemoSession = (): { tabId: string; lastSeen: number } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_ACTIVE_SESSION_KEY) || 'null');
    if (typeof parsed?.tabId !== 'string' || typeof parsed?.lastSeen !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const keepDemoSessionAlive = (tabId: string): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const touch = () => window.localStorage.setItem(DEMO_ACTIVE_SESSION_KEY, JSON.stringify({ tabId, lastSeen: Date.now() }));
  const release = () => {
    const active = readActiveDemoSession();
    if (active?.tabId === tabId) window.localStorage.removeItem(DEMO_ACTIVE_SESSION_KEY);
  };
  touch();
  const interval = window.setInterval(touch, DEMO_HEARTBEAT_INTERVAL);
  window.addEventListener('pagehide', release);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('pagehide', release);
    release();
  };
};

export const restoreInterruptedDemoSession = (): void => {
  if (typeof window === 'undefined' || isDemoRoute()) return;
  const active = readActiveDemoSession();
  if (active && Date.now() - active.lastSeen < DEMO_HEARTBEAT_TTL) return;

  const currentTabId = window.sessionStorage.getItem(DEMO_TAB_ID_KEY);
  const snapshots = readSnapshotStore();
  const tabId = currentTabId && snapshots[currentTabId]
    ? currentTabId
    : Object.keys(snapshots)[0] || null;
  const snapshot = readDemoStorageSnapshot(tabId);
  if (!tabId || !snapshot) return;

  try {
    Object.entries(snapshot).forEach(([key, value]) => {
      if (typeof value === 'string') window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
    });
  } catch {
    // A malformed snapshot should never prevent the normal app from loading.
  } finally {
    writeDemoStorageSnapshot(tabId, null);
    if (active?.tabId === tabId) window.localStorage.removeItem(DEMO_ACTIVE_SESSION_KEY);
  }
};

restoreInterruptedDemoSession();

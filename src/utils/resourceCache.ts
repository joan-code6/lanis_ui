export interface ResourceSnapshot<T> {
  data: T | undefined;
  updatedAt: number;
  refreshing: boolean;
  error: string;
  restored?: boolean;
}

export interface ResourcePersistence {
  read(key: string): ResourceSnapshot<unknown> | undefined;
  write(key: string, snapshot: ResourceSnapshot<unknown>): void;
  clear(): void;
}
let persistence: ResourcePersistence | undefined;
export function setResourcePersistence(adapter: ResourcePersistence): void { persistence = adapter; }

interface ResourceEntry {
  snapshot: ResourceSnapshot<unknown>;
  listeners: Set<() => void>;
  pending?: Promise<void>;
  controller?: AbortController;
}

const emptySnapshot: ResourceSnapshot<never> = {
  data: undefined, updatedAt: 0, refreshing: false, error: '',
};
// Memory stays authoritative; optional saved snapshots only seed empty entries.
let generation = 0;
export const resourceCacheGeneration = () => generation;

const entries = new Map<string, ResourceEntry>();

function entryFor(key: string): ResourceEntry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { snapshot: persistence?.read(key) || emptySnapshot, listeners: new Set() };
    entries.set(key, entry);
  }
  return entry;
}

export function readResource<T>(key: string | null): ResourceSnapshot<T> {
  return (key ? entryFor(key).snapshot : emptySnapshot) as ResourceSnapshot<T>;
}

export function subscribeResource(key: string | null, listener: () => void): () => void {
  if (!key) return () => {};
  const entry = entryFor(key);
  entry.listeners.add(listener);
  notifyCacheStatus();
  return () => { entry.listeners.delete(listener); notifyCacheStatus(); };
}

const statusListeners = new Set<() => void>();
function notifyCacheStatus() { statusListeners.forEach(listener => listener()); }
export function subscribeSavedData(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}
/** Only describe restored data used by a currently mounted view. */
export function savedDataTimestamp(): number {
  let oldest = 0;
  for (const { snapshot, listeners } of entries.values()) {
    if (listeners.size && snapshot.restored && (!oldest || snapshot.updatedAt < oldest)) oldest = snapshot.updatedAt;
  }
  return oldest;
}

function publish(entry: ResourceEntry, snapshot: ResourceSnapshot<unknown>) {
  entry.snapshot = snapshot;
  entry.listeners.forEach(listener => listener());
  notifyCacheStatus();
}

export function refreshResource<T>(
  key: string,
  load: (signal: AbortSignal, refresh: boolean) => Promise<T>,
  force = false,
): Promise<void> {
  const entry = entryFor(key);
  if (entry.pending) return entry.pending;
  const controller = new AbortController();
  entry.controller = controller;
  const refresh = force || entry.snapshot.data !== undefined;
  // Assign the promise before notifying subscribers, so concurrent readers share it.
  entry.pending = Promise.resolve().then(() => load(controller.signal, refresh))
    .then(data => {
      if (!controller.signal.aborted) {
        const snapshot = { data, updatedAt: Date.now(), refreshing: false, error: '' };
        persistence?.write(key, snapshot);
        publish(entry, snapshot);
      }
    })
    .catch(error => {
      if (controller.signal.aborted) return;
      const message = error?.response?.data?.detail || error?.message || 'Die Daten konnten nicht aktualisiert werden.';
      publish(entry, { ...entry.snapshot, refreshing: false, error: String(message) });
    })
    .finally(() => {
      if (entry.controller === controller) {
        entry.pending = undefined;
        entry.controller = undefined;
      }
    });
  publish(entry, { ...entry.snapshot, refreshing: true, error: '' });
  return entry.pending;
}

/** Updates for interactive views; obsolete async callbacks cannot restore cleared data. */
export function updateResource<T>(key: string, value: T | ((previous: T | undefined) => T), expectedGeneration: number): void {
  if (expectedGeneration !== generation) return;
  const entry = entryFor(key);
  const data = typeof value === 'function'
    ? (value as (previous: T | undefined) => T)(entry.snapshot.data as T | undefined)
    : value;
  const snapshot = { ...entry.snapshot, data, updatedAt: Date.now(), restored: false };
  persistence?.write(key, snapshot);
  publish(entry, snapshot);
}

export function clearResourceCache(): void {
  generation++;
  persistence?.clear();
  for (const entry of entries.values()) {
    entry.controller?.abort();
    entry.controller = undefined;
    entry.pending = undefined;
    publish(entry, emptySnapshot);
  }
}

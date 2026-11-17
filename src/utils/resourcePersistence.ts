import { captureAccountDataGeneration, readPersonalCache, writePersonalCache } from './accountDataWrites';
import type { ResourcePersistence, ResourceSnapshot } from './resourceCache';

export const RESOURCE_STORAGE_KEY = 'resource_snapshots_v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 40;
const MAX_CHARACTERS = 750_000;
const MAX_ENTRY_CHARACTERS = 125_000;
type Saved = { data: unknown; updatedAt: number };

/** Bounded account-owned snapshots; scope keys never include access tokens. */
export function createResourcePersistence(): ResourcePersistence {
  let entries: Record<string, Saved> | undefined;
  const allowed = (key: string): boolean => {
    try {
      const scope = JSON.parse(key);
      return Array.isArray(scope) && scope.length === 6 && scope[1] === 'account'
        && Boolean(scope[2] && scope[3]) && scope[4] === captureAccountDataGeneration()
        && typeof scope[5] === 'string' && !scope[5].includes('-search:')
        // Join links are explicitly no-store and may expire or change permissions.
        && scope[5] !== 'videokonferenz';
    } catch { return false; }
  };
  const load = (): Record<string, Saved> => {
    if (entries) return entries;
    try {
      const parsed = JSON.parse(readPersonalCache(RESOURCE_STORAGE_KEY) || '{}');
      entries = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { entries = {}; }
    return entries!;
  };
  return {
    read(key) {
      if (!allowed(key)) return;
      const saved = load()[key];
      if (!saved || saved.data === undefined || !Number.isFinite(saved.updatedAt)
        || saved.updatedAt <= 0 || saved.updatedAt > Date.now() || Date.now() - saved.updatedAt > MAX_AGE) return;
      return { ...saved, refreshing: false, error: '', restored: true };
    },
    write(key: string, snapshot: ResourceSnapshot<unknown>) {
      if (!allowed(key) || snapshot.data === undefined) return;
      try {
        const saved = { data: snapshot.data, updatedAt: snapshot.updatedAt };
        if (JSON.stringify(saved).length > MAX_ENTRY_CHARACTERS) return;
        const all = load();
        // Reinsert to keep a stable order even when updates share a timestamp.
        delete all[key];
        all[key] = saved;
        for (const oldKey of Object.keys(all)) {
          if (!allowed(oldKey) || Date.now() - all[oldKey].updatedAt > MAX_AGE) delete all[oldKey];
        }
        while (Object.keys(all).length > MAX_ENTRIES || JSON.stringify(all).length > MAX_CHARACTERS) {
          delete all[Object.keys(all)[0]];
        }
        writePersonalCache(RESOURCE_STORAGE_KEY, JSON.stringify(all), captureAccountDataGeneration());
      } catch { /* Storage is optional: quota failures must never break live views. */ }
    },
    clear() {
      entries = undefined;
      try { localStorage.removeItem(RESOURCE_STORAGE_KEY); } catch { /* Optional storage. */ }
    },
  };
}

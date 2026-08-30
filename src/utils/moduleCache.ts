import type { Module } from '../types';

export type CachedModule = Module;

interface ModuleCacheOwner {
  school_id?: string;
  username?: string;
}

function cacheKey(owner: ModuleCacheOwner | null): string | null {
  const schoolId = String(owner?.school_id || '').trim();
  const username = String(owner?.username || '').trim();
  if (!schoolId || !username) return null;
  return `modules_cache:${encodeURIComponent(`${schoolId}:${username}`.toLocaleLowerCase('de-DE'))}`;
}

export function readModulesCache(owner: ModuleCacheOwner | null): CachedModule[] {
  const key = cacheKey(owner);
  if (!key) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((module): module is CachedModule => {
      if (!module || typeof module !== 'object') return false;
      const candidate = module as Record<string, unknown>;
      return typeof candidate.name === 'string'
        && typeof candidate.url === 'string'
        && typeof candidate.direct_url === 'string'
        && typeof candidate.proxy_app === 'boolean'
        && typeof candidate.color === 'string'
        && typeof candidate.logo === 'string'
        && Array.isArray(candidate.folders)
        && candidate.folders.every(folder => typeof folder === 'string')
        && typeof candidate.target === 'string';
    });
  } catch {
    return [];
  }
}

export function writeModulesCache(owner: ModuleCacheOwner | null, modules: CachedModule[]): void {
  const key = cacheKey(owner);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(modules));
  } catch {
    // Caching is optional; live module discovery remains authoritative.
  }
}

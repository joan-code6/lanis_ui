export interface CachedModule {
  name: string;
  url: string;
  direct_url?: string;
  folders?: string[];
}

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
        && (candidate.direct_url === undefined || typeof candidate.direct_url === 'string')
        && (candidate.folders === undefined || (
          Array.isArray(candidate.folders)
          && candidate.folders.every(folder => typeof folder === 'string')
        ));
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

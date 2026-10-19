import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/backendConfig';
import { readResource, refreshResource, RESOURCE_STALE_TIME, subscribeResource } from '../utils/resourceCache';

/** Render cached data synchronously; revalidate stale data without hiding it. */
export function useCachedResource<T>(
  resource: string,
  load: (signal: AbortSignal, refresh: boolean) => Promise<T>,
) {
  const { user, token } = useAuth();
  const key = token ? JSON.stringify([
    getApiBaseUrl(), token.startsWith('demo-') ? 'demo' : 'account',
    user?.school_id, user?.username, resource,
  ]) : null;
  const loadRef = useRef(load);
  loadRef.current = load;
  const subscribe = useCallback((listener: () => void) => subscribeResource(key, listener), [key]);
  const getSnapshot = useCallback(() => readResource<T>(key), [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const refresh = useCallback(() => {
    if (key) void refreshResource(key, loadRef.current, true);
  }, [key]);

  useEffect(() => {
    if (!key) return;
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    const revalidate = async () => {
      await refreshResource(key, loadRef.current);
      if (!active) return;
      const state = readResource(key);
      // Retry failed refreshes later while retaining the last successful result.
      const delay = state.error ? RESOURCE_STALE_TIME
        : Math.max(1, RESOURCE_STALE_TIME - (Date.now() - state.updatedAt));
      timer = setTimeout(revalidate, delay);
    };
    void revalidate();
    return () => {
      active = false;
      clearTimeout(timer);
      // Requests belong to the cache and may complete after navigation.
    };
  }, [key]);

  return {
    ...snapshot,
    loading: Boolean(key) && snapshot.data === undefined && !snapshot.error,
    refresh,
  };
}

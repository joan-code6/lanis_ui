import { captureAccountDataGeneration } from '../utils/accountDataWrites';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/backendConfig';
import { readResource, refreshResource, subscribeResource } from '../utils/resourceCache';

/** Render cached data synchronously; revalidate on every visit without hiding it. */
export function useCachedResource<T>(
  resource: string,
  load: (signal: AbortSignal, refresh: boolean) => Promise<T>,
  enabled = true,
) {
  const key = useResourceKey(resource, enabled);
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
    void refreshResource(key, loadRef.current);
    // Requests belong to the cache and may complete after navigation.
  }, [key]);

  return {
    ...snapshot,
    loading: Boolean(key) && snapshot.data === undefined && !snapshot.error,
    refresh,
  };
}

export function useResourceKey(resource: string, enabled = true): string | null {
  const { user, token } = useAuth();
  return token && enabled ? JSON.stringify([
    getApiBaseUrl(), token.startsWith('demo-') ? 'demo' : 'account',
    user?.school_id, user?.username, captureAccountDataGeneration(), resource,
  ]) : null;
}

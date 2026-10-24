import { startExperience } from '../analytics/experience';
import { capture, analyticsEpoch } from '../analytics/client';
import { resourceLabel } from '../analytics/experience';
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
    if (key) {
      const epoch = analyticsEpoch(); const page = window.location.pathname; const done = startExperience(resource);
      void refreshResource(key, loadRef.current, true).then(() => {
        if (epoch !== analyticsEpoch()) return;
        const state = readResource<T>(key);
        done(state.error ? 'failed' : 'ready');
        void capture('content_refreshed', { resource: resourceLabel(resource), outcome: state.error ? 'failed' : 'ready' }, page);
      });
    }
  }, [key, resource]);

  useEffect(() => {
    if (!key) return;
    const done = startExperience(resource);
    const cached = readResource<T>(key);
    if (cached.data !== undefined) done('ready', true, Math.max(0, Date.now() - cached.updatedAt));
    void refreshResource(key, loadRef.current).then(() => {
      if (!cancelled && cached.data === undefined) done(readResource<T>(key).error ? 'failed' : 'ready');
    });
    let cancelled = false;
    // Cache requests may continue after navigation; view timing must stop.
    return () => { cancelled = true; };
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

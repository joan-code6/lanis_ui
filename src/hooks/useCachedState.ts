import { useCallback, useRef, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { useResourceKey } from './useCachedResource';
import { readResource, resourceCacheGeneration, subscribeResource, updateResource } from '../utils/resourceCache';

/** Session state for interactive views whose existing loaders also perform local updates. */
export function useCachedState<T>(resource: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>, boolean] {
  const key = useResourceKey(resource);
  const fallback = useRef<{ key: string | null; value: T }>();
  if (!fallback.current || fallback.current.key !== key) {
    fallback.current = { key, value: typeof initial === 'function' ? (initial as () => T)() : initial };
  }
  const defaultValue = fallback.current.value;
  const generation = resourceCacheGeneration();
  const subscribe = useCallback((listener: () => void) => subscribeResource(key, listener), [key]);
  const snapshot = useSyncExternalStore(subscribe, useCallback(() => readResource<T>(key), [key]));
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(value => {
    if (!key) return;
    updateResource<T>(key, previous => typeof value === 'function'
      ? (value as (previous: T) => T)(previous === undefined ? defaultValue : previous)
      : value, generation);
  }, [key, generation, defaultValue]);
  return [snapshot.data === undefined ? defaultValue : snapshot.data, setValue, snapshot.data !== undefined];
}

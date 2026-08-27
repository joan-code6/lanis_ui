import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { settingsAPI } from '../services/api';
import { UserPreferences, UserPreferencesPatch } from '../types';

export const CURRENT_ONBOARDING_VERSION = 1;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  appearance: { theme_mode: 'system', theme_color: 'cyan' },
  dashboard: { pinned_modules: [], view_mode: 'grid' },
  timetable: { view_mode: 'rolling' },
  onboarding: { version: 0, status: 'not_started', last_step: 'welcome' },
};

interface CachedPreferences {
  preferences: UserPreferences;
  dirty: boolean;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  isSaving: boolean;
  syncError: string;
  updatePreferences: (patch: UserPreferencesPatch) => Promise<boolean>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const mergePreferences = (
  current: UserPreferences,
  patch: UserPreferencesPatch,
): UserPreferences => ({
  appearance: { ...current.appearance, ...patch.appearance },
  dashboard: { ...current.dashboard, ...patch.dashboard },
  timetable: { ...current.timetable, ...patch.timetable },
  onboarding: { ...current.onboarding, ...patch.onboarding },
});

const normalizePreferences = (value?: Partial<UserPreferences>): UserPreferences => mergePreferences(
  DEFAULT_USER_PREFERENCES,
  {
    appearance: value?.appearance,
    dashboard: value?.dashboard,
    timetable: value?.timetable,
    onboarding: value?.onboarding,
  },
);

const legacyPreferences = (): UserPreferences => {
  const mode = localStorage.getItem('lanis_theme_mode');
  const legacyDark = localStorage.getItem('lanis_dark_mode');
  const themeMode = mode === 'system' || mode === 'light' || mode === 'dark' || mode === 'oled'
    ? mode
    : localStorage.getItem('lanis_oled_mode') === 'true'
      ? 'oled'
      : legacyDark === 'true'
        ? 'dark'
        : legacyDark === 'false'
          ? 'light'
          : 'system';
  const color = localStorage.getItem('lanis_theme_color');
  const themeColor = color === 'emerald' || color === 'sapphire' || color === 'amethyst'
    || color === 'ruby' || color === 'amber' || color === 'cyan'
    ? color
    : 'cyan';
  const timetableMode = localStorage.getItem('lanis_timetable_view_mode');
  let pinnedModules: string[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('pinned_modules') || '[]');
    if (Array.isArray(parsed)) pinnedModules = parsed.filter(item => typeof item === 'string');
  } catch {
    pinnedModules = [];
  }
  return mergePreferences(DEFAULT_USER_PREFERENCES, {
    appearance: { theme_mode: themeMode, theme_color: themeColor },
    dashboard: { pinned_modules: pinnedModules },
    timetable: { view_mode: timetableMode === 'week' ? 'week' : 'rolling' },
  });
};

const cacheKeyForUser = (user: Record<string, string> | null) => {
  if (!user) return null;
  const school = user.school_id || user.schule || 'school';
  const username = user.username || user.login || user.benutzername || 'user';
  return `lanis_preferences:${encodeURIComponent(school)}:${encodeURIComponent(username.toLocaleLowerCase('de-DE'))}`;
};

const readCache = (cacheKey: string | null): CachedPreferences | null => {
  if (!cacheKey) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (!parsed?.preferences) return null;
    return {
      preferences: normalizePreferences(parsed.preferences),
      dirty: parsed.dirty === true,
    };
  } catch {
    return null;
  }
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode; sync?: boolean }> = ({ children, sync = true }) => {
  const { token, user } = useAuth();
  const { setThemeColor, setThemeMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [loadedCacheKey, setLoadedCacheKey] = useState<string | null>(null);
  const preferencesRef = useRef(preferences);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const cacheKey = cacheKeyForUser(user);

  const applyPreferences = useCallback((next: UserPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    setThemeMode(next.appearance.theme_mode);
    setThemeColor(next.appearance.theme_color);
  }, [setThemeColor, setThemeMode]);

  const writeCache = useCallback((next: UserPreferences, dirty: boolean) => {
    if (!cacheKey) return;
    localStorage.setItem(cacheKey, JSON.stringify({ preferences: next, dirty } satisfies CachedPreferences));
  }, [cacheKey]);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCache(cacheKey);
    const localFallback = cached?.preferences || legacyPreferences();

    if (!token || !cacheKey) {
      setIsLoading(false);
      setLoadedCacheKey(null);
      return () => controller.abort();
    }

    applyPreferences(localFallback);
    if (!sync) {
      setIsLoading(false);
      setLoadedCacheKey(cacheKey);
      return () => controller.abort();
    }

    setIsLoading(true);
    setSyncError('');
    const load = async () => {
      try {
        const response = await settingsAPI.getPreferences(token, controller.signal);
        if (controller.signal.aborted) return;
        let next = normalizePreferences(response.preferences);
        if (!response.stored || cached?.dirty) {
          next = cached?.preferences || localFallback;
          const migrated = await settingsAPI.updatePreferences(token, next, controller.signal);
          if (controller.signal.aborted) return;
          next = normalizePreferences(migrated.preferences);
        }
        applyPreferences(next);
        writeCache(next, false);
        localStorage.removeItem('pinned_modules');
        localStorage.removeItem('lanis_timetable_view_mode');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load account preferences:', error);
        applyPreferences(localFallback);
        writeCache(localFallback, cached?.dirty ?? true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setLoadedCacheKey(cacheKey);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [applyPreferences, cacheKey, sync, token, writeCache]);

  const updatePreferences = useCallback((patch: UserPreferencesPatch): Promise<boolean> => {
    const next = mergePreferences(preferencesRef.current, patch);
    applyPreferences(next);
    writeCache(next, true);
    setSyncError('');

    if (!sync || !token) {
      writeCache(next, false);
      return Promise.resolve(true);
    }

    const save = async () => {
      setIsSaving(true);
      try {
        const response = await settingsAPI.updatePreferences(token, next);
        const saved = normalizePreferences(response.preferences);
        if (JSON.stringify(preferencesRef.current) === JSON.stringify(next)) {
          applyPreferences(saved);
          writeCache(saved, false);
        }
        return true;
      } catch (error) {
        console.error('Failed to save account preferences:', error);
        writeCache(preferencesRef.current, true);
        setSyncError('Änderungen sind lokal gespeichert und werden beim nächsten Versuch synchronisiert.');
        return false;
      } finally {
        setIsSaving(false);
      }
    };

    const queued = saveQueueRef.current.then(save, save);
    saveQueueRef.current = queued;
    return queued;
  }, [applyPreferences, sync, token, writeCache]);

  return (
    <PreferencesContext.Provider value={{
      preferences,
      isLoading: isLoading || Boolean(sync && token && cacheKey && loadedCacheKey !== cacheKey),
      isSaving,
      syncError,
      updatePreferences,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};

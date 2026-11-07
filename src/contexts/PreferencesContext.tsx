import { capture } from '../analytics/client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { settingsAPI } from '../services/api';
import { UserPreferences, UserPreferencesPatch } from '../types';
import { DEFAULT_SIDEBAR_ORDER, normalizeSidebarOrder } from '../utils/sidebarNavigation';
import { canWriteAccountData, captureAccountDataGeneration } from '../utils/accountDataWrites';
import { normalizeHideCompletedHomework } from '../utils/homeworkPreferences';
import { applyThemeColorPalette, normalizeThemeColor, SECONDARY_THEME_COLOR_KEY } from '../utils/themeAssets';

export const CURRENT_ONBOARDING_VERSION = 1;
const LEGACY_PREFERENCES_OWNER_KEY = 'lanis_preferences_legacy_owner';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  appearance: { theme_mode: 'system', theme_color: '#f43f5e', secondary_theme_color: '#047857' },
  sidebar: { order: DEFAULT_SIDEBAR_ORDER, hidden_items: [], show_feedback_button: true },
  dashboard: {
    module_order: [],
    hidden_modules: [],
    view_mode: 'grid',
    show_search: true,
    show_subtitle: true,
    notifications_enabled: true,
    notification_messages_enabled: true,
    notification_native_enabled: true,
    notification_dsb_enabled: true,
    notification_show_read: false,
    notification_limit: 20,
  },
  timetable: { view_mode: 'rolling', layout_mode: 'cards', show_substitutions: true, show_homework: true, show_exams: true, class_colors: {} },
  homework: { hide_completed_in_overview: false },
  vertretungsplan: { class_override: '' },
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
  sidebar: { ...current.sidebar, ...patch.sidebar },
  dashboard: { ...current.dashboard, ...patch.dashboard },
  timetable: { ...current.timetable, ...patch.timetable },
  homework: { ...current.homework, ...patch.homework },
  vertretungsplan: { ...current.vertretungsplan, ...patch.vertretungsplan },
  onboarding: { ...current.onboarding, ...patch.onboarding },
});

const mergePersistedPatch = (
  current: UserPreferences,
  patch: UserPreferencesPatch,
  persisted: UserPreferences,
  persistedResponse: Partial<UserPreferences>,
): UserPreferences => {
  const merged = { ...current };
  for (const group of Object.keys(patch) as Array<keyof UserPreferences>) {
    const fields = patch[group];
    if (!fields) continue;

    const mergedGroup = { ...merged[group] } as Record<string, unknown>;
    const persistedGroup = persisted[group] as unknown as Record<string, unknown>;
    const persistedResponseGroup = persistedResponse[group] as Record<string, unknown> | undefined;
    for (const field of Object.keys(fields)) {
      if (persistedResponseGroup && Object.prototype.hasOwnProperty.call(persistedResponseGroup, field)
        && Object.prototype.hasOwnProperty.call(persistedGroup, field)) {
        mergedGroup[field] = persistedGroup[field];
      }
    }
    (merged as unknown as Record<string, unknown>)[group] = mergedGroup;
  }
  return merged;
};

const normalizePreferences = (value?: Partial<UserPreferences>): UserPreferences => {
  const appearance = value?.appearance;
  const themeColor = normalizeThemeColor(appearance?.theme_color) ?? DEFAULT_USER_PREFERENCES.appearance.theme_color;
  const secondaryThemeColor = normalizeThemeColor(appearance?.secondary_theme_color)
    ?? DEFAULT_USER_PREFERENCES.appearance.secondary_theme_color;
  const homework = value?.homework as (Partial<UserPreferences['homework']> & {
    completed_display?: 'orange' | 'green' | 'hidden';
  }) | undefined;
  const dashboard = value?.dashboard;
  const sidebar = value?.sidebar;
  const showFeedbackButton = typeof sidebar?.show_feedback_button === 'boolean'
    ? sidebar.show_feedback_button
    : true;
  const hiddenSidebarItems = Array.isArray(sidebar?.hidden_items)
    ? sidebar.hidden_items.filter(item => typeof item === 'string' && item !== 'feedback')
    : [];
  const hiddenModules = dashboard?.hidden_modules || [];
  const moduleOrder = Array.isArray(dashboard?.module_order)
    ? [...new Set(dashboard.module_order.filter(moduleName => typeof moduleName === 'string'))]
    : [];
  const dashboardPreferences = { ...dashboard };
  Reflect.deleteProperty(dashboardPreferences, 'pinned_modules');
  const hideCompletedHomework = normalizeHideCompletedHomework(homework);

  return mergePreferences(DEFAULT_USER_PREFERENCES, {
    appearance: { ...appearance, theme_color: themeColor, secondary_theme_color: secondaryThemeColor },
    sidebar: { ...sidebar, hidden_items: hiddenSidebarItems, show_feedback_button: showFeedbackButton },
    dashboard: {
      ...dashboardPreferences,
      module_order: moduleOrder,
      hidden_modules: hiddenModules,
    },
    timetable: value?.timetable,
    homework: { hide_completed_in_overview: hideCompletedHomework },
    vertretungsplan: value?.vertretungsplan,
    onboarding: value?.onboarding,
  });
};

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
  const themeColor = normalizeThemeColor(localStorage.getItem('lanis_theme_color'))
    ?? DEFAULT_USER_PREFERENCES.appearance.theme_color;
  const secondaryThemeColor = normalizeThemeColor(localStorage.getItem(SECONDARY_THEME_COLOR_KEY))
    ?? DEFAULT_USER_PREFERENCES.appearance.secondary_theme_color;
  const timetableMode = localStorage.getItem('lanis_timetable_view_mode');
  return mergePreferences(DEFAULT_USER_PREFERENCES, {
    appearance: { theme_mode: themeMode, theme_color: themeColor, secondary_theme_color: secondaryThemeColor },
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

  useEffect(() => {
    applyThemeColorPalette(preferences.appearance.secondary_theme_color, 'secondary');
  }, [preferences.appearance.secondary_theme_color]);

  const applyPreferences = useCallback((next: UserPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    setThemeMode(next.appearance.theme_mode);
    setThemeColor(next.appearance.theme_color);
  }, [setThemeColor, setThemeMode]);

  const writeCache = useCallback((
    next: UserPreferences,
    dirty: boolean,
    generation = captureAccountDataGeneration(),
  ) => {
    if (!cacheKey || !canWriteAccountData(generation)) return;
    localStorage.setItem(cacheKey, JSON.stringify({ preferences: next, dirty } satisfies CachedPreferences));
  }, [cacheKey]);

  useEffect(() => {
    const controller = new AbortController();
    const writeGeneration = captureAccountDataGeneration();
    const cached = readCache(cacheKey);
    const legacyOwner = localStorage.getItem(LEGACY_PREFERENCES_OWNER_KEY);
    const canClaimLegacyPreferences = Boolean(sync && token && cacheKey && !legacyOwner);
    const localFallback = cached?.preferences
      || (!sync || canClaimLegacyPreferences ? legacyPreferences() : DEFAULT_USER_PREFERENCES);

    if (!token || !cacheKey) {
      setIsLoading(false);
      setLoadedCacheKey(null);
      return () => controller.abort();
    }

    if (canClaimLegacyPreferences && canWriteAccountData(writeGeneration)) {
      localStorage.setItem(LEGACY_PREFERENCES_OWNER_KEY, cacheKey);
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
        if (controller.signal.aborted || !canWriteAccountData(writeGeneration)) return;
        let next = normalizePreferences({
          ...response.preferences,
          appearance: { ...localFallback.appearance, ...response.preferences.appearance },
          sidebar: {
            ...localFallback.sidebar,
            ...cached?.preferences.sidebar,
            ...response.preferences.sidebar,
          },
          dashboard: { ...localFallback.dashboard, ...response.preferences.dashboard },
        });
        if (!response.stored || cached?.dirty) {
          next = cached?.preferences || localFallback;
          const migrated = await settingsAPI.updatePreferences(token, next, controller.signal);
          if (controller.signal.aborted || !canWriteAccountData(writeGeneration)) return;
          next = normalizePreferences({
            ...migrated.preferences,
            appearance: { ...next.appearance, ...migrated.preferences.appearance },
            sidebar: { ...next.sidebar, ...migrated.preferences.sidebar },
            dashboard: { ...next.dashboard, ...migrated.preferences.dashboard },
          });
        }
        applyPreferences(next);
        writeCache(next, false, writeGeneration);
        localStorage.removeItem('pinned_modules');
        localStorage.removeItem('lanis_timetable_view_mode');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load or sync account preferences:', error);
        if (!canWriteAccountData(writeGeneration)) return;
        setSyncError('Einstellungen konnten nicht synchronisiert werden. Lokale Änderungen bleiben gespeichert.');
        applyPreferences(localFallback);
        writeCache(localFallback, cached?.dirty ?? true, writeGeneration);
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
    const writeGeneration = captureAccountDataGeneration();
    for (const section of ['appearance', 'dashboard', 'timetable', 'homework', 'sidebar'] as const) {
      if (patch[section] && !patch.onboarding) void capture('settings_updated', { section });
    }
    const next = mergePreferences(preferencesRef.current, patch);
    applyPreferences(next);
    writeCache(next, true, writeGeneration);
    setSyncError('');

    if (!sync || !token) {
      writeCache(next, false, writeGeneration);
      return Promise.resolve(true);
    }

    const save = async () => {
      setIsSaving(true);
      try {
        const response = await settingsAPI.updatePreferences(token, patch);
        if (patch.sidebar?.order) {
          const persistedOrder = response.preferences.sidebar?.order;
          if (!persistedOrder
            || JSON.stringify(normalizeSidebarOrder(persistedOrder)) !== JSON.stringify(next.sidebar.order)) {
            throw new Error('The backend did not persist the sidebar order.');
          }
        }
        if (patch.dashboard?.module_order) {
          const persistedOrder = response.preferences.dashboard?.module_order;
          if (!persistedOrder
            || JSON.stringify(persistedOrder) !== JSON.stringify(next.dashboard.module_order)) {
            throw new Error('The backend did not persist the dashboard module order.');
          }
        }
        if (patch.sidebar?.hidden_items) {
          const persistedHiddenItems = response.preferences.sidebar?.hidden_items;
          if (!persistedHiddenItems
            || JSON.stringify(persistedHiddenItems) !== JSON.stringify(next.sidebar.hidden_items)) {
            throw new Error('The backend did not persist the sidebar visibility settings.');
          }
        }
        if (patch.sidebar?.show_feedback_button !== undefined) {
          const persistedFeedbackButton = response.preferences.sidebar?.show_feedback_button;
          if (typeof persistedFeedbackButton !== 'boolean'
            || persistedFeedbackButton !== next.sidebar.show_feedback_button) {
            throw new Error('The backend did not persist the feedback button preference.');
          }
        }
        const persisted = normalizePreferences(response.preferences);
        const saved = normalizePreferences(mergePersistedPatch(next, patch, persisted, response.preferences));
        const hasUnsyncedLocalChanges = JSON.stringify(saved) !== JSON.stringify(persisted);
        if (canWriteAccountData(writeGeneration)
          && JSON.stringify(preferencesRef.current) === JSON.stringify(next)) {
          applyPreferences(saved);
          writeCache(saved, hasUnsyncedLocalChanges, writeGeneration);
          setSyncError(hasUnsyncedLocalChanges
            ? 'Änderungen sind lokal gespeichert und werden beim nächsten Versuch synchronisiert.'
            : '');
        }
        return true;
      } catch (error) {
        console.error('Failed to save account preferences:', error);
        writeCache(preferencesRef.current, true, writeGeneration);
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

import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { useTheme } from '../../contexts/ThemeContext';
import Layout from '../layout/Layout';
import { demoModules, demoPinnedModules, demoUser } from './demoData';
import { getDemoTabId, keepDemoSessionAlive, readDemoStorageSnapshot, writeDemoStorageSnapshot } from '../../utils/demoMode';
import type { ThemeColor, ThemeMode } from '../../types';

const mockAuth = {
  isAuthenticated: true as const,
  token: 'demo-mock-token-000000000000000000000000',
  user: demoUser,
  login: async () => true,
  logout: async () => {},
  refreshToken: async () => true,
};

const DEMO_STORAGE_KEYS = [
  '__demo_mode',
  'pinned_modules',
  'profile_cache',
  'messages_cache',
  'courses_cache',
  'username_cache',
  'dsb_plan_cache_v2',
  'modules_cache:demo%3Amia.keller',
  'lanis_theme_mode',
  'lanis_oled_mode',
  'lanis_dark_mode',
  'lanis_theme_color',
] as const;

const readAppearance = (values: Map<string, string | null>) => {
  const storedMode = values.get('lanis_theme_mode');
  const themeMode: ThemeMode = storedMode === 'system' || storedMode === 'light' || storedMode === 'dark' || storedMode === 'oled'
    ? storedMode
    : values.get('lanis_oled_mode') === 'true'
      ? 'oled'
      : values.get('lanis_dark_mode') === 'true'
        ? 'dark'
        : values.get('lanis_dark_mode') === 'false'
          ? 'light'
          : 'system';
  const storedColor = values.get('lanis_theme_color');
  const themeColor: ThemeColor = storedColor === 'emerald' || storedColor === 'sapphire' || storedColor === 'amethyst'
    || storedColor === 'ruby' || storedColor === 'amber' || storedColor === 'cyan'
    ? storedColor
    : 'cyan';
  return { themeMode, themeColor };
};

const seedLocalStorage = () => {
  const tabId = getDemoTabId();
  const storedValues = readDemoStorageSnapshot(tabId);
  const storedSnapshot = storedValues
    ? new Map(Object.entries(storedValues))
    : null;
  const previous = storedSnapshot || new Map<string, string | null>(
    DEMO_STORAGE_KEYS.map(key => [key, localStorage.getItem(key)]),
  );
  if (!storedSnapshot && tabId) {
    writeDemoStorageSnapshot(tabId, Object.fromEntries(previous));
  }

  localStorage.setItem('__demo_mode', '1');
  localStorage.setItem('pinned_modules', JSON.stringify(demoPinnedModules));
  localStorage.setItem('profile_cache', JSON.stringify(demoUser));
  localStorage.setItem('modules_cache:demo%3Amia.keller', JSON.stringify(demoModules));
  ['messages_cache', 'courses_cache', 'username_cache', 'dsb_plan_cache_v2'].forEach(key => localStorage.removeItem(key));

  return () => {
    (tabId && readDemoStorageSnapshot(tabId)
      ? new Map(Object.entries(readDemoStorageSnapshot(tabId) || {}))
      : previous
    ).forEach((value, key) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
    if (tabId) writeDemoStorageSnapshot(tabId, null);
  };
};

const DemoRoute: React.FC = () => {
  const { themeMode, themeColor, setThemeMode, setThemeColor } = useTheme();
  const initialAppearanceRef = useRef({ themeMode, themeColor });

  useEffect(() => {
    const restoreStorage = seedLocalStorage();
    const tabId = getDemoTabId();
    const stopHeartbeat = tabId ? keepDemoSessionAlive(tabId) : () => {};
    return () => {
      const storedValues = tabId ? readDemoStorageSnapshot(tabId) : null;
      const previous = storedValues
        ? new Map(Object.entries(storedValues))
        : null;
      stopHeartbeat();
      restoreStorage();
      if (previous) {
        const appearance = readAppearance(previous);
        setThemeMode(appearance.themeMode);
        setThemeColor(appearance.themeColor);
      } else {
        setThemeMode(initialAppearanceRef.current.themeMode);
        setThemeColor(initialAppearanceRef.current.themeColor);
      }
    };
  }, [setThemeColor, setThemeMode]);

  return (
    <AuthContext.Provider value={mockAuth}>
      <PreferencesProvider sync={false}>
        <Layout basePath="/demo">
          <Outlet />
        </Layout>
      </PreferencesProvider>
    </AuthContext.Provider>
  );
};

export default DemoRoute;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeColor, ThemeMode } from '../types';
import {
  applyThemeAssets,
  applyThemeColorPalette,
  normalizeThemeColor,
  SECONDARY_THEME_COLOR_KEY,
} from '../utils/themeAssets';
import { canWriteAccountData, captureAccountDataGeneration } from '../utils/accountDataWrites';

export type { ThemeColor, ThemeMode } from '../types';

interface ThemeContextType {
  isDark: boolean;
  isOled: boolean;
  toggleDark: () => void;
  toggleOled: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const THEME_COLOR_KEY = 'lanis_theme_color';
const DARK_MODE_KEY = 'lanis_dark_mode';
const OLED_MODE_KEY = 'lanis_oled_mode';
const THEME_MODE_KEY = 'lanis_theme_mode';

function applyPrimaryTheme(color: ThemeColor) {
  applyThemeColorPalette(color, 'primary');
  const secondaryColor = normalizeThemeColor(localStorage.getItem(SECONDARY_THEME_COLOR_KEY));
  if (secondaryColor) applyThemeColorPalette(secondaryColor, 'secondary');
  applyThemeAssets(color);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialColor?: ThemeColor }> = ({ children, initialColor }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const storedMode = localStorage.getItem(THEME_MODE_KEY);
    if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark' || storedMode === 'oled') {
      return storedMode;
    }
    if (localStorage.getItem(OLED_MODE_KEY) === 'true') return 'oled';
    const storedDark = localStorage.getItem(DARK_MODE_KEY);
    if (storedDark === 'true') return 'dark';
    if (storedDark === 'false') return 'light';
    return 'system';
  });
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    if (typeof window === 'undefined') return normalizeThemeColor(initialColor) ?? '#f43f5e';
    const storedTheme = normalizeThemeColor(localStorage.getItem(THEME_COLOR_KEY));
    return storedTheme ?? normalizeThemeColor(initialColor) ?? '#f43f5e';
  });

  const isOled = themeMode === 'oled';
  const isDark = themeMode === 'dark' || isOled || (themeMode === 'system' && systemDark);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    const generation = captureAccountDataGeneration();
    if (!canWriteAccountData(generation)) return;
    localStorage.setItem(THEME_MODE_KEY, mode);
    localStorage.setItem(OLED_MODE_KEY, String(mode === 'oled'));
    if (mode === 'system') localStorage.removeItem(DARK_MODE_KEY);
    else localStorage.setItem(DARK_MODE_KEY, String(mode === 'dark' || mode === 'oled'));
  }, []);

  const toggleDark = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  const toggleOled = useCallback(() => {
    setThemeMode(isOled ? 'dark' : 'oled');
  }, [isOled, setThemeMode]);

  const setThemeColor = useCallback((color: ThemeColor) => {
    const normalizedColor = normalizeThemeColor(color);
    if (!normalizedColor) throw new Error('Invalid primary theme color');
    setThemeColorState(normalizedColor);
    const generation = captureAccountDataGeneration();
    if (!canWriteAccountData(generation)) return;
    localStorage.setItem(THEME_COLOR_KEY, normalizedColor);
    applyPrimaryTheme(normalizedColor);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.classList.toggle('oled', isOled);
  }, [isDark, isOled]);

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncWithSystem = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    colorScheme.addEventListener('change', syncWithSystem);
    return () => colorScheme.removeEventListener('change', syncWithSystem);
  }, []);

  useEffect(() => {
    const storedColor = localStorage.getItem(THEME_COLOR_KEY);
    if (storedColor && storedColor !== themeColor) {
      const generation = captureAccountDataGeneration();
      if (canWriteAccountData(generation)) localStorage.setItem(THEME_COLOR_KEY, themeColor);
    }
    applyPrimaryTheme(themeColor);
  }, [themeColor]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isOled ? '#000000' : isDark ? '#0a0a0a' : themeColor);
  }, [themeColor, isDark, isOled]);

  return (
    <ThemeContext.Provider value={{ isDark, isOled, toggleDark, toggleOled, themeMode, setThemeMode, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

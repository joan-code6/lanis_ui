import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeColor, ThemeMode } from '../types';
import { applyThemeAssets, isThemeColor, THEME_COLOR_HEX } from '../utils/themeAssets';

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

const THEME_COLOR_KEY = 'lanis_theme_color';
const DARK_MODE_KEY = 'lanis_dark_mode';
const OLED_MODE_KEY = 'lanis_oled_mode';
const THEME_MODE_KEY = 'lanis_theme_mode';

type ColorScale = Record<string, string>;

const THEMES: Record<ThemeColor, ColorScale> = {
  emerald: {
    50: '236 253 245', 100: '209 250 229', 200: '167 243 208',
    300: '110 231 183', 400: '52 211 153', 500: '16 185 129',
    600: '5 150 105',   700: '4 120 87',   800: '6 95 70',
    900: '6 78 59',     950: '2 44 34',
  },
  sapphire: {
    50: '239 246 255', 100: '219 234 254', 200: '191 219 254',
    300: '147 197 253', 400: '96 165 250', 500: '59 130 246',
    600: '37 99 235',   700: '29 78 216',  800: '30 64 175',
    900: '30 58 138',   950: '23 37 84',
  },
  amethyst: {
    50: '250 245 255', 100: '243 232 255', 200: '233 213 255',
    300: '216 180 254', 400: '192 132 252', 500: '168 85 247',
    600: '147 51 234',  700: '126 34 206', 800: '107 33 168',
    900: '88 28 135',   950: '59 7 100',
  },
  ruby: {
    50: '255 241 242', 100: '255 228 230', 200: '254 205 211',
    300: '253 164 175', 400: '251 113 133', 500: '244 63 94',
    600: '225 29 72',   700: '190 18 60',  800: '159 18 57',
    900: '136 19 55',   950: '76 5 25',
  },
  amber: {
    50: '255 251 235', 100: '254 243 199', 200: '253 230 138',
    300: '252 211 77',  400: '251 191 36', 500: '245 158 11',
    600: '217 119 6',   700: '180 83 9',  800: '146 64 14',
    900: '120 53 15',   950: '69 26 3',
  },
  cyan: {
    50: '236 254 255', 100: '207 250 254', 200: '165 243 252',
    300: '103 232 249', 400: '34 211 238', 500: '6 182 212',
    600: '8 145 178',   700: '14 116 144', 800: '21 94 117',
    900: '22 78 99',    950: '8 51 68',
  },
};

function applyPrimaryTheme(color: ThemeColor) {
  document.documentElement.setAttribute('data-theme', color);
  applyThemeAssets(color);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
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
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const storedTheme = localStorage.getItem(THEME_COLOR_KEY);
    return isThemeColor(storedTheme) ? storedTheme : 'cyan';
  });

  const isOled = themeMode === 'oled';
  const isDark = themeMode === 'dark' || isOled || (themeMode === 'system' && systemDark);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
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
    setThemeColorState(color);
    localStorage.setItem(THEME_COLOR_KEY, color);
    applyPrimaryTheme(color);
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
    applyPrimaryTheme(themeColor);
  }, [themeColor]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isOled ? '#000000' : isDark ? '#0a0a0a' : THEME_COLOR_HEX[themeColor]);
  }, [themeColor, isDark, isOled]);

  return (
    <ThemeContext.Provider value={{ isDark, isOled, toggleDark, toggleOled, themeMode, setThemeMode, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

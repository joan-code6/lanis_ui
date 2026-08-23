import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeColor = 'emerald' | 'sapphire' | 'amethyst' | 'ruby' | 'amber' | 'cyan';

interface ThemeContextType {
  isDark: boolean;
  isOled: boolean;
  toggleDark: () => void;
  toggleOled: () => void;
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

const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  cyan: '#06b6d4',
  emerald: '#10b981',
  sapphire: '#3b82f6',
  amethyst: '#a855f7',
  ruby: '#f43f5e',
  amber: '#f59e0b',
};

const SURFACE_LIGHT: ColorScale = {
  50: '250 250 250', 100: '245 245 245', 200: '229 229 229',
  300: '212 212 212', 400: '163 163 163', 500: '115 115 115',
  600: '82 82 82',    700: '64 64 64',    800: '38 38 38',
  900: '23 23 23',    950: '10 10 10',
};

const SURFACE_DARK: ColorScale = {
  50: '250 250 250',  100: '245 245 245',  200: '229 229 229',
  300: '212 212 212', 400: '163 163 163', 500: '115 115 115',
  600: '82 82 82',    700: '64 64 64',     800: '38 38 38',
  900: '23 23 23',    950: '10 10 10',
};

const SURFACE_OLED: ColorScale = {
  50: '238 238 238', 100: '222 222 222', 200: '178 178 178',
  300: '138 138 138', 400: '104 104 104', 500: '72 72 72',
  600: '44 44 44',    700: '20 20 20',    800: '8 8 8',
  900: '2 2 2',        950: '0 0 0',
};

function applyPrimaryTheme(color: ThemeColor) {
  document.documentElement.setAttribute('data-theme', color);
}

function applySurfaceTheme(isDark: boolean, isOled: boolean) {
  const colors = isOled ? SURFACE_OLED : isDark ? SURFACE_DARK : SURFACE_LIGHT;
  const root = document.documentElement;
  for (const [shade, value] of Object.entries(colors)) {
    root.style.setProperty(`--color-surface-${shade}`, value);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOled, setIsOled] = useState(() => localStorage.getItem(OLED_MODE_KEY) === 'true');
  const [isDark, setIsDark] = useState(() => {
    if (localStorage.getItem(OLED_MODE_KEY) === 'true') return true;
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem(THEME_COLOR_KEY) as ThemeColor) || 'cyan';
  });

  const toggleDark = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(DARK_MODE_KEY, String(next));

    if (!next && isOled) {
      setIsOled(false);
      localStorage.setItem(OLED_MODE_KEY, 'false');
    }
  }, [isDark, isOled]);

  const toggleOled = useCallback(() => {
    const next = !isOled;
    setIsOled(next);
    localStorage.setItem(OLED_MODE_KEY, String(next));

    if (next && !isDark) {
      setIsDark(true);
      localStorage.setItem(DARK_MODE_KEY, 'true');
    }
  }, [isDark, isOled]);

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
    applySurfaceTheme(isDark, isOled);
  }, [isDark, isOled]);

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
    <ThemeContext.Provider value={{ isDark, isOled, toggleDark, toggleOled, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

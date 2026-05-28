import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeColor = 'emerald' | 'sapphire' | 'amethyst' | 'ruby' | 'amber' | 'cyan';

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
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

const SURFACE_LIGHT: ColorScale = {
  50: '250 250 250', 100: '245 245 245', 200: '229 229 229',
  300: '212 212 212', 400: '163 163 163', 500: '115 115 115',
  600: '82 82 82',    700: '64 64 64',    800: '38 38 38',
  900: '23 23 23',    950: '10 10 10',
};

const SURFACE_DARK: ColorScale = {
  50: '10 10 10',    100: '23 23 23',    200: '38 38 38',
  300: '64 64 64',   400: '82 82 82',   500: '115 115 115',
  600: '163 163 163', 700: '212 212 212', 800: '229 229 229',
  900: '245 245 245', 950: '250 250 250',
};

function applyPrimaryTheme(color: ThemeColor) {
  document.documentElement.setAttribute('data-theme', color);
}

function applySurfaceTheme(isDark: boolean) {
  const colors = isDark ? SURFACE_DARK : SURFACE_LIGHT;
  const root = document.documentElement;
  for (const [shade, value] of Object.entries(colors)) {
    root.style.setProperty(`--color-surface-${shade}`, value);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem(THEME_COLOR_KEY) as ThemeColor) || 'emerald';
  });

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  }, []);

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
    applySurfaceTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    applyPrimaryTheme(themeColor);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

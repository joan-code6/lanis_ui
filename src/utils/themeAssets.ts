import type { ThemeColor } from '../types';

export const THEME_COLORS: ThemeColor[] = [
  'cyan',
  'emerald',
  'sapphire',
  'amethyst',
  'ruby',
  'amber',
];

export function isThemeColor(value: unknown): value is ThemeColor {
  return typeof value === 'string' && THEME_COLORS.includes(value as ThemeColor);
}

export const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  cyan: '#06b6d4',
  emerald: '#10b981',
  sapphire: '#3b82f6',
  amethyst: '#a855f7',
  ruby: '#f43f5e',
  amber: '#f59e0b',
};

export function getThemeIconUrl(theme: ThemeColor, filename = 'android-chrome-192x192.png') {
  return `/favicon/themes/${theme}/${filename}`;
}

export function getThemeManifestUrl(theme: ThemeColor) {
  return `/favicon/themes/${theme}/site.webmanifest`;
}

export function applyThemeAssets(theme: ThemeColor) {
  document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon]').forEach((link) => {
    const filename = link.dataset.themeIcon;
    if (filename) link.href = getThemeIconUrl(theme, filename);
  });

  const manifest = document.querySelector<HTMLLinkElement>('link[data-theme-manifest]');
  if (manifest) manifest.href = getThemeManifestUrl(theme);
}

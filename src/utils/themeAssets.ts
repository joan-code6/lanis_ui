import type { ThemeColor } from '../types';

export const CUSTOM_THEME_COLOR_KEY = 'lanis_custom_theme_color';
export const SECONDARY_THEME_COLOR_KEY = 'lanis_secondary_theme_color';
export const CUSTOM_SECONDARY_THEME_COLOR_KEY = 'lanis_custom_secondary_theme_color';

export const THEME_COLOR_HEX: Record<string, ThemeColor> = {
  cyan: '#06b6d4',
  emerald: '#10b981',
  sapphire: '#3b82f6',
  amethyst: '#a855f7',
  ruby: '#f43f5e',
  amber: '#f59e0b',
  coral: '#f88379',
  blush: '#fee3ea',
  moss: '#4b573f',
};

export function normalizeThemeColor(value: unknown): ThemeColor | null {
  if (typeof value !== 'string') return null;
  const legacyColor = THEME_COLOR_HEX[value];
  if (legacyColor) return legacyColor;
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  const hex = value.slice(1).toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((character) => character + character).join('') : hex}`;
}

export function applyThemeColorPalette(color: ThemeColor, palette: 'primary' | 'secondary') {
  const root = document.documentElement;
  const rgb = color.slice(1).match(/.{2}/g)!.map((channel) => parseInt(channel, 16));
  if (palette === 'secondary') {
    const [red, green, blue] = rgb.map(channel => channel / 255);
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const hue = delta === 0 ? 220
      : max === red ? 60 * (((green - blue) / delta) % 6)
        : max === green ? 60 * ((blue - red) / delta + 2)
          : 60 * ((red - green) / delta + 4);
    const saturation = Math.max(0.58, Math.min(0.82, delta / (1 - Math.abs(max + min - 1)) || 0));
    const lightness: Record<number, number> = {
      50: 0.97, 100: 0.93, 200: 0.86, 300: 0.76, 400: 0.64,
      600: 0.42, 700: 0.34, 800: 0.25, 900: 0.17, 950: 0.1,
    };
    Object.entries(lightness).forEach(([shade, value]) => {
      const chroma = (1 - Math.abs(2 * value - 1)) * saturation;
      const sector = ((hue % 360) + 360) % 360 / 60;
      const second = chroma * (1 - Math.abs(sector % 2 - 1));
      const channels = sector < 1 ? [chroma, second, 0]
        : sector < 2 ? [second, chroma, 0]
          : sector < 3 ? [0, chroma, second]
            : sector < 4 ? [0, second, chroma]
              : sector < 5 ? [second, 0, chroma]
                : [chroma, 0, second];
      const match = value - chroma / 2;
      root.style.setProperty(
        `--color-secondary-${shade}`,
        channels.map(channel => Math.round((channel + match) * 255)).join(' '),
      );
    });
    root.style.setProperty(`--color-secondary-500`, rgb.join(' '));
    return;
  }

  const shades: Record<number, [number, number]> = {
    50: [0.96, 0], 100: [0.9, 0], 200: [0.75, 0], 300: [0.55, 0], 400: [0.3, 0],
    500: [0, 0], 600: [0, 0.12], 700: [0, 0.25], 800: [0, 0.4], 900: [0, 0.55], 950: [0, 0.78],
  };
  Object.entries(shades).forEach(([shade, [white, black]]) => {
    const channels = rgb.map((channel) => Math.round(channel * (1 - white - black) + 255 * white));
    root.style.setProperty(`--color-${palette}-${shade}`, channels.join(' '));
  });
}

export function getThemeAssetName(color: ThemeColor) {
  let closest = 'cyan';
  let closestDistance = Infinity;
  const rgb = color.slice(1).match(/.{2}/g)!.map((channel) => parseInt(channel, 16));
  for (const [name, hex] of Object.entries(THEME_COLOR_HEX)) {
    const distance = rgb.reduce((sum, channel, index) => {
      const target = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
      return sum + (channel - target) ** 2;
    }, 0);
    if (distance < closestDistance) {
      closest = name;
      closestDistance = distance;
    }
  }
  return closest;
}

export function getThemeIconUrl(color: ThemeColor, filename = 'android-chrome-192x192.png') {
  return `/favicon/themes/${getThemeAssetName(color)}/${filename}`;
}

export function getThemeManifestUrl(color: ThemeColor) {
  return `/favicon/themes/${getThemeAssetName(color)}/site.webmanifest`;
}

export function applyThemeAssets(color: ThemeColor) {
  document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon]').forEach((link) => {
    const filename = link.dataset.themeIcon;
    if (filename) link.href = getThemeIconUrl(color, filename);
  });

  const manifest = document.querySelector<HTMLLinkElement>('link[data-theme-manifest]');
  if (manifest) manifest.href = getThemeManifestUrl(color);
}

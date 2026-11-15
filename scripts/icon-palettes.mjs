// Hand-picked harmonious colors before applying the selected D contrast.
const harmoniousThemes = {
  cyan: { base: [1, 188, 214], hat: [18, 52, 70], themeColor: '#06b6d4' },
  emerald: { base: [16, 185, 129], hat: [5, 78, 59], themeColor: '#10b981' },
  sapphire: { base: [59, 130, 246], hat: [23, 55, 112], themeColor: '#3b82f6' },
  amethyst: { base: [168, 85, 247], hat: [76, 29, 112], themeColor: '#a855f7' },
  ruby: { base: [244, 63, 94], hat: [112, 20, 46], themeColor: '#f43f5e' },
  amber: { base: [245, 158, 11], hat: [112, 57, 12], themeColor: '#f59e0b' },
  coral: { base: [248, 131, 121], hat: [130, 45, 43], themeColor: '#f88379' },
  blush: { base: [254, 227, 234], hat: [144, 42, 81], themeColor: '#fee3ea' },
  moss: { base: [75, 87, 63], hat: [19, 40, 18], themeColor: '#4b573f' },
};

// Option D: scale each original hat RGB channel once, preserving its hue.
export const HAT_RGB_SCALE = 0.4;
export const themes = Object.fromEntries(
  Object.entries(harmoniousThemes).map(([name, theme]) => [name, {
    ...theme,
    hat: theme.hat.map(channel => Math.round(channel * HAT_RGB_SCALE)),
  }]),
);

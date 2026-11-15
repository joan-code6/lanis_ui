import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const faviconDirectory = join(process.cwd(), 'public', 'favicon');
const sourcePath = join(faviconDirectory, 'android-chrome-512x512.png');

const sourceBase = [244, 63, 94];
const sourceHat = [18, 52, 70];

// Keep cyan's familiar ink hat; give the other themes richer, harmonious shades.
// These stay dark enough to preserve the hat silhouette at favicon sizes.
const themes = {
  cyan: { base: [1, 188, 214], hat: sourceHat, themeColor: '#06b6d4' },
  emerald: { base: [16, 185, 129], hat: [5, 78, 59], themeColor: '#10b981' },
  sapphire: { base: [59, 130, 246], hat: [23, 55, 112], themeColor: '#3b82f6' },
  amethyst: { base: [168, 85, 247], hat: [76, 29, 112], themeColor: '#a855f7' },
  ruby: { base: [244, 63, 94], hat: [112, 20, 46], themeColor: '#f43f5e' },
  amber: { base: [245, 158, 11], hat: [112, 57, 12], themeColor: '#f59e0b' },
  coral: { base: [248, 131, 121], hat: [130, 45, 43], themeColor: '#f88379' },
  blush: { base: [254, 227, 234], hat: [144, 42, 81], themeColor: '#fee3ea' },
  moss: { base: [75, 87, 63], hat: [19, 40, 18], themeColor: '#4b573f' },
};

const iconSizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
};

const sourceVector = sourceBase.map((channel, index) => channel - sourceHat[index]);
const sourceVectorMagnitude = sourceVector.reduce((sum, channel) => sum + channel ** 2, 0);

const clampByte = (value) => Math.round(Math.max(0, Math.min(255, value)));

function recolor(source, theme) {
  const result = Buffer.alloc(source.length);

  for (let offset = 0; offset < source.length; offset += 4) {
    const pixel = [source[offset], source[offset + 1], source[offset + 2]];
    let mix = pixel.reduce(
      (sum, channel, index) => sum + (channel - sourceHat[index]) * sourceVector[index],
      0,
    ) / sourceVectorMagnitude;

    const reconstructed = sourceHat.map(
      (channel, index) => channel + mix * sourceVector[index],
    );
    const residualLuminance = (
      (pixel[0] - reconstructed[0]) * 0.2126
      + (pixel[1] - reconstructed[1]) * 0.7152
      + (pixel[2] - reconstructed[2]) * 0.0722
    );

    mix = Math.max(0, Math.min(1, mix));
    for (let channel = 0; channel < 3; channel += 1) {
      result[offset + channel] = clampByte(
        theme.hat[channel]
        + mix * (theme.base[channel] - theme.hat[channel])
        + residualLuminance,
      );
    }
    result[offset + 3] = source[offset + 3];
  }

  return result;
}

const { data: source, info } = await sharp(sourcePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (const [themeName, theme] of Object.entries(themes)) {
  // Cyan uses its existing artwork; recoloring the newer source subtly alters it.
  if (themeName === 'cyan') continue;

  const themeDirectory = join(faviconDirectory, 'themes', themeName);
  await mkdir(themeDirectory, { recursive: true });

  const themedIcon = recolor(source, theme);
  for (const [filename, size] of Object.entries(iconSizes)) {
    await sharp(themedIcon, { raw: info })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(join(themeDirectory, filename));
  }

  const manifest = {
    name: 'Lanis — Schulportal Hessen',
    short_name: 'Lanis',
    icons: [
      {
        src: `/favicon/themes/${themeName}/android-chrome-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `/favicon/themes/${themeName}/android-chrome-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: theme.themeColor,
    background_color: '#fcfcf9',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    lang: 'de',
  };

  await writeFile(
    join(themeDirectory, 'site.webmanifest'),
    `${JSON.stringify(manifest)}\n`,
  );
}

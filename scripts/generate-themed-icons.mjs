import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';
import { themes } from './icon-palettes.mjs';

const faviconDirectory = join(process.cwd(), 'public', 'favicon');
// Keep the unmodified source separate from generated public/default artwork.
const sourcePath = fileURLToPath(new URL('./assets/icon-source.png', import.meta.url));

const sourceBase = [244, 63, 94];
const sourceHat = [18, 52, 70];

const iconSizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
};

const clampByte = (value) => Math.round(Math.max(0, Math.min(255, value)));

function recolor(source, theme, inputBase = sourceBase, inputHat = sourceHat) {
  const sourceVector = inputBase.map((channel, index) => channel - inputHat[index]);
  const sourceVectorMagnitude = sourceVector.reduce((sum, channel) => sum + channel ** 2, 0);
  const result = Buffer.alloc(source.length);

  for (let offset = 0; offset < source.length; offset += 4) {
    const pixel = [source[offset], source[offset + 1], source[offset + 2]];
    let mix = pixel.reduce(
      (sum, channel, index) => sum + (channel - inputHat[index]) * sourceVector[index],
      0,
    ) / sourceVectorMagnitude;

    const reconstructed = inputHat.map(
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

// Cyan retains its original background and shading through its own source.
const cyanSource = await sharp(fileURLToPath(new URL('./assets/icon-source-cyan.png', import.meta.url)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (const [themeName, theme] of Object.entries(themes)) {
  const themeDirectory = join(faviconDirectory, 'themes', themeName);
  await mkdir(themeDirectory, { recursive: true });

  const isCyan = themeName === 'cyan';
  const themedIcon = isCyan
    ? recolor(cyanSource.data, theme, [1, 188, 214], sourceHat)
    : recolor(source, theme);
  const sourceInfo = isCyan ? cyanSource.info : info;
  for (const [filename, size] of Object.entries(iconSizes)) {
    await sharp(themedIcon, { raw: sourceInfo })
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

// Legacy/direct URLs and push fallbacks use the default ruby theme too.
const defaultDirectory = join(faviconDirectory, 'themes', 'ruby');
for (const filename of [...Object.keys(iconSizes), 'site.webmanifest']) {
  await copyFile(join(defaultDirectory, filename), join(faviconDirectory, filename));
}
const ico = await toIco(await Promise.all(
  ['favicon-16x16.png', 'favicon-32x32.png'].map(filename => readFile(join(defaultDirectory, filename))),
));
await writeFile(join(faviconDirectory, 'favicon.ico'), ico);
await sharp(join(defaultDirectory, 'android-chrome-512x512.png'))
  .webp({ lossless: true }).toFile(join(process.cwd(), 'public', 'icon.webp'));

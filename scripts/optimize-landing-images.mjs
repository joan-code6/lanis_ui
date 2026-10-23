import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Keep the PNG originals as fallbacks and editing sources. Lossless WebP
// preserves screenshot text and colours without adding a runtime dependency.
export const landingImages = [
  'lanis-dashboard', 'sph-dashboard', 'loading-screen', 'themes', 'navigation',
];

export async function optimizeLandingImages(sourceDir, outputDir) {
  await mkdir(outputDir, { recursive: true });
  let originalBytes = 0;
  let optimizedBytes = 0;
  for (const name of landingImages) {
    const input = await readFile(join(sourceDir, `${name}.png`));
    const output = await sharp(input).webp({ lossless: true, effort: 6 }).toBuffer();
    await writeFile(join(outputDir, `${name}.webp`), output);
    originalBytes += input.length;
    optimizedBytes += output.length;
  }
  return { originalBytes, optimizedBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourceDir = fileURLToPath(new URL('../public/landing/', import.meta.url));
  const { originalBytes, optimizedBytes } = await optimizeLandingImages(sourceDir, join(sourceDir, 'optimized'));
  console.log(`Landing screenshots: ${(originalBytes / 1024).toFixed(0)} KiB PNG → ${(optimizedBytes / 1024).toFixed(0)} KiB lossless WebP (${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}% smaller).`);
}

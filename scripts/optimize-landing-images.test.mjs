import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import sharp from 'sharp';
import { landingImages, optimizeLandingImages } from './optimize-landing-images.mjs';

test('all landing screenshots become smaller WebP images with identical pixels', async () => {
  const source = fileURLToPath(new URL('../public/landing/', import.meta.url));
  const output = await mkdtemp(join(tmpdir(), 'lanis-images-'));
  try {
    const totals = await optimizeLandingImages(source, output);
    assert.ok(totals.optimizedBytes < totals.originalBytes);
    for (const name of landingImages) {
      const original = await readFile(join(source, `${name}.png`));
      const optimized = await readFile(join(output, `${name}.webp`));
      assert.ok(optimized.length < original.length, `${name} must save bytes`);
      assert.equal((await sharp(optimized).metadata()).format, 'webp');
      const before = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const after = await sharp(optimized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.deepEqual(after.info, before.info, `${name} dimensions`);
      assert.deepEqual(after.data, before.data, `${name} pixels`);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

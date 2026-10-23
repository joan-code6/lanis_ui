import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSchools } from './school-cache.mjs';
import { rendererFingerprint } from './school-renderer-fingerprint.mjs';

test('school data survives 29 days, refreshes at 30 days and survives a refresh outage', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'school-cache-'));
  const originalFetch = globalThis.fetch;
  const apiBase = 'https://example.test';
  const school = { school_id: '1', name: 'School', city: 'City' };
  const options = { cacheDir, apiBase,
    parseDirectory: value => { assert(Array.isArray(value.schools)); return value.schools; },
    parseProfile: value => { assert(value); return value; },
    directoryProfile: value => value };
  const DAY = 86400000;
  async function seed(days) {
    const timestamp = Date.now() - days * DAY;
    await writeFile(join(cacheDir, 'data.json'), JSON.stringify({ version: 1, apiBase,
      directoryFetchedAt: timestamp, schools: [school],
      profiles: { 1: { school, fetchedAt: timestamp, changedAt: timestamp, source: 'profile' } } }));
  }
  try {
    let requests = [];
    globalThis.fetch = async url => {
      requests.push(url);
      return { ok: true, json: async () => url.endsWith('/schools')
        ? { success: true, schools: [school] } : { success: true, school } };
    };
    await seed(29);
    await loadSchools(options);
    assert.deepEqual(requests, []);
    await seed(30);
    await loadSchools(options);
    assert.deepEqual(requests, [`${apiBase}/schools`, `${apiBase}/schools/1/data`]);
    await seed(31);
    globalThis.fetch = async () => { throw new Error('offline'); };
    const result = await loadSchools(options);
    assert.deepEqual(result.entries[0].school, school);
    const saved = JSON.parse(await readFile(join(cacheDir, 'data.json'), 'utf8'));
    assert.equal(saved.profiles[1].source, 'profile');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('school markup ignores unrelated modules and invalidates for shared school content', async () => {
  const root = process.cwd();
  const fingerprint = () => rendererFingerprint(root, 'https://example.test');
  const unrelated = join(root, 'src/__school_cache_unrelated_test.ts');
  const shared = join(root, 'src/components/landing/LandingImage.tsx');
  const original = await readFile(shared, 'utf8');
  try {
    const before = await fingerprint();
    await writeFile(unrelated, 'export const unrelated = true;');
    assert.equal(await fingerprint(), before);
    await writeFile(shared, original + '\n// School cache dependency regression check.\n');
    assert.notEqual(await fingerprint(), before);
  } finally {
    await writeFile(shared, original);
    await rm(unrelated, { force: true });
  }
});

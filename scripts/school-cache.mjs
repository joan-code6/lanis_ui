import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

const HOUR = 3600000;
const MONTH = 30 * 24 * HOUR;
const DIRECTORY_TTL = MONTH;
const PROFILE_TTL = MONTH;
const ERROR_TTL = HOUR;
const MAX_STALE = MONTH + 7 * 24 * HOUR;
const FETCH_BUDGET = 7 * 60 * 1000;
const CONCURRENCY = 2;

async function readJson(file) {
  try {
    if ((await stat(file)).size > 64 * 1024 * 1024) return null;
    return JSON.parse(await readFile(file, 'utf8'));
  } catch { return null; }
}

async function save(file, value) {
  await writeFile(`${file}.tmp`, JSON.stringify(value));
  await rename(`${file}.tmp`, file);
}

async function getJson(url, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('School data refresh budget exhausted');
  const response = await fetch(url, { signal: AbortSignal.timeout(Math.min(20000, remaining)) });
  if (!response.ok) throw new Error(`School API returned HTTP ${response.status}`);
  return response.json();
}

// Cached data contains only public school metadata, never sessions or credentials.
// A schema/API change discards incompatible data; a cache miss affects speed only.
export async function loadSchools({ cacheDir, apiBase, parseDirectory, parseProfile, directoryProfile }) {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, 'data.json');
  const raw = await readJson(file);
  const cache = raw?.version === 1 && raw.apiBase === apiBase ? raw : {};
  const now = Date.now();
  const deadline = now + FETCH_BUDGET;
  const age = (timestamp) => Number.isFinite(timestamp) && timestamp <= now + 60000
    ? now - timestamp : Infinity;
  let schools;
  try { schools = parseDirectory({ success: true, schools: cache.schools }); } catch { /* Cache miss. */ }
  let directoryFetchedAt = cache.directoryFetchedAt;
  if (!schools || age(directoryFetchedAt) >= DIRECTORY_TTL) {
    try {
      schools = parseDirectory(await getJson(`${apiBase}/schools`, deadline));
      directoryFetchedAt = now;
    } catch (error) {
      if (!schools || age(directoryFetchedAt) > MAX_STALE) throw error;
      console.warn(`Using cached school directory: ${error.message}`);
    }
  }

  const previous = cache.profiles && typeof cache.profiles === 'object' ? cache.profiles : {};
  const profiles = {};
  const entries = new Array(schools.length);
  let cursor = 0, fetched = 0, reused = 0, stale = 0, fallback = 0;
  async function worker() {
    while (cursor < schools.length) {
      const index = cursor++;
      const item = schools[index];
      const id = item.school_id;
      let old = previous[id];
      try {
        old = { ...old, school: parseProfile(old?.school, id, apiBase) };
        if (!Number.isFinite(old.changedAt) || old.changedAt < 0 || old.changedAt > now + 60000) old.changedAt = now;
      } catch { old = null; }
      let entry;
      const ttl = old?.source === 'directory' ? ERROR_TTL : PROFILE_TTL;
      if (old && age(old.fetchedAt) < ttl) {
        entry = old;
        reused++;
      } else {
        try {
          const payload = await getJson(`${apiBase}/schools/${id}/data`, deadline);
          if (payload.success !== true) throw new Error('Invalid school response');
          const school = parseProfile(payload.school, id, apiBase);
          const changedAt = old && JSON.stringify(old.school) === JSON.stringify(school) ? old.changedAt : now;
          entry = { school, fetchedAt: now, changedAt, source: 'profile' };
          fetched++;
        } catch {
          // Preserve the last good SPH profile during a temporary outage.
          // For a new school whose exporter is unavailable, directory content
          // still supplies real names/cities; missing assets stay absent.
          if (old && age(old.fetchedAt) <= MAX_STALE) { entry = old; stale++; }
          else {
            const school = directoryProfile(item);
            entry = { school, fetchedAt: now, changedAt: now, source: 'directory' };
            fallback++;
          }
        }
      }
      profiles[id] = entry;
      entries[index] = entry;
      if ((index + 1) % 100 === 0) console.log(`School profiles: ${index + 1}/${schools.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await save(file, { version: 1, apiBase, directoryFetchedAt, schools, profiles });
  console.log(`School data: ${schools.length} schools; ${fetched} fetched, ${reused} cached, ${stale} stale, ${fallback} directory-only.`);
  return { schools, entries };
}

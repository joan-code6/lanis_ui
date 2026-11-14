const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
let generation = 1;
let owner = 'school:pupil';
let now = 1000;
let unavailable = false;
const disk = new Map();
const storage = {
  removeItem(key) { if (unavailable) throw Error('blocked'); disk.delete(key); },
};
const lifecycle = {
  captureAccountDataGeneration: () => generation,
  readPersonalCache(key) {
    if (unavailable) throw Error('blocked');
    const item = disk.get(key);
    return item?.owner === owner && item.generation === generation ? item.value : null;
  },
  writePersonalCache(key, value, expected) {
    if (unavailable) throw Error('quota');
    if (expected === generation) disk.set(key, { owner, generation, value });
  },
};
const persistenceExports = {};
vm.runInNewContext(compile('src/utils/resourcePersistence.ts'), {
  exports: persistenceExports, require: () => lifecycle, localStorage: storage, Date: { now: () => now },
});
const { createResourcePersistence, RESOURCE_STORAGE_KEY } = persistenceExports;
const key = (resource, kind = 'account') => JSON.stringify(['backend', kind, 'school', owner, generation, resource]);
const snapshot = data => ({ data, updatedAt: now, refreshing: false, error: '' });
let adapter = createResourcePersistence();
adapter.write(key('messages'), snapshot([{ id: 'saved-message' }]));
adapter = createResourcePersistence(); // A cold process, not another navigation.
assert.equal(adapter.read(key('messages')).data[0].id, 'saved-message');
assert.equal(adapter.read(key('messages')).restored, true);
assert.equal(adapter.read(key('messages')).updatedAt, now);
adapter.write(key('courses'), snapshot([]));
assert.equal(createResourcePersistence().read(key('courses')).data.length, 0);
assert.equal(adapter.read(key('messages', 'demo')), undefined);
adapter.write(key('messages', 'demo'), snapshot(['demo']));
adapter.write(key('dateispeicher-search:private query'), snapshot(['result']));
adapter.write(key('videokonferenz'), snapshot([{ join_url: 'private-join-link' }]));
assert(!disk.get(RESOURCE_STORAGE_KEY).value.includes('private query'));
assert(!disk.get(RESOURCE_STORAGE_KEY).value.includes('private-join-link'));
assert(!disk.get(RESOURCE_STORAGE_KEY).value.includes('"demo"'));
owner = 'another-account';
assert.equal(createResourcePersistence().read(key('messages')), undefined);
owner = 'school:pupil';
generation++;
assert.equal(createResourcePersistence().read(key('messages')), undefined);
generation--;
now += 7 * 24 * 60 * 60 * 1000 + 1;
assert.equal(createResourcePersistence().read(key('messages')), undefined);
now = 1000;
adapter = createResourcePersistence();
for (let i = 0; i < 45; i++) adapter.write(key(`course:${i}`), snapshot({ id: i }));
assert(Object.keys(JSON.parse(disk.get(RESOURCE_STORAGE_KEY).value)).length <= 40);
assert.equal(createResourcePersistence().read(key('course:0')), undefined);
assert.equal(createResourcePersistence().read(key('course:44')).data.id, 44);
for (let i = 0; i < 10; i++) adapter.write(key(`course:large${i}`), snapshot('x'.repeat(120_000)));
assert(disk.get(RESOURCE_STORAGE_KEY).value.length <= 750_000);
adapter.write(key('course:too-large'), snapshot('x'.repeat(126_000)));
assert.equal(createResourcePersistence().read(key('course:too-large')), undefined);
adapter.clear();
assert.equal(disk.size, 0);
assert.equal(createResourcePersistence().read(key('messages')), undefined);
disk.set(RESOURCE_STORAGE_KEY, { owner, generation, value: 'broken json' });
assert.equal(createResourcePersistence().read(key('messages')), undefined);
unavailable = true;
assert.doesNotThrow(() => createResourcePersistence().write(key('messages'), snapshot([])));
assert.equal(createResourcePersistence().read(key('messages')), undefined);
assert.doesNotThrow(() => adapter.clear());
unavailable = false;
disk.clear();

(async () => {
  function coldCache() {
    const cache = {};
    vm.runInNewContext(compile('src/utils/resourceCache.ts'), { exports: cache, AbortController, Date: { now: () => now } });
    cache.setResourcePersistence(createResourcePersistence());
    return cache;
  }
  let cache = coldCache();
  await cache.refreshResource(key('courses'), async () => ['Maths']);
  cache = coldCache();
  assert.equal(cache.readResource(key('courses')).data[0], 'Maths', 'cold launch renders before any request');
  const unsubscribe = cache.subscribeResource(key('courses'), () => {});
  assert.equal(cache.savedDataTimestamp(), now, 'mounted saved data exposes its age');
  let release;
  const request = cache.refreshResource(key('courses'), async (_signal, force) => {
    assert.equal(force, true, 'restored data triggers a live background refresh');
    return new Promise(resolve => { release = resolve; });
  });
  await Promise.resolve();
  assert.equal(cache.readResource(key('courses')).data[0], 'Maths');
  release(['Physics']);
  await request;
  assert.equal(cache.readResource(key('courses')).data[0], 'Physics');
  assert.equal(cache.savedDataTimestamp(), 0, 'fresh response removes the saved-data notice');
  await cache.refreshResource(key('courses'), async () => { throw Error('offline'); });
  assert.equal(coldCache().readResource(key('courses')).data[0], 'Physics', 'failures never replace successful disk data');
  const pending = cache.refreshResource(key('courses'), async () => new Promise(resolve => { release = resolve; }));
  await Promise.resolve();
  cache.clearResourceCache();
  release(['old private data']);
  await pending;
  assert.equal(coldCache().readResource(key('courses')).data, undefined, 'late responses cannot recreate logged-out disk data');
  unsubscribe();
  console.log('Cold-start persistence checks passed: immediate restoration, freshness, bounds, failure retention and lifecycle isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });

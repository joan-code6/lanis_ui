const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('src/utils/timetableRefresh.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { createTimetableRefreshTracker } = loaded.exports;

const tracker = createTimetableRefreshTracker();
assert.equal(tracker.shouldRefresh(0), false);

// An explicit refresh remains pending while its request is aborted and replaced.
assert.equal(tracker.shouldRefresh(1), true);
assert.equal(tracker.shouldRefresh(1), true);
tracker.markSuccessful(1);
assert.equal(tracker.shouldRefresh(1), false);

// A failed request also remains pending until a successful response is recorded.
const retryTracker = createTimetableRefreshTracker();
assert.equal(retryTracker.shouldRefresh(1), true);
assert.equal(retryTracker.shouldRefresh(1), true);
retryTracker.markSuccessful(1);
assert.equal(retryTracker.shouldRefresh(1), false);

// An older response cannot clear a newer pending refresh.
assert.equal(retryTracker.shouldRefresh(3), true);
retryTracker.markSuccessful(2);
assert.equal(retryTracker.shouldRefresh(3), true);
retryTracker.markSuccessful(3);
assert.equal(retryTracker.shouldRefresh(3), false);

console.log('Timetable refresh checks passed: initial load, aborted replacement, retry, and monotonic completion.');

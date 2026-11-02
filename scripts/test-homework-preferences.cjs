const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('src/utils/homeworkPreferences.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { normalizeHideCompletedHomework } = loaded.exports;

assert.equal(normalizeHideCompletedHomework(), false);
assert.equal(normalizeHideCompletedHomework({ completed_display: 'orange' }), false);
assert.equal(normalizeHideCompletedHomework({ completed_display: 'green' }), false);
assert.equal(normalizeHideCompletedHomework({ completed_display: 'hidden' }), true);
assert.equal(normalizeHideCompletedHomework({ hide_completed_in_overview: false, completed_display: 'hidden' }), false);
assert.equal(normalizeHideCompletedHomework({ hide_completed_in_overview: true, completed_display: 'orange' }), true);

console.log('Homework preference checks passed: default unchecked and legacy migration.');

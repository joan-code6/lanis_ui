const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync('src/utils/formatDuration.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const { formatDuration } = context.exports;
for (const [seconds, expected] of [
  [0, '0 Minuten'], [15, '0 Minuten'], [60, '1 Minute'],
  [3599, '59 Minuten'], [3600, '1 Stunde'], [3660, '1 Stunde 1 Minute'],
  [955 * 60, '15 Stunden 55 Minuten'], [86400, '1 Tag'],
  [90060, '1 Tag 1 Stunde 1 Minute'], [172800, '2 Tage'],
  [-60, '0 Minuten'], [NaN, 'Unbekannt'],
]) assert.equal(formatDuration(seconds), expected);
console.log('Incident duration formatting checks passed');

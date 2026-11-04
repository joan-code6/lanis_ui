const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/timetableFocus.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { module: loaded, exports: loaded.exports });
const { focusedTimetableEntry: focus } = loaded.exports;
const entry = (subject, start_time, end_time, extra = {}) => ({ lesson: { subject, start_time, end_time, ...extra } });
const morning = entry('Morning', '08:00', '09:30');
const cancelled = entry('Cancelled', '09:30', '10:00', { cancelled: true });
const exam = { ...entry('Exam', '10:00', '11:30'), exam: { id: 'exam' } };
const tomorrow = entry('Tomorrow', '08:00', '08:45');
const days = new Map([
  ['2026-11-05', [tomorrow]], // Selection must not rely on input order.
  ['2026-11-04', [exam, entry('Unknown'), cancelled, morning]],
]);
const at = time => focus(days, new Date(`2026-11-04T${time}`));
assert.equal(at('07:59').entry, morning);
assert.equal(at('07:59').status, 'next');
assert.equal(at('08:00').status, 'current');
assert.equal(at('09:29:59').entry, morning);
assert.equal(at('09:30').entry, exam);
assert.equal(at('09:30').status, 'next');
assert.equal(at('10:00').entry, exam);
assert.equal(at('10:00').status, 'current');
assert.equal(at('11:30').entry, tomorrow);
assert.equal(at('23:59').date, '2026-11-05');
assert.equal(focus(days, new Date('2026-11-05T08:45')), undefined);
assert.equal(focus(new Map(), new Date()), undefined);
assert.equal(focus(new Map([['2026-11-04', [entry('Invalid', 'bad', '09:00'), entry('Reversed', '10:00', '09:00')]]]), new Date('2026-11-04T08:00')), undefined);
console.log('Timetable focus checks passed.');

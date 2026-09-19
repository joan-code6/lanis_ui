const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/utils/timetableExams.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { timetableEntries, examPeriods, layoutTimetableEntries } = loaded.exports;
const lesson = { subject: 'D', course_name: 'D 10B', course_id: 'book-1', period: '3–4', teacher: 'RK', room: 'A208', start_time: '09:40', end_time: '11:10' };
const exam = { id: 'exam-1', course_id: 'group-1', course_name: 'D 10B', hours: '3., 4.', type: 'Arbeit' };
const slots = [{ period: 3, start_time: '09:40', end_time: '10:25' }, { period: 4, start_time: '10:25', end_time: '11:10' }];
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(examPeriods('3.–4. Stunde')), [3, 4]);
assert.deepEqual(plain(examPeriods('Abgabe bis 23:59 Uhr')), []);
assert.deepEqual(plain(examPeriods('4–3')), []);
let rows = timetableEntries([{ subject: 'PW', period: '1–2' }, lesson, { subject: 'L', period: '5–6' }], [exam]);
assert.equal(rows.length, 3);
assert.equal(rows[1].exam.id, 'exam-1');
assert.equal(rows[1].lesson.course_id, 'book-1');
assert.equal(rows[1].lesson.start_time, '09:40');
assert.equal(rows[1].lesson.end_time, '11:10');
assert.deepEqual(plain(rows[1].replaced), []);
rows = timetableEntries([lesson], [{ ...exam, course_name: 'Mathematik 10B' }], slots);
assert.equal(rows.length, 1);
assert.deepEqual(plain(rows[0].replaced), ['D 10B']);
assert.equal(rows[0].lesson.room, undefined);
assert.equal(rows[0].lesson.start_time, '09:40');
rows = timetableEntries([lesson], [{ ...exam, hours: '3.' }], slots);
assert.equal(rows.length, 2);
assert.equal(rows[0].lesson.period, 3);
assert.equal(rows[0].lesson.end_time, '10:25');
assert.equal(rows[1].lesson.period, 4);
assert.equal(rows[1].lesson.start_time, '10:25');
assert.equal(rows[1].exam, undefined);
rows = timetableEntries([lesson], [{ ...exam, hours: null }], slots);
assert.equal(rows.length, 2);
assert.equal(rows[0].lesson, lesson);
assert.equal(rows[1].lesson.period, undefined);
rows = timetableEntries([], [exam], slots);
assert.equal(rows.length, 1);
assert.equal(rows[0].lesson.start_time, '09:40');
rows = timetableEntries([lesson], [exam, { ...exam, id: 'exam-2' }], slots);
assert.equal(rows.length, 2);
assert.ok(rows.every(row => row.exam));
assert.equal(lesson.period, '3–4');
// Replacement boundaries remain available without a time-slot table.
const replacement = { ...exam, course_name: 'Geschichte 10B' };
rows = timetableEntries([lesson], [replacement]);
assert.equal(rows[0].lesson.start_time, '09:40');
assert.equal(rows[0].lesson.end_time, '11:10');
for (const field of ['teacher', 'room', 'course_id', 'course_name']) {
  assert.equal(rows[0].lesson[field], undefined);
}
// Use each edge independently across different overlapping lessons.
rows = timetableEntries([
  { ...lesson, period: 3, end_time: '10:25' },
  { ...lesson, period: 4, start_time: '10:25' },
], [replacement]);
assert.equal(rows[0].lesson.start_time, '09:40');
assert.equal(rows[0].lesson.end_time, '11:10');
// Do not infer an unknown boundary within a double lesson.
rows = timetableEntries([lesson], [{ ...replacement, hours: '3.' }]);
assert.equal(rows[0].lesson.start_time, '09:40');
assert.equal(rows[0].lesson.end_time, undefined);
rows = timetableEntries([lesson], [replacement], [
  { period: 3, start_time: '09:45', end_time: '10:30' },
  { period: 4, start_time: '10:30', end_time: '11:15' },
]);
assert.equal(rows[0].lesson.start_time, '09:45');
assert.equal(rows[0].lesson.end_time, '11:15');
const compactLayout = layoutTimetableEntries([
  { lesson: { subject: 'long', period: '1–2', duration: 2 } },
  { lesson: { subject: 'short', period: 1 } },
  { lesson: { subject: 'starts-later', period: 2 } },
  { exam: { ...exam, id: 'unscheduled' }, lesson: { subject: 'Exam without period' } },
]);
assert.equal(compactLayout.scheduled.length, 3);
assert.equal(compactLayout.unscheduled.length, 1);
assert.ok(compactLayout.scheduled.some(item => item.entry.lesson.subject === 'starts-later'));
assert.ok(compactLayout.scheduled.every(item => item.laneCount === 2));
console.log('Timetable exam checks passed: merging, replacement, ordering, partial overlap, unknown periods, empty days, and concurrent exams.');

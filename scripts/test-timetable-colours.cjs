const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync('src/utils/timetableColours.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const {
  contrastingTextColour,
  defaultTimetableClassColours,
  timetableClassColour,
  timetableClassKey,
} = loaded.exports;

const lessons = Array.from({ length: 12 }, (_, index) => ({
  subject: `Fach ${index}`,
  course_id: `course-${index}`,
}));
const defaults = defaultTimetableClassColours(lessons);

assert.equal(Object.keys(defaults).length, lessons.length);
assert.equal(new Set(Object.values(defaults)).size, lessons.length);
assert.deepEqual(defaultTimetableClassColours([...lessons].reverse()), defaults);
const reportedCollisionLessons = [
  { subject: 'Fach 133', course_id: '133' },
  { subject: 'Fach 241', course_id: '241' },
];
const reportedCollisionColours = defaultTimetableClassColours(reportedCollisionLessons);
assert.notEqual(reportedCollisionColours[timetableClassKey(reportedCollisionLessons[0])], reportedCollisionColours[timetableClassKey(reportedCollisionLessons[1])]);
assert.equal(timetableClassKey({ subject: ' Mathematik ' }), 'subject:mathematik');
assert.equal(timetableClassKey({ subject: 'Mathematik', course_id: ' COURSE-1 ' }), 'course:course-1');
assert.equal(timetableClassKey({ subject: 'Mathematik', course_name: ' LK Mathematik ' }), 'course-name:lk mathematik');
assert.equal(
  JSON.stringify(defaultTimetableClassColours(lessons.slice(0, 4))),
  JSON.stringify(Object.fromEntries(lessons.slice(0, 4).map(lesson => [timetableClassKey(lesson), defaults[timetableClassKey(lesson)]]))),
);
assert.equal(
  timetableClassColour(lessons[0], defaults, { [timetableClassKey(lessons[0])]: '#abcdef' }),
  '#abcdef',
);
assert.equal(contrastingTextColour('#ffffff'), '#111827');
assert.equal(contrastingTextColour('#111827'), '#ffffff');
assert.equal(contrastingTextColour('#00ff00'), '#111827');

console.log('Timetable colour checks passed: unique defaults, stable keys, overrides, and contrast.');

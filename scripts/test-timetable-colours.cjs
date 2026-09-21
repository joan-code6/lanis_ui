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
assert.equal(timetableClassKey({ subject: ' Mathematik ' }), 'subject:mathematik');
assert.equal(timetableClassKey({ subject: 'Mathematik', course_id: ' COURSE-1 ' }), 'course:course-1');
assert.equal(
  timetableClassColour(lessons[0], defaults, { [timetableClassKey(lessons[0])]: '#abcdef' }),
  '#abcdef',
);
assert.equal(contrastingTextColour('#ffffff'), '#111827');
assert.equal(contrastingTextColour('#111827'), '#ffffff');

console.log('Timetable colour checks passed: unique defaults, stable keys, overrides, and contrast.');

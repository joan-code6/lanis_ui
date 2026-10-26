const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/utils/courseOverview.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { getOverviewCourses } = loaded.exports;
const folders = Array.from({ length: 13 }, (_, i) => ({
  book_id: String(i), name: `Course ${i}`, course_link: `?a=sus_view&id=${i}`,
  teacher_full_name: 'Teacher', teacher_short: 'T',
}));
const overview = { success: true, entries: [], entry_count: 0, courses: folders };
const courses = getOverviewCourses(overview);
assert.equal(courses.length, 13, 'all folders remain visible without recent lessons');
assert.equal(courses[0].book_id, '0');
assert.equal(courses[0].homework, '');
const latest = { ...courses[0], entry_id: null, name: '', homework: 'Read chapter 2', homework_done: true };
const mixed = getOverviewCourses({ ...overview, entries: [latest, { ...latest, homework: 'Older' }] });
assert.equal(mixed.length, 13);
assert.equal(mixed[0].name, 'Course 0');
assert.equal(mixed[0].homework, 'Read chapter 2');
assert.equal(mixed[0].homework_done, true);
const legacy = getOverviewCourses({ success: true, entries: [latest, latest], entry_count: 2 });
assert.equal(legacy.length, 1, 'old API responses still work and duplicate courses collapse');
assert.equal(getOverviewCourses({ ...overview, courses: [] }).length, 0);
console.log('Course overview checks passed: 13 inactive folders, lesson metadata, deduplication, legacy API, empty account.');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const compiled = ts.transpileModule(fs.readFileSync(`src/utils/${name}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: path => load(path.replace('./', '')) });
  return loaded.exports;
}
const { dsbSubstitutions, nativeSubstitutions, applySubstitutions, classTokens } = load('timetableSubstitutions');
const plain = value => JSON.parse(JSON.stringify(value));
const lesson = { id: 'test', subject: 'D', teacher: 'AB', room: 'A1', period: '3–4', duration: 2, homework: [{ text: 'Read' }], course_id: 'book' };
const day = { date: '2026-09-09', lessons: [lesson] };
const slots = [{ period: 3, start_time: '09:40', end_time: '10:25' }, { period: 4, start_time: '10:25', end_time: '11:10' }];
const native = fields => nativeSubstitutions({ days: [{ date: day.date, substitutions: [{ klasse: '10B', stunde: '3', fach: 'Deutsch', art: 'Entfall', ...fields }] }] });
let result = applySubstitutions([day], native({}), '10B', slots)[0];
assert.equal(result.lessons.length, 2);
assert.equal(result.lessons[0].cancelled, true);
assert.equal(result.lessons[1].cancelled, undefined);
assert.equal(result.lessons[0].end_time, '10:25');
assert.equal(result.lessons[1].start_time, '10:25');
assert.equal(result.lessons[0].course_id, 'book');
assert.notEqual(result.lessons[0].id, result.lessons[1].id);
assert.equal(lesson.cancelled, undefined);
assert.deepEqual(plain(classTokens('05A, Q1/Q2')), ['5a', 'q1', 'q2']);
assert.equal(applySubstitutions([day], native({ klasse: '10BB' }), '10B')[0].lessons[0], lesson);
assert.equal(applySubstitutions([{ ...day, date: '2026-09-16' }], native({}), '10B')[0].lessons[0], lesson);
result = applySubstitutions([day], native({ fach_alt: 'Deutsch', fach: 'Mathe', vertreterkuerzel: 'CD', raum: 'B2', art: 'Vertretung' }), '10B')[0];
assert.equal(result.lessons[0].subject, 'Mathe');
assert.equal(result.lessons[0].teacher, 'CD');
assert.equal(result.lessons[0].room, 'B2');
assert.equal(result.lessons[0].original_lesson.subject, 'D');
result = applySubstitutions([{ ...day, lessons: [lesson, { ...lesson, id: 'parallel' }] }], native({}), '10B')[0];
assert.equal(result.substitutionNotices.length, 1);
assert.ok(result.lessons.every(item => !item.cancelled));
result = applySubstitutions([day], [...native({}), ...native({ art: 'Raumwechsel', raum: 'B2' })], '10B')[0];
assert.equal(result.substitutionNotices.length, 2);
assert.ok(result.lessons.every(item => !item.cancelled));
result = applySubstitutions([day], [...native({}), ...native({})], '10B')[0];
assert.equal(result.lessons[0].cancelled, true);
result = applySubstitutions([{ ...day, lessons: [{ ...lesson, period: 3, duration: 1 }, { ...lesson, period: 4, duration: 1 }] }], native({ stunde: '3 - 4' }), '10B')[0];
assert.ok(result.lessons.every(item => item.cancelled));
result = applySubstitutions([day], native({ klasse: 'Q1/Q2' }), 'Q1')[0];
assert.equal(result.lessons[0], lesson);
assert.equal(result.substitutionNotices.length, 1);
result = applySubstitutions([{ ...day, lessons: [lesson, { ...lesson, id: 'parallel', period: 4, duration: 1 }] }], native({ stunde: '3 - 4' }), '10B')[0];
assert.equal(result.lessons[0].cancelled, true);
assert.ok(result.lessons.filter(item => item.period === 4).every(item => !item.cancelled), 'Ambiguous period must stay unchanged even when another period matches');
const tables = [{ date: day.date, headers: ['Klasse(n)', 'Stunde', 'Art', 'Vertreter', 'Fach', 'Raum'], rows: [['05A', '3 - 4', 'Vertretung', 'Fr. Alt →Hr. Neu', 'Deutsch →Kunst', 'A1 →B2']] }];
const parsed = dsbSubstitutions(tables);
assert.equal(parsed[0].oldSubject, 'Deutsch');
assert.equal(parsed[0].teacher, 'Hr. Neu');
assert.equal(parsed[0].room, 'B2');
assert.equal(dsbSubstitutions([{ ...tables[0], date: null }]).length, 0);
// Optional private live captures: never copy school data or credentials into fixtures.
if (process.env.LANIS_LIVE_DSB && process.env.LANIS_LIVE_TIMETABLE) {
  const dsb = JSON.parse(fs.readFileSync(process.env.LANIS_LIVE_DSB));
  const timetable = JSON.parse(fs.readFileSync(process.env.LANIS_LIVE_TIMETABLE));
  assert.equal(dsb.success, true);
  assert.equal(timetable.success, true);
  const changes = dsbSubstitutions(dsb.tables);
  assert.equal(changes.length, dsb.tables.filter(table => table.date && table.headers.length).reduce((n, table) => n + table.rows.length, 0));
  const special = changes.find(item => item.classes === '10B' && item.date === '2026-09-09' && item.periods.includes(3));
  assert.ok(special, 'Expected real 10B special lesson');
  const lessons = timetable.plan_for_own[2].map(item => ({ subject: item.name, teacher: item.teacher, room: item.room, period: item.stunde, duration: item.duration }));
  const live = applySubstitutions([{ date: special.date, lessons }], changes, '10B')[0];
  const changed = live.lessons.find(item => item.period === 3);
  assert.equal(changed.substitution.kind, 'Sondereins.');
  assert.equal(changed.subject, 'Klassenstunde');
  assert.equal(changed.teacher, special.teacher);
  assert.ok(live.lessons.some(item => item.period === 4 && !item.substitution), 'Second half must remain unchanged');
  console.log(`Live DSB: ${changes.length} rows parsed; real timetable special lesson and unaffected second half verified.`);
}
console.log('Timetable substitution tests passed.');

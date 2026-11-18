const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/utils/search.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { searchText, searchScore, rankSearchResults, messageSearchData, compactSearchResults } = loaded.exports;
assert(searchText('  MÜLLER   mathe ', { name: 'Mathematik', teacher: 'Müller' }));
assert(searchText('mueller', 'Müller'));
assert(searchText('strasse', 'Straße'));
assert(searchText('vertretung', 'Vertretungsplan'));
assert(searchText('kalnder', 'Kalender'));
assert(searchText('kalneder', 'Kalender'));
assert(searchText('mathe', '<b>Mathematik</b>'));
assert(!searchText('   ', 'Kalender'));
assert(!searchText('xyz', 'Kalender'));
assert(!searchText('ab', 'ac'));
assert(!searchText('mathe mueller', { name: 'Mathematik', teacher: 'Schmidt' }));
assert(!searchText('kalxxxx', 'Kalender'));
assert(searchScore('kalender', 'Kalender') > searchScore('kalender', 'Kalender Übersicht'));
assert(searchScore('kalender', 'Kalender Übersicht') > searchScore('kalender', 'Zum Kalender'));
assert(searchScore('kalender', 'Zum Kalender') > searchScore('kalender', 'Kalnder'));
const item = (id, title, category = 'Nachrichten', href = '/messages?conversation=1', subtitle = '') => ({ id, title, category, href, subtitle });
const cached = item('msg-1', 'Mathematik');
const live = item('api-msg-1', 'Mathematik');
const semantic = item('sem-msg-1', 'Mathematik');
assert.equal(rankSearchResults('mathe', [cached, live], [semantic]).length, 1);
assert.equal(rankSearchResults('mathe', [cached, item('api-msg-2', 'Mathematik', 'Nachrichten', '/messages?conversation=2')], []).length, 2);
assert.equal(rankSearchResults('mathe', [item('course-1', 'Mathematik', 'Unterricht', '/courses/1')], [item('sem-crs-1', 'Mathematik', 'Unterricht', '/courses/1')]).length, 1);
assert.equal(rankSearchResults('mathe', [item('api-exam-1', 'Mathematik', 'Lerngruppen', '/study-groups'), item('api-exam-2', 'Mathematik', 'Lerngruppen', '/study-groups')], []).length, 2);
assert.equal(rankSearchResults('mathe', [cached], [item('sem-msg-1', 'Updated subject')]).length, 1);
const ranked = rankSearchResults('kalender', [item('a', 'Kalender Übersicht', 'Kalender', '/calendar', 'Kalender'), item('b', 'Kalender', 'Kalender', '/calendar')], [item('sem-ev-1', 'Ähnlicher Termin', 'Kalender', '/calendar?event=1')]);
assert.equal(ranked[0].id, 'b');
assert.equal(ranked.at(-1).id, 'sem-ev-1');


assert(!searchText('hkpu', { Betreff: 'API Test', Sender: '1724128', Uniquid: 'hkpu', url: '/hkpu' }));
assert(!searchText('1724128', messageSearchData({ Betreff: 'API Test', Sender: '1724128', SenderName: '1724128' })));
assert(!searchText('1235', 'Raum 1234'), 'numeric codes must not receive typo correction');
assert(!searchText('hkpu', 'hkpa'), 'four-letter identifiers must stay exact');
assert(searchText('mueller', messageSearchData({ Sender: '1724128' }, { '1724128': 'Müller' })));
assert.equal(messageSearchData({ Sender: '1724128', SenderName: '1724128' }).sender, '');
assert.equal(messageSearchData({ Sender: '1724128', SenderName: '1724128' }, { '1724128': 'Known Person' }).sender, 'Known Person');
const many = Array.from({ length: 20 }, (_, i) => item(`msg-${i}`, `Test ${i}`));
assert.equal(compactSearchResults(many).length, 3);
assert.equal(compactSearchResults(many, true).length, 20);
const mixed = many.map((entry, i) => ({ ...entry, category: `Category ${i % 4}` }));
assert.equal(compactSearchResults(mixed).length, 8);
assert(compactSearchResults(mixed).every(entry => mixed.includes(entry)));

assert.equal(messageSearchData({ SenderName: '<span>1724128</span>' }).sender, '');
console.log('Global search checks passed: matching, identifiers, sender resolution, deduplication, and compact results.');

assert(searchText('aktuel', 'Aktuelles'));
assert(searchText('elle', 'Aktuelle'));
assert(searchText('mull', 'Mueller'));
assert(searchText('muell', 'Müller'));
assert(!searchText('hessen', { name: 'Mathematik', course_link: 'https://hessen.example/courses' }));
assert(!searchText('courses', { teacherMessageLink: '/courses/messages', target: '/courses' }));
assert(!searchText('hessen', { arbitrary: ' HTTPS://hessen.example/courses' }));
assert(searchText('hessen', { name: 'Hessen' }));

assert(searchText('Treffpunkt', { content: 'https://schule.example/plan Treffpunkt Aula' }));
assert(searchText('Aula', { content: 'Treffpunkt https://schule.example/plan Aula' }));
assert(!searchText('schule', { content: 'https://schule.example/plan Treffpunkt Aula' }));
assert(!searchText('schule', 'https://schule.example/plan'));

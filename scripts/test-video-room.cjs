const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const code = ts.transpileModule(fs.readFileSync('src/components/videokonferenz/Videokonferenz.tsx', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true},
}).outputText;
let basePath = '';
const context = {exports: {}, URL, require(name) {
  if (name === 'react') return React;
  if (name === 'react-router-dom') return {Link: ({to, children, ...props}) => React.createElement('a', {...props, href: to}, children)};
  if (name.endsWith('/BasePathContext')) return {useBasePath: () => basePath};
  if (name === '@heroicons/react/24/outline') return new Proxy({}, {get: () => () => null});
  return {};
}};
vm.runInNewContext(code, context);
const room = {id: '1', name: 'Room', teachers: [], status: 'open', can_join: true,
  join_url: 'https://example.edu/join', links: [
    {label: 'Link öffnen', url: 'https://start.schulportal.hessen.de/meinunterricht.php?a=sus_view&id=123'},
    {label: 'Raumregeln', url: 'https://example.edu/rules'},
  ]};
function render(statusLive, joinUrl = room.join_url, overrides = {}) {
  return renderToStaticMarkup(React.createElement(context.exports.RoomCard, {room: {...room, join_url: joinUrl, ...overrides}, statusLive}));
}
assert.match(render(true), /href="https:\/\/example.edu\/join"/);
assert.match(render(true), /rel="noopener noreferrer"/);
assert.match(render(false), /href="\/courses\/123"/);
assert.doesNotMatch(render(false), /href="https:/);
assert.match(render(false), /Status unbekannt/);
assert.doesNotMatch(render(true, 'javascript:alert(1)'), /href="https:/);
assert.doesNotMatch(render(true, 'https://user:pass@example.edu/join'), /href="https:/);
for (const status of ['waiting', 'closed', 'unknown']) {
  // Course navigation remains useful; stale join data must not expose a call.
  const html = render(true, room.join_url, {status, can_join: true});
  assert.match(html, /href="\/courses\/123"/);
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.doesNotMatch(html, /Raum betreten|href="https:/);
}
assert.doesNotMatch(render(true, room.join_url, {can_join: false}), /Raum betreten|href="https:/);
assert.equal((render(true).match(/<a /g) || []).length, 2);
assert.match(render(true), /<h2[^>]*><a [^>]*href="\/courses\/123">Room<\/a><\/h2>/);
assert.doesNotMatch(render(true), /meinunterricht\.php|Link öffnen|Raumregeln/);
basePath = '/demo';
assert.match(render(false), /href="\/demo\/courses\/123"/);
basePath = '';
for (const url of [
  'https://evil.example/meinunterricht.php?a=sus_view&id=123',
  'https://start.schulportal.hessen.de/meinunterricht.php?a=delete&id=123',
  'https://start.schulportal.hessen.de/meinunterricht.php?a=sus_view&id=123&id=456',
  'https://start.schulportal.hessen.de/meinunterricht.php?a=sus_view&id=../123',
  'https://user:secret@start.schulportal.hessen.de/meinunterricht.php?a=sus_view&id=123',
]) {
  assert.doesNotMatch(render(false, null, {links: [{label: 'Link öffnen', url}]}), /href=/);
}
assert.doesNotMatch(render(false, null, {links: []}), /href=/);
console.log('Video course navigation and join availability checks passed');

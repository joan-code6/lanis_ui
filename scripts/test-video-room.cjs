const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const code = ts.transpileModule(fs.readFileSync('src/components/videokonferenz/Videokonferenz.tsx', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true},
}).outputText;
const context = {exports: {}, URL, require(name) {
  if (name === 'react') return React;
  if (name === '@heroicons/react/24/outline') return new Proxy({}, {get: () => () => null});
  return {};
}};
vm.runInNewContext(code, context);
const room = {id: '1', name: 'Room', teachers: [], status: 'open', can_join: true,
  join_url: 'https://example.edu/join', links: []};
function render(statusLive, joinUrl = room.join_url) {
  return renderToStaticMarkup(React.createElement(context.exports.RoomCard, {room: {...room, join_url: joinUrl}, statusLive}));
}
assert.match(render(true), /href="https:\/\/example.edu\/join"/);
assert.match(render(true), /rel="noopener noreferrer"/);
assert.doesNotMatch(render(false), /href=/);
assert.match(render(false), /Status unbekannt/);
assert.doesNotMatch(render(true, 'javascript:alert(1)'), /href=/);
assert.doesNotMatch(render(true, 'https://user:pass@example.edu/join'), /href=/);
console.log('Video join availability checks passed');

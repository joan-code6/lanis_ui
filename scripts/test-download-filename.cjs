const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync('src/utils/downloadFilename.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const { downloadFilename } = context.exports;
for (const [header, expected] of [
  [undefined, null],
  ['attachment', null],
  ["attachment; filename*=UTF-8''Pers%C3%B6nliche%20Datei.pdf", 'Persönliche Datei.pdf'],
  ['attachment; filename="brief.pdf"', 'brief.pdf'],
  ['attachment; filename="brief;neu.pdf"', 'brief;neu.pdf'],
  ['attachment; filename=brief.pdf', 'brief.pdf'],
  ["attachment; filename*=UTF-8''%invalid; filename=fallback.pdf", 'fallback.pdf'],
  ['attachment; filename="../../brief.pdf"', 'brief.pdf'],
  ["attachment; filename*=UTF-8''brief%0D%0A.pdf", 'brief.pdf'],
]) assert.equal(downloadFilename(header), expected);
console.log('9 download filename checks passed');

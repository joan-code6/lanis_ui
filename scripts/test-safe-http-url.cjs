const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync('src/utils/safeHttpUrl.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {}, URL };
vm.runInNewContext(code, context);
const { safeHttpUrl } = context.exports;
for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd',
  '//example.edu', '/relative', 'https://user:pass@example.edu', 'invalid', null]) {
  assert.equal(safeHttpUrl(value), null);
}
assert.equal(safeHttpUrl('https://example.edu/help'), 'https://example.edu/help');
assert.equal(safeHttpUrl('http://example.edu/help'), 'http://example.edu/help');
console.log('Safe distribution link checks passed');

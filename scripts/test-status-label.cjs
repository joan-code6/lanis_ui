const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const service = { exports: {}, require: () => ({}) };
vm.runInNewContext(compile('src/services/publicStatus.ts'), service);
const label = { exports: {}, require: () => service.exports };
vm.runInNewContext(compile('src/services/statusLabel.ts'), label);
const { observationLabel } = label.exports;
assert.equal(observationLabel({ status: 'unknown', error: 'rate_limited', status_code: 429 }), 'Anfragelimit (HTTP 429)');
assert.equal(observationLabel({ status: 'unknown', status_code: 429 }), 'Anfragelimit (HTTP 429)');
assert.equal(observationLabel({ status: 'unknown', error: 'rate_limited', status_code: 503 }), 'Prüfung pausiert (HTTP 503)');
assert.equal(observationLabel({ status: 'unknown', error: 'rate_limited' }), 'Anfragelimit');
assert.equal(observationLabel({ status: 'unknown', error: 'access_denied', status_code: 403 }), 'Zugriff verweigert (HTTP 403)');
assert.equal(observationLabel({ status: 'unknown', error: 'private upstream text', status_code: '429' }), 'Unbekannt');
assert.equal(observationLabel({ status: 'up' }), 'Erreichbar');
assert.equal(observationLabel({ status: 'down' }), 'Nicht erreichbar');
console.log('Status labels passed: actual HTTP codes, missing codes, unknown errors and ordinary states.');

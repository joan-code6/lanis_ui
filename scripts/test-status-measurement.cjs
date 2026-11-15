const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync('src/services/statusMeasurement.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const { getMeasurementNotice } = context.exports;

assert.equal(getMeasurementNotice(null), null);
for (const status of ['up', 'down', 'degraded']) {
  assert.equal(getMeasurementNotice({ status, error: 'rate_limited' }), null,
    'Measurement notices must not override a confirmed service state');
}
const limited = getMeasurementNotice({ status: 'unknown', error: 'rate_limited' });
assert.equal(limited.title, 'Prüfung durch Anfragelimit pausiert');
assert.match(limited.description, /keinen Ausfall und keine Wiederherstellung/);
assert.doesNotMatch(limited.description, /\d+ (Sekunden|Minuten)/,
  'Public status does not expose a cooldown deadline; do not invent one');
const staleLimited = getMeasurementNotice({ status: 'unknown', error: 'rate_limited' }, true);
assert.match(staleLimited.title, /Letzte Prüfung/);
assert.match(staleLimited.description, /kein aktuelles Prüfergebnis/);
assert.doesNotMatch(staleLimited.description, /pausiert|wiederholt/,
  'An old rate limit does not establish that a cooldown is still active');
assert.equal(getMeasurementNotice({ status: 'up' }, true).title, 'Keine aktuelle Messung');
assert.equal(getMeasurementNotice({ status: 'unknown', error: 'access_denied' }).title, 'Statusprüfung ohne Zugriff');
assert.equal(getMeasurementNotice({ status: 'unknown', error: 'request_budget_exhausted' }).title, 'Statusprüfung unvollständig');
const unknown = getMeasurementNotice({ status: 'unknown', error: 'private upstream account@example.org' });
assert.equal(unknown.title, 'Kein verlässliches Prüfergebnis');
assert.doesNotMatch(JSON.stringify(unknown), /private|account@example/);
console.log('Status measurement notices passed: throttling, stale results, access, request budget, unknown errors and confirmed states.');

// Freshness can expire while a page is open even when the server's stale flag
// was false. In particular, an old throttling result must not promise a current pause.
const serviceCode = ts.transpileModule(fs.readFileSync('src/services/publicStatus.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const serviceContext = { exports: {}, require: () => ({}) };
vm.runInNewContext(serviceCode, serviceContext);
const { freshStatus, isStatusStale } = serviceContext.exports;
const statusData = {
  current: { status: 'unknown', error: 'rate_limited', checked_at: new Date(Date.now() - 601_000).toISOString(), stale: false },
  measurement: { stale_after_seconds: 600 },
};
assert.equal(isStatusStale(statusData), true);
assert.match(getMeasurementNotice(statusData.current, isStatusStale(statusData)).title, /Letzte Prüfung/);
statusData.current = { ...statusData.current, status: 'up', checked_at: new Date().toISOString() };
assert.equal(freshStatus(statusData), 'up');
assert.equal(getMeasurementNotice(statusData.current, isStatusStale(statusData)), null);
statusData.current.checked_at = 'invalid';
assert.equal(freshStatus(statusData), 'unknown');
assert.equal(isStatusStale(statusData), true);

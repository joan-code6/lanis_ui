// Run against the dev server: STATUS_UI_URL=http://127.0.0.1:5193 node scripts/status-smoke.mjs
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN, args: ['--no-sandbox'] });
const origin = process.env.STATUS_UI_URL || 'http://127.0.0.1:5193';
let mode = 'up';
const now = new Date().toISOString();
const stats = { checks: 10, available_checks: 9, failed_checks: 1, unknown_checks: 0, uptime_percent: 90, coverage_percent: 50 };
const makeStatus = () => ({ success: true, service: 'Schulportal Hessen', generated_at: now,
  current: { status: mode === 'stale' ? 'down' : mode, checked_at: now, stale: mode === 'stale', features: [] },
  summary: { ...stats, period_days: 90 },
  daily: Array.from({ length: 90 }, (_, i) => ({ ...stats, day: new Date(Date.now() - (89 - i) * 86400000).toISOString().slice(0, 10), status: i % 9 === 0 ? 'down' : 'up' })),
  incidents: [{ checked_at: now, status: 'down', features: [] }],
  measurement: { interval_seconds: 900, stale_after_seconds: 1800, period_start: now, period_end: now, description: 'Regelmäßige Prüfungen von Anmeldung und Modulen.' } });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().endsWith('/status') && request.resourceType() === 'fetch') {
      void request.respond({ status: mode === 'error' ? 503 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(makeStatus()) });
    } else void request.continue();
  });
  for (const width of [375, 1440]) {
    await page.setViewport({ width, height: 950 });
    await page.goto(`${origin}/status`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('select option:nth-child(2)');
    assert.match(await page.$eval('main', el => el.textContent), /90 %/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.select('select', await page.$eval('select option:nth-child(2)', el => el.value));
    assert.match(await page.$eval('[role=status]', el => el.textContent), /Messabdeckung/);
    await page.screenshot({ path: `/tmp/lanis-status-${width}.png`, fullPage: true });
  }
  for (const state of ['down', 'stale', 'error']) {
    mode = state;
    await page.goto(`${origin}/status`, { waitUntil: 'networkidle0' });
    const text = await page.$eval('main', el => el.textContent);
    assert.match(text, state === 'down' ? /Nicht erreichbar/ : state === 'stale' ? /keine ausreichend aktuelle/ : /kein Schulportal-Ausfall/);
  }
  mode = 'up';
  await page.goto(origin, { waitUntil: 'networkidle0' });
  assert.match(await page.$eval('body', el => el.textContent), /Deine geladenen Daten bleiben da/);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.goto(`${origin}/status`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/lanis-status-dark.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Status smoke passed: desktop/mobile, history selection, fresh/down/stale/unavailable, homepage, no runtime errors.');
} finally { await browser.close(); }

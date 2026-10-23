// Run against the dev server: STATUS_UI_URL=http://127.0.0.1:5193 node scripts/status-smoke.mjs
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
if (!process.env.CHROME_BIN) throw new Error('Set CHROME_BIN to an installed Chrome executable for this manual smoke check.');
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN, args: ['--no-sandbox'] });
const origin = process.env.STATUS_UI_URL || 'http://127.0.0.1:5193';
let mode = 'up';
const now = new Date().toISOString();
const stats = { checks: 10, available_checks: 9, failed_checks: 1, unknown_checks: 0, uptime_percent: 90, coverage_percent: 50 };
const makeStatus = () => ({ success: true, service: 'Schulportal Hessen', generated_at: now,
  current: { status: mode === 'stale' ? 'down' : mode, checked_at: now, stale: mode === 'stale', features: [] },
  summary: { ...stats, period_days: 90 },
  summary_windows: Object.fromEntries(['24h', '7d', '30d', '90d'].map(key => [key, { ...stats, period_days: 1 }])),
  history_windows: Object.fromEntries([['24h', 48, 1800000], ['7d', 28, 21600000]].map(([key, count, width]) => [key, Array.from({ length: count }, (_, index) => ({ ...stats, start: new Date(Date.now() - (count - index) * width).toISOString(), end: new Date(Date.now() - (count - index - 1) * width).toISOString(), status: index === count - 2 ? 'degraded' : index === 0 ? 'unknown' : 'up' }))])),
  daily: Array.from({ length: 90 }, (_, i) => ({ ...stats, day: new Date(Date.now() - (89 - i) * 86400000).toISOString().slice(0, 10), status: i % 9 === 0 ? 'down' : 'up' })),
  incidents: [{ started_at: new Date(Date.now() - 955 * 60000).toISOString(), resolved_at: now, duration_seconds: 955 * 60, status: 'down', error: 'login_failed', checks: 2690, affected_features: ['login', 'modules'] }, { checked_at: new Date(Date.now() - 4 * 3600000).toISOString(), status: 'down', checks: 7, affected_features: ['modules'] }, { started_at: now, checked_at: now, resolved_at: now, duration_seconds: 0, status: 'down', checks: 2, affected_features: ['login'] }],
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
    await page.waitForSelector('[data-status-history]');
    assert.match(await page.$eval('main', el => el.textContent), /90 %/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.$$eval('[data-status-history] > span', dots => dots.length), 90);
    for (const label of ['90 Tage', '30 Tage']) {
      await page.evaluate(label => [...document.querySelectorAll('button')].find(button => button.textContent === label).click(), label);
      const bars = await page.$$('[data-status-history] > span');
      for (const bar of bars) {
        await bar.focus();
        assert.equal(await bar.evaluate(el => {
          const tooltip = document.getElementById(el.getAttribute('aria-describedby'));
          const rect = tooltip.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth;
        }), true);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === '90 Tage').click());
    const incidentBar = await page.$('[data-status-history] > span:last-child');
    await incidentBar.focus();
    const tooltip = await incidentBar.$('[role=tooltip]');
    assert.match(await tooltip.evaluate(el => el.textContent), /2690 bestätigte Checks/);
    assert.equal(await tooltip.$$eval('code', codes => codes.length), 0);
    assert.doesNotMatch(await tooltip.evaluate(el => el.textContent), /Störung|login_failed/);
    await tooltip.screenshot({ path: `/tmp/lanis-status-tooltip-${width}.png` });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await tooltip.screenshot({ path: `/tmp/lanis-status-tooltip-dark-${width}.png` });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    for (const [label, count] of [['24 Stunden', 48], ['7 Tage', 28]]) {
      await page.evaluate(label => [...document.querySelectorAll('button')].find(button => button.textContent === label).click(), label);
      assert.equal(await page.$$eval('[data-status-history] > span', bars => bars.length), count);
      assert.equal(await page.$$eval('[data-status-history] > span.bg-amber-500', bars => bars.length), 1);
      assert.equal(await page.$$eval('[data-status-history] > span.bg-emerald-500', bars => bars.length), count - 2);
      assert.equal(await page.$$eval('[data-status-history] [role=tooltip]', tips => tips.filter(tip => tip.textContent.includes('7 bestätigte Checks')).length), 1);
      await page.focus('[data-status-history] > span');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.match(await page.$eval('main', el => el.textContent), /—.*\(0 Minuten\)/);
    assert.match(await page.$eval('main', el => el.textContent), /Bestätigte Checks: 2 · Betroffene Dienste: Anmeldung/);
    assert.match(await page.$eval('main', el => el.textContent), /15 Stunden 55 Minuten/);
    assert.doesNotMatch(await page.$eval('main', el => el.textContent), /Resolved|955 Minuten/);
    await page.screenshot({ path: `/tmp/lanis-status-${width}.png`, fullPage: true });
  }
  for (const state of ['down', 'stale', 'error']) {
    mode = state;
    await page.goto(`${origin}/status`, { waitUntil: 'networkidle0' });
    const text = await page.$eval('main', el => el.textContent);
    assert.match(text, state === 'down' ? /Nicht erreichbar/ : state === 'stale' ? /Unbekannt/ : /Status nicht verfügbar/);
  }
  mode = 'up';
  await page.goto(origin, { waitUntil: 'networkidle0' });
  assert.match(await page.$eval('body', el => el.textContent), /Deine Daten bleiben verfügbar/);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.goto(`${origin}/status`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/lanis-status-dark.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Status smoke passed: desktop/mobile, history selection, fresh/down/stale/unavailable, homepage, no runtime errors.');
} finally { await browser.close(); }

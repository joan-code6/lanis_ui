// Run against the local dev server. No SPH credentials or backend access.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const origin = process.env.CACHE_TEST_ORIGIN || 'http://127.0.0.1:5187';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser:', error.message); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url() === `${origin}/__startup-fixture`) {
        request.respond({ status: 200, contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module">import { mount } from "/scripts/startup-cache-fixture.tsx"; window.fixture = mount();</script>' });
      } else request.continue();
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    for (const width of [390, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('auth_access_token', 'fixture-token');
        localStorage.setItem('auth_user', JSON.stringify({ school_id: 'school', username: 'pupil' }));
        localStorage.setItem('__lanis_account_data_generation', '1:login');
      });
      await page.goto(`${origin}/__startup-fixture`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.querySelector('#preferences')?.textContent === 'Preferences ready');
      await page.evaluate(() => window.fixture.complete('Saved Maths lesson'));
      await page.waitForFunction(() => document.querySelector('#lesson')?.textContent === 'Saved Maths lesson');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('#lesson', el => el.textContent), 'Saved Maths lesson', 'cold reload renders saved data while all loaders are held');
      assert((await page.$eval('[role=status]', el => el.textContent)).includes('Gespeicherter Stand'));
      assert.equal(await page.$eval('#preferences', el => el.textContent), 'Preferences ready', 'no preferences network response is needed');
      await page.evaluate(() => window.fixture.fail());
      await page.waitForFunction(() => document.querySelector('#failure')?.textContent === 'Offline fixture');
      assert.equal(await page.$eval('#lesson', el => el.textContent), 'Saved Maths lesson', 'offline failure preserves the saved screen');
      await page.reload({ waitUntil: 'networkidle0' });
      await page.evaluate(() => window.fixture.complete('Fresh Physics lesson'));
      await page.waitForFunction(() => document.querySelector('#lesson')?.textContent === 'Fresh Physics lesson');
      assert.equal(await page.$('[role=status]'), null, 'fresh response clears the saved-data notice');
      await page.evaluate(() => {
        localStorage.setItem('auth_user', JSON.stringify({ school_id: 'school', username: 'other-pupil' }));
        localStorage.setItem('__lanis_account_data_generation', '2:login');
      });
      await page.reload({ waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('#lesson', el => el.textContent), 'Loading lesson', 'another account cannot restore the old screen');
      console.log(`PASS ${width}px cold reload: saved render, nonblocking preferences, offline retention, fresh replacement and account isolation`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

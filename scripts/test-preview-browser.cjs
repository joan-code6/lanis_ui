// Manual integration check: run Vite first, then BROWSER_EXECUTABLE=... node scripts/test-preview-browser.cjs.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const base = process.env.PREVIEW_TEST_URL || 'http://127.0.0.1:5179';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const token = header + '.' + Buffer.from(JSON.stringify({ sub: '123:student', jti: 'parent', impersonation_id: 'preview', exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url') + '.test';
    let exchangeCount = 0, revoked = false;
    const writes = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === base || !url.protocol.startsWith('http')) return request.continue();
      const path = url.pathname;
      let data = { success: true, data: [], modules: [], apps: [] };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      if (path === '/impersonation/exchange') {
        exchangeCount++;
        data = { access_token: token, username: 'student', school_id: '123', expires_at: Math.floor(Date.now() / 1000) + 900 };
      } else if (path === '/impersonation/end') { revoked = true; }
      else if (path === '/settings/preferences') data = { success: true, preferences: {} };
      else if (path === '/benutzer') data = { success: true, data: { vorname: 'Preview', nachname: 'Student', klasse: '10a' } };
      if (request.method() !== 'GET') writes.push(path);
      return request.respond({ status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': base }, body: JSON.stringify(data) });
    });
    await page.goto(base + '/impressum');
    await page.evaluate(() => {
      document.cookie = 'lastSchoolId=999;path=/;SameSite=Lax';
      document.cookie = 'lastSchoolName=OperatorSchool;path=/;SameSite=Lax';
      document.cookie = 'lastSchoolLocation=OperatorCity;path=/;SameSite=Lax';
      localStorage.setItem('auth_access_token', 'operator-token');
      localStorage.setItem('auth_user', JSON.stringify({ username: 'operator', school_id: '999' }));
      localStorage.setItem('messages_cache', 'operator-cache');
      localStorage.setItem('lanis_custom_backend_url', 'https://operator-backend.invalid');
    });
    await page.goto(base + '/#impersonate=' + 'x'.repeat(43));
    await page.waitForSelector('[aria-label="Kontovorschau"]');
    assert.equal(exchangeCount, 1);
    assert.equal(new URL(page.url()).hash, '');
    assert.match(await page.$eval('[aria-label="Kontovorschau"]', el => el.textContent), /student.*123/);
    assert.equal(await page.evaluate(() => localStorage.getItem('auth_access_token')), 'operator-token');
    assert.equal(await page.evaluate(() => localStorage.getItem('messages_cache')), 'operator-cache');
    await page.evaluate(() => history.pushState(null, '', '/calendar?view=week'));
    await page.reload();
    await page.waitForSelector('[aria-label="Kontovorschau"]');
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/calendar?view=week');
    assert.equal(exchangeCount, 1, 'reload never replays a launch code');
    await page.screenshot({ path: '/tmp/lanis-account-preview.png', fullPage: true });
    await page.$eval('[aria-label="Kontovorschau"] button', el => el.click());
    await page.waitForFunction(() => document.body.textContent.includes('Vorschau beendet'));
    await page.waitForFunction(() => !sessionStorage.getItem("__lanis_preview:auth_access_token"));
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(revoked, true);
    const cookies = await page.evaluate(() => document.cookie);
    assert.match(cookies, /lastSchoolId=999/);
    assert.match(cookies, /lastSchoolName=OperatorSchool/);
    assert.match(cookies, /lastSchoolLocation=OperatorCity/);
    assert.equal(await page.evaluate(() => localStorage.getItem('auth_access_token')), 'operator-token');
    assert(writes.every(path => ['/impersonation/exchange', '/impersonation/end'].includes(path)), JSON.stringify(writes));
    await page.reload();
    await page.waitForFunction(() => document.body.textContent.includes('Vorschau nicht verfügbar'));
    console.log('Browser preview passed: launch, fragment removal, operator isolation, reload, explicit revocation and ended-tab isolation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

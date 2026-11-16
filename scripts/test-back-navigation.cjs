const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const open = async path => {
        await page.goto(base + path);
        await page.waitForSelector('h1, [role=alert], button[aria-label="Zurück"]');
      };
      const expectPath = async path => {
        await page.waitForFunction(expected => location.pathname === expected, {}, path);
      };
      const follow = async path => {
        const selector = `a[href="${path}"]`;
        await page.waitForSelector(selector);
        await page.$eval(selector, link => link.click());
        await expectPath(path);
      };
      const back = async () => {
        await page.waitForSelector('button');
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === 'Zurück' || button.textContent.trim() === 'Zurück'));
        await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Zurück' || button.textContent.trim() === 'Zurück').click());
      };
      // History returns to the actual source, including its query and fragment.
      await open('/demo/dashboard?source=back-test#origin');
      await follow('/demo/settings');
      await follow('/demo/settings/appearance');
      await back();
      await expectPath('/demo/settings');
      await page.goBack();
      await expectPath('/demo/dashboard');
      assert.equal(new URL(page.url()).search, '?source=back-test');
      assert.equal(new URL(page.url()).hash, '#origin');
      // A submission opened from a course returns to that course.
      await open('/demo/courses/b1');
      await page.waitForSelector('[aria-label="Abgaben"] button');
      await page.$eval('[aria-label="Abgaben"] button', button => button.click());
      await expectPath('/demo/courses/submissions/demo-s2');
      await back();
      await expectPath('/demo/courses/b1');
      // Direct entry uses the demo-aware fallback, with replace to avoid loops.
      for (const [path, fallback] of [
        ['/demo/settings/appearance', '/demo/settings'],
        ['/demo/courses/attendance', '/demo/courses'],
        ['/demo/courses/submissions', '/demo/courses'],
        ['/demo/courses/submissions/missing', '/demo/courses/submissions'],
        ['/demo/courses/missing', '/demo/courses'],
      ]) {
        await open(path);
        await back();
        await expectPath(fallback);
        assert.equal(await page.evaluate(() => history.state.idx), 0);
      }
      // Legal pages return to the referring legal page rather than always home.
      await open('/terms-of-service');
      await follow('/privacy-policy');
      await page.reload();
      await back();
      await expectPath('/terms-of-service');
      await open('/impressum');
      await back();
      await expectPath('/');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Back navigation passed at ${width}px`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

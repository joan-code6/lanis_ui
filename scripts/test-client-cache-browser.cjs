// Optional integration check: start npm run dev and set BROWSER_EXECUTABLE to a Chromium binary.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const origin = process.env.CACHE_TEST_ORIGIN || 'http://localhost:5187';
const routes = [
  ['dashboard', 'appsAPI', 'getModules'],
  ['timetable', 'timetableAPI', 'getResolvedTimetable'],
  ['vertretungsplan', 'vertretungsplanAPI', 'getPlan'],
  ['calendar', 'calendarAPI', 'getEvents'],
  ['study-groups', 'studyGroupsAPI', 'getStudyGroups'],
  ['courses/attendance', 'coursesAPI', 'getAttendanceOverview'],
  ['dateispeicher', 'dateispeicherAPI', 'getNode'],
  ['dateiverteilung', 'dateiverteilungAPI', 'getOverview'],
  ['dsb', 'dsbAPI', 'getSchoolPlan'],
  ['videokonferenz', 'videokonferenzAPI', 'getRooms'],
  ['courses', 'coursesAPI', 'getCourses'],
  ['courses/b1', 'coursesAPI', 'getCourseDetails'],
  ['courses/submissions', 'coursesAPI', 'getSubmissions'],
  ['courses/submissions/demo-s1', 'coursesAPI', 'getSubmission'],
  ['messages', 'messagesAPI', 'getMessageHeaders'],
  ['messages?conversation=dm-1', 'messagesAPI', 'getConversation'],
  ['profile', 'authAPI', 'getUserProfile'],
];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  assert(process.env.BROWSER_EXECUTABLE, 'Set BROWSER_EXECUTABLE to a Chromium executable');
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/demo/dashboard`, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      window.cacheTest = { api: await import('/src/services/api.ts'), calls: 0, releases: [], mode: 'normal' };
      window.cacheTest.navigate = route => {
        history.pushState({}, '', `/demo/${route}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      };
      window.cacheTest.inspect = () => {
        const main = document.querySelector('main');
        return {
          text: main?.innerText,
          skeletons: main?.querySelectorAll('.skeleton, .animate-pulse').length,
          calls: window.cacheTest.calls,
          joinLinks: [...(main?.querySelectorAll('a') || [])].filter(link => link.textContent.includes('Raum betreten')).length,
        };
      };
    });
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      for (const [route, service, method] of routes) {
        await page.evaluate(route => window.cacheTest.navigate(route), route);
        await pause(800);
        const before = await page.evaluate(() => window.cacheTest.inspect());
        assert(before.text, `${route}: page rendered`);
        assert.equal(before.skeletons, 0, `${route}: initial request completed`);
        await page.evaluate(([service, method, route]) => {
          const state = window.cacheTest;
          state.original = state.api[service][method];
          state.calls = 0;
          state.api[service][method] = async (...args) => {
            state.calls++;
            await new Promise(resolve => state.releases.push(resolve));
            if (state.mode === 'fail') throw new Error('Deliberate cache test failure');
            const response = await state.original(...args);
            if (service === 'timetableAPI') {
              const updated = structuredClone(response);
              const lesson = updated.days.flatMap(day => day.lessons || [])[0];
              if (lesson) lesson.subject = 'Cache integration updated lesson';
              return updated;
            }
            return response;
          };
          state.navigate(route === 'dashboard' ? 'profile' : 'dashboard');
        }, [service, method, route]);
        await page.waitForFunction(expected => document.querySelector('main h1')?.textContent === expected, {}, route === 'dashboard' ? 'Profil' : 'Dashboard');
        await page.evaluate(route => window.cacheTest.navigate(route), route);
        await page.waitForFunction(() => window.cacheTest.calls > 0);
        const during = await page.evaluate(() => window.cacheTest.inspect());
        assert(during.calls > 0, `${route}: revisit starts background request`);
        assert.equal(during.skeletons, 0, `${route}: revisit keeps cached page visible`);
        // Ignore expected status/refresh labels, require substantial cached content.
        const lines = before.text.split('\n').filter(line => line.trim().length > 4);
        const retained = lines.filter(line => during.text.includes(line)).length;
        assert(retained >= Math.floor(lines.length * .7), `${route}: cached content retained (${retained}/${lines.length})`);
        if (route === 'courses/b1') {
          const buttons = await page.$$eval('main button', buttons => buttons.filter(button => /[Ee]rledigt/.test(button.title) || /^Erledigt\??$/.test(button.textContent.trim())).map(button => button.disabled));
          assert(buttons.length && buttons.every(Boolean), 'pending course refresh cannot overwrite a new homework edit');
        }
        if (route === 'courses/submissions/demo-s1') {
          const enabledFileInput = await page.$('main input[type="file"]:not(:disabled)');
          assert.equal(enabledFileInput, null, 'cached submission permissions must be revalidated before uploading');
        }
        if (route === 'videokonferenz') {
          const joinLinks = await page.$$eval('main a', links => links.filter(link => link.textContent.includes('Raum betreten')).length);
          assert.equal(joinLinks, 0, 'cached meeting status must be checked before enabling join');
        }
        await page.evaluate(() => { window.cacheTest.releases.splice(0).forEach(release => release()); });
        await pause(500);
        if (route === 'videokonferenz' && before.joinLinks > 0) {
          assert((await page.evaluate(() => window.cacheTest.inspect())).joinLinks > 0, 'successful live check enables joining again');
        }
        if (route === 'timetable') {
          assert((await page.evaluate(() => document.querySelector('main').innerText)).includes('Cache integration updated lesson'), 'successful response replaces the cached timetable');
        }
        if (route === 'courses/b1') {
          const disabled = await page.$$eval('main button', buttons => buttons.filter(button => /[Ee]rledigt/.test(button.title) || /^Erledigt\??$/.test(button.textContent.trim())).some(button => button.disabled));
          assert.equal(disabled, false, 'homework controls become usable after revalidation');
        }
        // A second immediate revisit must also revalidate, with failure preserving content.
        await page.evaluate(route => { window.cacheTest.mode = 'fail'; window.cacheTest.navigate(route === 'dashboard' ? 'profile' : 'dashboard'); }, route);
        await page.waitForFunction(expected => document.querySelector('main h1')?.textContent === expected, {}, route === 'dashboard' ? 'Profil' : 'Dashboard');
        const oldCalls = await page.evaluate(() => window.cacheTest.calls);
        await page.evaluate(route => window.cacheTest.navigate(route), route);
        await page.waitForFunction(previous => window.cacheTest.calls > previous, {}, oldCalls);
        assert((await page.evaluate(() => window.cacheTest.calls)) > oldCalls, `${route}: consecutive visits revalidate without a timer`);
        await page.evaluate(() => window.cacheTest.releases.splice(0).forEach(release => release()));
        await pause(250);
        const failed = await page.evaluate(() => window.cacheTest.inspect());
        assert.equal(failed.skeletons, 0, `${route}: failed refresh does not discard cached content`);
        const keptOnFailure = lines.filter(line => failed.text.includes(line)).length;
        assert(keptOnFailure >= Math.floor(lines.length * .7), `${route}: content remains after failure`);
        await page.evaluate(([service, method]) => {
          const state = window.cacheTest;
          state.api[service][method] = state.original;
          state.mode = 'normal';
          state.navigate('dashboard');
        }, [service, method]);
        await pause(100);
        console.log(`PASS ${width}px ${route}: cached render, every-visit request, failure retention`);
      }
      await page.screenshot({ path: `/tmp/client-cache-${width}.png`, fullPage: true });
    }
    // Empty data is a successful cache entry, including an empty inbox.
    await page.evaluate(async () => {
      const state = window.cacheTest;
      const cache = await import('/src/utils/resourceCache.ts');
      cache.clearResourceCache();
      state.originalHeaders = state.api.messagesAPI.getMessageHeaders;
      state.api.messagesAPI.getMessageHeaders = async () => ({ success: true, conversations: [], total: 0 });
      state.navigate('messages');
    });
    await pause(250);
    await page.evaluate(() => {
      window.cacheTest.api.messagesAPI.getMessageHeaders = () => new Promise(resolve => window.cacheTest.releases.push(resolve));
      window.cacheTest.navigate('dashboard');
    });
    await pause(100);
    await page.evaluate(() => window.cacheTest.navigate('messages'));
    await pause(150);
    assert.equal((await page.evaluate(() => window.cacheTest.inspect())).skeletons, 0, 'cached empty inbox does not flash a loading state');
    await page.evaluate(() => {
      window.cacheTest.releases.splice(0).forEach(resolve => resolve({ success: true, conversations: [], total: 0 }));
      window.cacheTest.api.messagesAPI.getMessageHeaders = window.cacheTest.originalHeaders;
      window.cacheTest.navigate('dashboard');
    });
    console.log('PASS empty inbox: empty results render from cache');

    // Elections are checked with a fixture because this app intentionally has no demo election route.
    await page.evaluate(async () => {
      const state = window.cacheTest;
      const fixture = await import('/scripts/client-cache-fixtures.tsx');
      state.electionsOriginal = state.api.wahlenAPI.getElections;
      state.formOriginal = state.api.wahlenAPI.getForm;
      state.api.wahlenAPI.getElections = async () => ({ success: true, elections: [{ id: 'fixture-election', title: 'Cached fixture election' }] });
      state.api.wahlenAPI.getForm = async () => ({
        success: true, election: { id: 'fixture-election', title: 'Fixture election' },
        personal_fields: [{ id: 'name', kind: 'text', label: 'Your name', required: true }],
        blocks: [{ name: 'Details', max: -1, controls: [], groups: [] }],
      });
      state.fixtureHost = document.createElement('div');
      state.fixtureHost.id = 'cache-fixture';
      document.body.appendChild(state.fixtureHost);
      state.mountElections = () => { state.fixture = fixture.mountElections(state.fixtureHost); };
      state.mountElections();
    });
    await pause(300);
    assert((await page.$eval('#cache-fixture', host => host.innerText)).includes('Cached fixture election'));
    await page.evaluate(() => {
      const state = window.cacheTest;
      state.fixture.unmount();
      state.api.wahlenAPI.getElections = () => new Promise(resolve => state.releases.push(resolve));
      state.mountElections();
    });
    await pause(150);
    assert((await page.$eval('#cache-fixture', host => host.innerText)).includes('Cached fixture election'), 'elections render cache while revalidating');
    await page.evaluate(() => window.cacheTest.releases.splice(0).forEach(resolve => resolve({ success: true, elections: [{ id: 'fixture-election', title: 'Updated fixture election' }] })));
    await pause(150);
    assert((await page.$eval('#cache-fixture', host => host.innerText)).includes('Updated fixture election'), 'fresh elections replace cache');
    await page.click('#cache-fixture article button');
    await pause(150);
    await page.type('#cache-fixture input', 'Keep my draft');
    await page.evaluate(() => { void window.cacheTest.fixture.refresh(); });
    await pause(100);
    await page.evaluate(() => window.cacheTest.releases.splice(0).forEach(resolve => resolve({ success: true, elections: [] })));
    await pause(150);
    assert.equal(await page.$eval('#cache-fixture input', input => input.value), 'Keep my draft', 'overview revalidation does not replace an election draft');
    await page.evaluate(() => {
      const state = window.cacheTest;
      state.fixture.unmount(); state.fixtureHost.remove();
      state.api.wahlenAPI.getElections = state.electionsOriginal;
      state.api.wahlenAPI.getForm = state.formOriginal;
    });
    console.log('PASS elections: cached overview, replacement, draft preservation');
    assert.deepEqual(errors, [], 'No uncaught browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

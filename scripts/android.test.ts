import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { nativeRoute, nativeBackFallback } from '../src/platform/links';

test('native links preserve supported content destinations', () => {
  assert.equal(nativeRoute('https://lanis.arg-server.de/timetable'), '/timetable');
  assert.equal(nativeRoute('/courses/123?tab=homework#entry'), '/courses/123?tab=homework#entry');
  assert.equal(nativeRoute('https://localhost/settings/android'), '/settings/android');
});

test('notifications cannot navigate to arbitrary sites or privileged routes', () => {
  for (const url of ['https://example.org/timetable', '//example.org/messages', 'javascript:alert(1)', 'https://lanis.arg-server.de.attacker.invalid/messages', '/account/delete', '/login', '/timetable/../../login', 'http://lanis.arg-server.de/messages', '/messages-malicious', 'https://user:password@lanis.arg-server.de/messages']) {
    assert.equal(nativeRoute(url), null, url);
  }
});

import { canUseOfflineTimetable } from '../src/platform/offline';

test('network failures and server outages retain the personal timetable', () => {
  assert.equal(canUseOfflineTimetable(undefined, { plan_mode: 'personal' }, false), true);
  assert.equal(canUseOfflineTimetable(503, { plan_mode: 'personal' }, false), true);
});

test('revocation, validation errors and alternate plans never use cached personal data', () => {
  for (const status of [400, 401, 403, 404, 429]) assert.equal(canUseOfflineTimetable(status, { plan_mode: 'personal' }, false), false);
  assert.equal(canUseOfflineTimetable(undefined, { plan_mode: 'all' }, false), false);
  assert.equal(canUseOfflineTimetable(undefined, { plan_mode: 'personal', week_type: 'B' }, false), false);
  assert.equal(canUseOfflineTimetable(undefined, { plan_mode: 'personal' }, true), false);
  assert.equal(canUseOfflineTimetable(undefined, { plan_mode: 'personal', show_substitutions: false }, false), false);
});

import { normalizeAndroidTabs } from '../src/platform/androidNavigation';

test('saved Android shortcuts recover from invalid or old preferences', () => {
  assert.deepEqual(normalizeAndroidTabs(null), ['dashboard', 'timetable', 'messages']);
  assert.deepEqual(normalizeAndroidTabs(['calendar', 'calendar', 'unknown', 3]), ['calendar']);
  assert.deepEqual(normalizeAndroidTabs(['settings', 'courses', 'search', 'messages']), ['settings', 'courses', 'search', 'messages']);
  assert.deepEqual(normalizeAndroidTabs([]), []);
});

test('Android Back preserves demo mode when there is no browser history', () => {
  assert.equal(nativeBackFallback('/demo/settings/android'), '/demo/dashboard');
  assert.equal(nativeBackFallback('/demo/timetable'), '/demo/dashboard');
  assert.equal(nativeBackFallback('/demo/dashboard'), null);
  assert.equal(nativeBackFallback('/messages'), '/dashboard');
  for (const path of ['/dashboard', '/login', '/onboarding']) assert.equal(nativeBackFallback(path), null);
});

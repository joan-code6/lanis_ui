/** Closed vocabulary: no user-controlled strings are accepted as event properties. */
export const eventRules = {
  login_started: {}, login_succeeded: {}, login_failed: {}, logout_completed: {},
  onboarding_completed: {}, onboarding_skipped: {},
  search_opened: {}, search_result_selected: {}, file_search_submitted: {},
  file_folder_opened: {}, file_download_succeeded: {}, file_download_failed: {},
  message_sent: {}, message_replied: {},
  homework_updated: { done: [true, false] },
  settings_updated: { section: ['appearance', 'dashboard', 'timetable', 'homework', 'sidebar', 'notifications'] },
  install_requested: { source: ['promotion', 'settings'] }, install_dismissed: { permanent: [true, false] }, app_installed: {},
  api_request_failed: {
    module: ['auth', 'messages', 'courses', 'calendar', 'timetable', 'files', 'substitution', 'settings', 'notifications', 'other'],
    failure: ['network', 'timeout', 'unauthorized', 'forbidden', 'rate_limited', 'server', 'client'],
  },
  '$pageview': {},
} as const;
export type AnalyticsEvent = keyof typeof eventRules;

const routes = new Set(['/', '/login', '/dashboard', '/messages', '/courses', '/courses/attendance',
  '/calendar', '/timetable', '/study-groups', '/dateispeicher', '/vertretungsplan', '/dsb', '/wahlen',
  '/profile', '/settings', '/onboarding', '/status', '/impressum', '/privacy-policy', '/set-custom-backend']);
const settings = new Set(['appearance', 'notifications', 'app', 'timetable', 'dashboard', 'homework',
  'vertretungsplan', 'whatsapp', 'sidebar', 'account']);

/** Never emit raw URLs, query strings, school/course IDs or unknown path segments. */
export function routeLabel(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const clean = path.replace(/^\/demo(?=\/|$)/, '') || '/';
  if (routes.has(clean)) return clean;
  if (/^\/courses\/[^/]+$/.test(clean)) return '/courses/:id';
  if (clean.startsWith('/settings/') && settings.has(clean.slice(10))) return clean;
  return '/other';
}

export function sanitizeEventProperties(event: string, properties: Record<string, unknown>): Record<string, unknown> | null {
  if (!Object.prototype.hasOwnProperty.call(eventRules, event)) return null;
  const rules = eventRules[event as AnalyticsEvent] as Record<string, readonly unknown[]>;
  const safe: Record<string, unknown> = {};
  for (const [key, values] of Object.entries(rules)) {
    if (values.includes(properties[key])) safe[key] = properties[key];
  }
  // SDK identity/session IDs are random browser identifiers, never LANIS account IDs.
  for (const key of ['distinct_id', '$session_id', '$window_id', '$device_id']) {
    const value = properties[key];
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]{10,80}$/.test(value)) safe[key] = value;
  }
  safe.app = 'lanis_ui';
  safe.schema_version = 1;
  safe.environment = 'production';
  safe.$process_person_profile = false;
  safe.$geoip_disable = true;
  safe.$ip = null;
  return safe;
}

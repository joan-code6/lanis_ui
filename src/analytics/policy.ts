/** Closed vocabulary: no user-controlled strings are accepted as event properties. */
export const eventRules = {
  login_started: {}, login_succeeded: {}, login_failed: {}, logout_completed: {},
  onboarding_completed: {}, onboarding_skipped: { step: ['welcome', 'appearance', 'dashboard', 'timetable', 'homework', 'guide'] },
  onboarding_step_viewed: { step: ['welcome', 'appearance', 'dashboard', 'timetable', 'homework', 'guide'] },
  onboarding_step_completed: { step: ['welcome', 'appearance', 'dashboard', 'timetable', 'homework', 'guide'] },
  search_opened: {},
  search_result_selected: { category: ['navigation', 'messages', 'courses', 'calendar', 'timetable', 'groups', 'modules', 'people', 'other'] },
  search_session_completed: { outcome: ['selected', 'dismissed'], result_count: ['0', '1', '2-5', '6-20', '21+'], keyword_state: ['complete', 'pending', 'not_requested'] },
  file_search_submitted: {},
  course_opened: { source: ['course_list', 'timetable'] },
  course_tab_selected: { tab: ['history', 'performance', 'exams'] },
  course_filter_changed: { homework_only: [true, false] },
  course_view_changed: { view: ['cards', 'timeline'] },
  timetable_scope_changed: { scope: ['personal', 'all'] },
  timetable_week_changed: {},
  calendar_view_changed: { view: ['month', 'list'] },
  calendar_navigated: { direction: ['previous', 'next', 'today'] },
  calendar_event_opened: {},
  feature_engaged: { feature: ['courses', 'timetable', 'calendar', 'messages', 'homework', 'files', 'search'] },
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

const routes = new Set(['/', '/login', '/dashboard', '/messages', '/courses', '/courses/attendance', '/courses/submissions', '/dateiverteilung', '/videokonferenz',
  '/calendar', '/timetable', '/study-groups', '/dateispeicher', '/vertretungsplan', '/dsb', '/wahlen',
  '/profile', '/settings', '/onboarding', '/status', '/impressum', '/privacy-policy', '/set-custom-backend']);
const settings = new Set(['appearance', 'notifications', 'app', 'timetable', 'dashboard', 'homework',
  'vertretungsplan', 'whatsapp', 'sidebar', 'account', 'agents']);

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
  safe.schema_version = 2;
  safe.environment = 'production';
  safe.$process_person_profile = false;
  safe.$geoip_disable = true;
  safe.$ip = null;
  return safe;
}

/** Coarse buckets retain usefulness without publishing private result counts. */
export function resultCountBucket(count: number): '0' | '1' | '2-5' | '6-20' | '21+' {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count === 1) return '1';
  if (count <= 5) return '2-5';
  if (count <= 20) return '6-20';
  return '21+';
}

export function searchCategory(category: string): string {
  const categories: Record<string, string> = {
    Dashboard: 'navigation', Profil: 'navigation', Einstellungen: 'navigation',
    Nachrichten: 'messages', Unterricht: 'courses', Kalender: 'calendar',
    Stundenplan: 'timetable', Lerngruppen: 'groups', Module: 'modules',
    Vertretungsplan: 'modules', Dateiverteilung: 'modules', Nutzer: 'people',
  };
  return Object.prototype.hasOwnProperty.call(categories, category) ? categories[category] : 'other';
}

/** Meaningful interactions for engagement/retention; excludes passive pageviews and failures. */
export const engagedFeatures: Partial<Record<AnalyticsEvent, string>> = {
  course_opened: 'courses', course_tab_selected: 'courses',
  timetable_scope_changed: 'timetable', timetable_week_changed: 'timetable',
  calendar_event_opened: 'calendar', calendar_navigated: 'calendar',
  message_sent: 'messages', message_replied: 'messages', homework_updated: 'homework',
  file_download_succeeded: 'files', search_result_selected: 'search',
};

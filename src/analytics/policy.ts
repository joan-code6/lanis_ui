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
  '$pageview': {}, '$identify': {}, '$exception': {},
  analytics_identity_unavailable: {},
  api_request_completed: { outcome: ['success', 'http_error', 'network_error', 'cancelled'], method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
  content_ready: { outcome: ['ready', 'failed'], cached: [true, false] },
  content_refreshed: { outcome: ['ready', 'failed'] },
  message_read: {},
  web_vital: { metric: ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'], rating: ['good', 'needs-improvement', 'poor'] },
  feedback_submitted: { category: ['feature', 'bug', 'general'], context_attached: [true, false] },
  ui_interaction: { control: ['button', 'link', 'checkbox', 'radio', 'select'] },
  resource_load_failed: { resource_type: ['script', 'stylesheet', 'image', 'other'] },
  page_engagement: {},
  page_visibility_changed: { state: ['visible', 'hidden'] },
  network_status_changed: { state: ['online', 'offline'] },
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
  for (const key of ['request_id', 'client_request_id']) {
    if (typeof properties[key] === 'string' && /^[a-f0-9]{8}-[a-f0-9-]{27}$/.test(properties[key] as string)) safe[key] = properties[key];
  }
  if (typeof properties.diagnostic_id === 'string' && /^ld_[a-f0-9]{32}$/.test(properties.diagnostic_id)) safe.diagnostic_id = properties.diagnostic_id;
  if (event === 'ui_interaction' && typeof properties.destination === 'string') safe.destination = routeLabel(properties.destination);
  if (event === 'web_vital' && typeof properties.value === 'number' && Number.isFinite(properties.value)) safe.value = Math.max(0, Math.min(properties.value, 3600000));
  if (event === 'content_ready' || event === 'content_refreshed') {
    const names = ['dsb', 'study-groups', 'videokonferenz', 'wahlen', 'timetable', 'attendance', 'calendar', 'dateiverteilung', 'dateispeicher', 'dateispeicher-search', 'vertretungsplan', 'vertretungsplan-options', 'other'];
    safe.resource = names.includes(String(properties.resource)) ? properties.resource : 'other';
    for (const key of ['duration_ms', 'stale_ms']) if (typeof properties[key] === 'number' && Number.isFinite(properties[key])) safe[key] = Math.round(Math.max(0, Math.min(Number(properties[key]), 604800000)));
  }
  if (event === 'page_engagement') {
    if (typeof properties.active_ms === 'number' && Number.isFinite(properties.active_ms)) safe.active_ms = Math.round(Math.max(0, Math.min(properties.active_ms, 3600000)));
    if ([0, 25, 50, 75, 100].includes(Number(properties.scroll_depth))) safe.scroll_depth = properties.scroll_depth;
  }
  if (event.startsWith('api_request_')) {
    safe.endpoint = endpointLabel(properties.endpoint);
    if (Number.isInteger(properties.status) && Number(properties.status) >= 0 && Number(properties.status) <= 599) safe.status = properties.status;
    if (typeof properties.duration_ms === 'number' && Number.isFinite(properties.duration_ms)) safe.duration_ms = Math.round(Math.max(0, Math.min(properties.duration_ms, 3600000)));
    if (typeof properties.business_success === 'boolean') safe.business_success = properties.business_success;
  }
  if (event === '$exception') {
    const list = sanitizedExceptionList(properties.$exception_list);
    if (!list.length) return null;
    safe.$exception_list = list;
    safe.$exception_level = 'error';
    if (['error', 'rejection', 'react', 'api'].includes(String(properties.error_origin))) safe.error_origin = properties.error_origin;
  }
  // Only opaque SDK identifiers and validated backend account references survive.
  for (const key of ['distinct_id', '$session_id', '$window_id', '$device_id', '$anon_distinct_id']) {
    const value = properties[key];
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]{10,80}$/.test(value)) safe[key] = value;
  }
  const browsers = ['Chrome', 'Chrome iOS', 'Firefox', 'Firefox iOS', 'Microsoft Edge', 'Safari', 'Mobile Safari', 'Android Mobile', 'Opera', 'Samsung Internet'];
  if (typeof properties.$browser === 'string') safe.$browser = browsers.includes(properties.$browser) ? properties.$browser : 'Other';
  const systems = ['Windows', 'Mac OS X', 'Linux', 'iOS', 'Android', 'Chrome OS'];
  if (typeof properties.$os === 'string') safe.$os = systems.includes(properties.$os) ? properties.$os : 'Other';
  if (['Desktop', 'Mobile', 'Tablet'].includes(String(properties.$device_type))) safe.$device_type = properties.$device_type;
  if (typeof properties.$browser_version === 'number' && Number.isFinite(properties.$browser_version) && properties.$browser_version >= 0 && properties.$browser_version <= 10000) safe.$browser_version = Math.floor(properties.$browser_version);
  safe.app = 'lanis_ui';
  safe.schema_version = 3;
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

const apiRoots = new Set(['login', 'logout', 'auth', 'benutzer', 'account', 'health', 'modules', 'apps', 'nachrichten', 'notifications', 'dashboard', 'whatsapp', 'meinunterricht', 'kalender', 'stundenplan', 'dateispeicher', 'dateiverteilung', 'vertretungsplan', 'settings', 'lerngruppen', 'dsb', 'search', 'wahlen', 'videokonferenz', 'agents', 'school-list', 'cache', 'feedback']);
const apiSegments = new Set(['refresh', 'export', 'deletion', 'recover', 'headers', 'conversation', 'search', 'send', 'reply', 'mark-read', 'preferences', 'config', 'subscription', 'unsubscribe', 'test', 'notifications', 'read', 'read-all', 'status', 'pairing', 'link', 'preview', 'attendance', 'course', 'entry', 'weekly', 'submissions', 'homework-done', 'events', 'event', 'view', 'file', 'options', 'timetable', 'lessons', 'class-links', 'semantic', 'plan', 'upload', 'download', 'files', 'delete', 'authorization', 'district']);
/** Preserve static API structure and replace every unknown/resource segment. */
export function endpointLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/other';
  const parts = value.split(/[?#]/)[0].split('/').filter(Boolean);
  if (!apiRoots.has(parts[0])) return '/other';
  return '/' + parts.slice(0, 6).map((part, index) => index === 0 || apiSegments.has(part) ? part : ':id').join('/');
}

export function assetLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const path = value.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0];
  return /^\/assets\/[A-Za-z0-9_-]{1,100}\.js$/.test(path) ? path : undefined;
}

const exceptionTypes = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError', 'NetworkError', 'SecurityError', 'AbortError']);
export function errorType(value: unknown): string { return typeof value === 'string' && exceptionTypes.has(value) ? value : 'Error'; }

export function sanitizedExceptionList(value: unknown): object[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).filter(item => item && typeof item === 'object').map(item => ({
    type: errorType(item.type), value: 'Application error; details are held by LANIS.',
    mechanism: { type: 'generic', handled: item.mechanism?.handled === true },
    stacktrace: { type: 'raw', frames: (Array.isArray(item.stacktrace?.frames) ? item.stacktrace.frames : []).slice(-30).flatMap((frame: Record<string, unknown>) => {
      if (!frame || typeof frame !== 'object') return [];
      const filename = assetLabel(frame.filename);
      if (!filename) return [];
      return [{ filename, platform: 'web:javascript', in_app: true,
        ...(typeof frame.chunk_id === 'string' && /^[a-f0-9-]{36}$/.test(frame.chunk_id) ? { chunk_id: frame.chunk_id } : {}),
        ...(Number.isInteger(frame.lineno) && Number(frame.lineno) > 0 && Number(frame.lineno) < 10000000 ? { lineno: frame.lineno } : {}),
        ...(Number.isInteger(frame.colno) && Number(frame.colno) >= 0 && Number(frame.colno) < 10000000 ? { colno: frame.colno } : {}) }];
    }) },
  }));
}

import { capture } from './client';

const modules: Record<string, string> = {
  login: 'auth', auth: 'auth', logout: 'auth', benutzer: 'auth',
  nachrichten: 'messages', meinunterricht: 'courses', kalender: 'calendar',
  stundenplan: 'timetable', dateispeicher: 'files', vertretungsplan: 'substitution',
  settings: 'settings', notifications: 'notifications',
};
const lastFailureAt = new Map<string, number>();

/** Do not pass Axios errors to PostHog: they contain credentials and response bodies. */
export function captureApiFailure(error: { code?: string; config?: { url?: string }; response?: { status?: number; headers?: Record<string, unknown> } }): void {
  if (error.code === 'ERR_CANCELED') return;
  const prefix = (error.config?.url || '').split('?')[0].split('/')[1];
  const module = modules[prefix] || 'other';
  const status = error.response?.status;
  const failure = (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') ? 'timeout'
    : !status ? 'network' : status === 401 ? 'unauthorized' : status === 403 ? 'forbidden'
      : status === 429 ? 'rate_limited' : status >= 500 ? 'server' : 'client';
  const signature = `${module}:${failure}`;
  const now = Date.now();
  if (now - (lastFailureAt.get(signature) || 0) < 10000) return;
  lastFailureAt.set(signature, now);
  void capture('api_request_failed', { module, failure, endpoint: '/' + (Object.prototype.hasOwnProperty.call(modules, prefix) ? prefix : 'other'), status: status || 0, request_id: error.response?.headers?.['x-lanis-request-id'] });
}

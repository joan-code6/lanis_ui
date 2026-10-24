import { rememberRequest } from './supportContext';
import { analyticsEnabled, analyticsEpoch, capture } from './client';
import { endpointLabel } from './policy';

type Config = { url?: string; method?: string; headers?: unknown };
const pending = new WeakMap<object, { started: number; epoch: number; clientId?: string; page: string }>();

export function startApiRequest(config: Config): void {
  const headers = config.headers as Record<string, unknown> | undefined;
  if (headers) {
    delete headers['X-LANIS-Analytics-Consent'];
    delete headers['X-LANIS-Client-Request-ID'];
  }
  pending.delete(config);
  if (!analyticsEnabled()) return;
  const clientId = globalThis.crypto?.randomUUID?.();
  pending.set(config, { started: performance.now(), epoch: analyticsEpoch(), clientId, page: window.location.pathname });
  if (headers) {
    headers['X-LANIS-Analytics-Consent'] = 'account-v2';
    if (clientId) headers['X-LANIS-Client-Request-ID'] = clientId;
  }
}

export function finishApiRequest(config: Config | undefined, response?: { status?: number; headers?: Record<string, unknown>; data?: unknown }, code?: string): void {
  if (!config) return;
  const sample = pending.get(config);
  if (!sample) return;
  pending.delete(config);
  if (!analyticsEnabled() || sample.epoch !== analyticsEpoch()) return;
  rememberRequest(response?.headers?.['x-lanis-request-id']);
  const status = response?.status || 0;
  const data = response?.data;
  const businessSuccess = data && typeof data === 'object' && 'success' in data && typeof data.success === 'boolean' ? data.success : undefined;
  void capture('api_request_completed', {
    endpoint: endpointLabel(config.url), method: (config.method || 'GET').toUpperCase(),
    status, duration_ms: performance.now() - sample.started,
    outcome: code === 'ERR_CANCELED' ? 'cancelled' : !status ? 'network_error' : status >= 400 || businessSuccess === false ? 'http_error' : 'success',
    business_success: businessSuccess, client_request_id: sample.clientId,
    request_id: response?.headers?.['x-lanis-request-id'],
  }, sample.page);
  if (code !== 'ERR_CANCELED' && (!status || status >= 500)) {
    const requestId = response?.headers?.['x-lanis-request-id'];
    void import('./errors').then(({ reportException }) => reportException(new Error(status ? `API returned HTTP ${status}` : 'API network request failed'), 'api', { requestId: typeof requestId === 'string' ? requestId : undefined })).catch(() => {});
  }
}

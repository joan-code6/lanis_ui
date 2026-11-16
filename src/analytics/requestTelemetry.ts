import { rememberRequest } from './supportContext';
import { analyticsEnabled, analyticsEpoch, analyticsSessionId, capture } from './client';
import { endpointLabel, operationForRequest, type Operation } from './policy';

type Config = { url?: string; method?: string; headers?: unknown; _authRetryAttempted?: boolean; _lanisPurpose?: 'foreground' | 'prefetch' | 'recovery' | 'public' };
const pending = new WeakMap<object, { started: number; epoch: number; clientId?: string; page: string; operation?: Operation }>();

export function startApiRequest(config: Config, correlate = true): void {
  const headers = config.headers as Record<string, unknown> | undefined;
  if (headers) {
    delete headers['X-LANIS-Analytics-Consent'];
    delete headers['X-LANIS-Client-Request-ID'];
    delete headers['X-LANIS-Session-ID'];
  }
  pending.delete(config);
  if (!analyticsEnabled()) return;
  const clientId = globalThis.crypto?.randomUUID?.();
  const operation = operationForRequest(config.url, config.method || 'GET');
  pending.set(config, { operation, started: performance.now(), epoch: analyticsEpoch(), clientId, page: window.location.pathname });
  if (operation) void capture('operation_started', { operation, endpoint: config.url, client_request_id: clientId });
  if (headers && correlate) {
    const sessionId = analyticsSessionId();
    if (sessionId) headers['X-LANIS-Session-ID'] = sessionId;
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
  const partialFailure = Boolean(data && typeof data === 'object' && 'all_succeeded' in data && data.all_succeeded === false);
  const properties = {
    endpoint: endpointLabel(config.url), method: (config.method || 'GET').toUpperCase(),
    status, duration_ms: performance.now() - sample.started,
    outcome: code === 'ERR_CANCELED' ? 'cancelled' : ['ECONNABORTED', 'ETIMEDOUT'].includes(code || '') ? 'timeout' : !status ? 'network_error' : status >= 400 || businessSuccess === false || partialFailure ? 'http_error' : 'success',
    business_success: businessSuccess, client_request_id: sample.clientId,
    request_id: response?.headers?.['x-lanis-request-id'],
    trace_id: response?.headers?.['x-lanis-trace-id'], cache: response?.headers?.['x-lanis-cache'],
    purpose: config._lanisPurpose || 'foreground', retry: config._authRetryAttempted === true,
  };
  void capture('api_request_completed', properties, sample.page);
  if (sample.operation) void capture('operation_completed', { ...properties, operation: sample.operation,
    outcome: partialFailure ? 'partial_failure' : businessSuccess === false ? 'business_failure' : properties.outcome }, sample.page);
  if (code !== 'ERR_CANCELED' && (!status || status >= 500)) {
    const requestId = response?.headers?.['x-lanis-request-id'];
    void import('./errors').then(({ reportException }) => reportException(new Error(status ? `API returned HTTP ${status}` : 'API network request failed'), 'api', { endpoint: endpointLabel(config.url), requestId: typeof requestId === 'string' ? requestId : undefined })).catch(() => {});
  }
}

/** Public fetch paths share timings without sending analytics identity headers. */
export async function telemetryFetch(url: string, endpoint: string, init: RequestInit = {}): Promise<Response> {
  const config: Config = { url: endpoint, method: init.method || 'GET', headers: {}, _lanisPurpose: 'public' };
  startApiRequest(config, false);
  try {
    const response = await fetch(url, init);
    finishApiRequest(config, { status: response.status, headers: Object.fromEntries(response.headers.entries()) });
    return response;
  } catch (error) {
    finishApiRequest(config, undefined, error instanceof Error && error.name === 'AbortError' ? 'ERR_CANCELED' : undefined);
    throw error;
  }
}

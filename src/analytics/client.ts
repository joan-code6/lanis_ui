import type { PostHog } from 'posthog-js';
import { AnalyticsEvent, engagedFeatures, routeLabel, sanitizeEventProperties } from './policy';

export const CONSENT_KEY = 'lanis_analytics_consent_v2';
export const CONSENT_EVENT = 'lanis:analytics-consent';
export type Consent = 'granted' | 'denied' | null;
let client: PostHog | undefined;
let loading: Promise<void> | undefined;
let loadingGeneration = 0;
let lastPage: string | undefined;
let generation = 0;
let accountContext: { token: string; backend: string; key: string; resolveToken?: () => Promise<string | null> } | undefined;
let accountRef: string | undefined;
let identityPending: Promise<void> | undefined;
let identityRetryAt = 0;
const pendingRequests = new Set<AbortController>();

export function configureAccountAnalytics(token: string | null, backend: string, key: string, resolveToken?: () => Promise<string | null>): void {
  if (!token) { if (accountContext) resetAnalyticsIdentity(); return; }
  const nextKey = backend + '|' + key;
  if (accountContext?.key === nextKey) {
    if (accountContext.token !== token) identityRetryAt = 0;
    accountContext.token = token;
    if (resolveToken) accountContext.resolveToken = resolveToken;
    return;
  }
  if (accountContext || accountRef) resetAnalyticsIdentity();
  accountContext = { token, backend: backend.replace(/\/$/, ''), key: nextKey, resolveToken };
  identityRetryAt = 0;
}

export function analyticsEnabled(): boolean { return allowed(); }
export function analyticsEpoch(): number { return generation; }

async function accountRequest(path: string, body?: object): Promise<Record<string, unknown> | null> {
  const context = accountContext;
  if (!context || !allowed()) return null;
  const epoch = generation;
  const controller = new AbortController();
  pendingRequests.add(controller);
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const token = context.resolveToken ? await context.resolveToken() : context.token;
    if (!token || epoch !== generation || context !== accountContext || !allowed() || controller.signal.aborted) return null;
    const response = await fetch(context.backend + path, {
      method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
      referrerPolicy: 'no-referrer', signal: controller.signal,
      headers: { 'X-Session-Token': token, 'X-LANIS-Analytics-Consent': 'account-v2',
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok || context !== accountContext || !allowed()) return null;
    return await response.json();
  } catch { return null; }
  finally { clearTimeout(timeout); pendingRequests.delete(controller); }
}

async function synchronizeIdentity(): Promise<void> {
  if (!accountContext || accountRef || !allowed() || Date.now() < identityRetryAt) return;
  if (identityPending) return identityPending;
  const context = accountContext;
  const epoch = generation;
  const pending = accountRequest('/analytics/identity').then(result => {
    if (context !== accountContext || epoch !== generation || !allowed()) return;
    const reference = result?.account_ref;
    if (typeof reference !== 'string' || !/^la_[a-f0-9]{32}$/.test(reference)) {
      identityRetryAt = Date.now() + 60000;
      client?.capture('analytics_identity_unavailable');
      return;
    }
    const oldId = client?.get_distinct_id?.();
    if (oldId?.startsWith('la_') && oldId !== reference) client?.reset();
    accountRef = reference;
    client?.identify(reference);
  }).finally(() => { if (identityPending === pending) identityPending = undefined; });
  identityPending = pending;
  return pending;
}

export async function storeDiagnostic(kind: 'error' | 'rejection' | 'react' | 'api', error: unknown, requestId = ''): Promise<string | undefined> {
  if (!allowed() || !accountContext) return undefined;
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Non-Error rejection';
  const stack = error instanceof Error ? error.stack || '' : '';
  const result = await accountRequest('/analytics/diagnostics', { kind, message: message.slice(0, 4096), stack: stack.slice(0, 16384),
    request_id: /^[a-f0-9-]{36}$/.test(requestId) ? requestId : '' });
  return typeof result?.diagnostic_id === 'string' && /^ld_[a-f0-9]{32}$/.test(result.diagnostic_id) ? result.diagnostic_id : undefined;
}


export function getConsent(): Consent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === 'granted' || value === 'denied') return value;
    // An old refusal remains a refusal; old anonymous consent does not authorize account linking.
    return localStorage.getItem('lanis_analytics_consent_v1') === 'denied' ? 'denied' : null;
  } catch { return null; }
}

export function analyticsConfigured(): boolean {
  return import.meta.env.PROD && /^phc_[a-zA-Z0-9]+$/.test(import.meta.env.VITE_POSTHOG_KEY || '')
    && ['https://t.lanis.arg-server.de', 'https://eu.i.posthog.com'].includes(import.meta.env.VITE_POSTHOG_HOST);
}

function isDemo(): boolean {
  try { return localStorage.getItem('__demo_mode') === '1'; } catch { return true; }
}

function allowed(): boolean {
  return analyticsConfigured() && getConsent() === 'granted'
    && !window.location.pathname.startsWith('/demo')
    && !isDemo();
}

export function initializeAnalytics(): Promise<void> {
  if (!allowed() || client) return Promise.resolve();
  if (loading && loadingGeneration !== generation) return loading.then(initializeAnalytics);
  if (loading) return loading;
  const currentGeneration = generation;
  loadingGeneration = currentGeneration;
  loading = import('posthog-js').then(({ default: posthog }) => {
    if (!allowed() || currentGeneration !== generation) return;
    const instance = posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      persistence: 'localStorage', cross_subdomain_cookie: false,
      // Avoid retaining unsent batches after consent is withdrawn.
      request_batching: false,
      person_profiles: 'identified_only', ip: false,
      autocapture: false, capture_pageview: false, capture_pageleave: false,
      capture_dead_clicks: false, capture_heatmaps: false, rageclick: false,
      capture_exceptions: false, capture_performance: false,
      disable_session_recording: true, enable_recording_console_log: false,
      disable_surveys: true, disable_external_dependency_loading: true,
      advanced_disable_flags: true, advanced_disable_feature_flags: true,
      save_referrer: false, store_google: false,
      before_send: event => {
        if (!event || !allowed()) return null;
        const properties = sanitizeEventProperties(event.event, event.properties || {});
        if (!properties) return null;
        const page = routeLabel(typeof event.properties?.page === 'string'
          ? event.properties.page : window.location.pathname);
        if (accountRef) properties.account_ref = accountRef;
        properties.$process_person_profile = Boolean(accountRef);
        properties.token = import.meta.env.VITE_POSTHOG_KEY;
        properties.page = page;
        properties.$pathname = page;
        const release = import.meta.env.VITE_APP_RELEASE;
        properties.release = typeof release === 'string' && /^[a-f0-9]{7,40}$/.test(release) ? release : 'local';
        // Origin is omitted as custom backends / deployments can contain identifying data.
        event.properties = properties;
        return event;
      },
    });
    const persistedId = instance?.get_distinct_id?.();
    if (persistedId?.startsWith('la_') && !accountRef) instance?.reset();
    instance?.set_config({ disable_persistence: false });
    instance?.opt_in_capturing({ captureEventName: false });
    client = instance;
  }).catch(() => { /* Analytics must never interrupt school workflows. */ }).finally(() => { loading = undefined; });
  return loading;
}

export function setConsent(consent: Exclude<Consent, null>): void {
  generation++;
  try { localStorage.setItem(CONSENT_KEY, consent); } catch { return; }
  if (consent === 'denied') stopAnalytics();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function stopAnalytics(): void {
  generation++;
  for (const request of pendingRequests) request.abort();
  accountRef = undefined;
  identityPending = undefined;
  identityRetryAt = 0;
  lastPage = undefined;
  try {
    client?.opt_out_capturing();
    client?.reset();
    client?.set_config({ disable_persistence: true });
  } catch { /* Fail closed through allowed() and before_send as well. */ }
  client = undefined;
}

export async function capture(event: AnalyticsEvent, properties: Record<string, unknown> = {}, pageOverride?: string): Promise<void> {
  if (!allowed()) return;
  const currentGeneration = generation;
  const page = routeLabel(pageOverride || window.location.pathname);
  await initializeAnalytics();
  await synchronizeIdentity();
  if (!allowed() || currentGeneration !== generation) return;
  try {
    const result = client?.capture(event, { ...properties, page });
    const feature = engagedFeatures[event];
    if (result && feature) client?.capture('feature_engaged', { feature, page });
  } catch { /* Best effort. */ }
}

export async function capturePage(): Promise<void> {
  if (!allowed()) { lastPage = undefined; return; }
  const page = routeLabel(window.location.pathname);
  const currentGeneration = generation;
  await initializeAnalytics();
  if (!client || !allowed() || currentGeneration !== generation
    || page !== routeLabel(window.location.pathname) || page === lastPage) return;
  lastPage = page;
  await capture('$pageview');
}

export function resetAnalyticsIdentity(): void {
  generation++;
  for (const request of pendingRequests) request.abort();
  accountContext = undefined;
  accountRef = undefined;
  identityPending = undefined;
  identityRetryAt = 0;
  try {
    client?.reset();
    if (allowed()) client?.opt_in_capturing({ captureEventName: false });
  } catch { /* Best effort. */ }
  lastPage = undefined;
}


export async function captureSanitizedException(error: Error, properties: Record<string, unknown>, pageOverride?: string): Promise<void> {
  if (!allowed()) return;
  const epoch = generation;
  const page = routeLabel(pageOverride || window.location.pathname);
  await initializeAnalytics();
  await synchronizeIdentity();
  if (!allowed() || epoch !== generation) return;
  try { client?.captureException(error, { ...properties, page }); } catch { /* Best effort. */ }
}

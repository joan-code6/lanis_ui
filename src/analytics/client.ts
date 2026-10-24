import type { PostHog } from 'posthog-js';
import { AnalyticsEvent, engagedFeatures, routeLabel, sanitizeEventProperties } from './policy';

export const CONSENT_KEY = 'lanis_analytics_consent_v1';
export const CONSENT_EVENT = 'lanis:analytics-consent';
export type Consent = 'granted' | 'denied' | null;
let client: PostHog | undefined;
let loading: Promise<void> | undefined;
let loadingGeneration = 0;
let lastPage: string | undefined;
let generation = 0;

export function getConsent(): Consent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
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
      person_profiles: 'never', ip: false,
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
        properties.token = import.meta.env.VITE_POSTHOG_KEY;
        properties.page = page;
        properties.$pathname = page;
        // Origin is omitted as custom backends / deployments can contain identifying data.
        event.properties = properties;
        return event;
      },
    });
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
  lastPage = undefined;
  try {
    client?.opt_out_capturing();
    client?.reset();
    client?.set_config({ disable_persistence: true });
  } catch { /* Fail closed through allowed() and before_send as well. */ }
  client = undefined;
}

export async function capture(event: AnalyticsEvent, properties: Record<string, unknown> = {}): Promise<void> {
  if (!allowed()) return;
  const currentGeneration = generation;
  const page = routeLabel(window.location.pathname);
  await initializeAnalytics();
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
  try {
    client?.reset();
    if (allowed()) client?.opt_in_capturing({ captureEventName: false });
  } catch { /* Best effort. */ }
  lastPage = undefined;
}

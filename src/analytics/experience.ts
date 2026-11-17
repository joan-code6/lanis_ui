import { analyticsEnabled, analyticsEpoch, capture } from './client';

const resources = new Set(['dashboard', 'courses', 'course-detail', 'dsb', 'study-groups', 'videokonferenz', 'wahlen', 'timetable', 'attendance', 'calendar', 'dateiverteilung', 'dateispeicher', 'dateispeicher-search', 'vertretungsplan', 'vertretungsplan-options', 'submissions', 'submission-detail', 'messages']);
/** Classify locally. Never transmit a cache key, query, resource ID, or filter value. */
export function resourceLabel(resource: string): string {
  let name = resource.split(':')[0];
  if (resource.startsWith('[')) { try { name = JSON.parse(resource)[0]; } catch { return 'other'; } }
  return resources.has(name) ? name : 'other';
}
export function startExperience(resource: string, cancelled: () => boolean = () => false) {
  const label = resourceLabel(resource);
  const started = performance.now();
  const epoch = analyticsEpoch();
  const page = window.location.pathname;
  const enabled = analyticsEnabled();
  let completed = false;
  return (outcome: 'ready' | 'empty' | 'failed', cached = false, staleMs?: number) => {
    if (!enabled || completed || cancelled() || !analyticsEnabled() || epoch !== analyticsEpoch()) return;
    completed = true;
    // Wait for paint; no content or resource key is retained in the callback.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!cancelled() && analyticsEnabled() && epoch === analyticsEpoch() && window.location.pathname === page) void capture('content_ready', {
        resource: label, outcome, cached,
        duration_ms: performance.now() - started, stale_ms: staleMs,
      }, page);
    }));
  };
}
let vitalsStarted = false;
export function startWebVitals() {
  if (vitalsStarted || !analyticsEnabled()) return;
  vitalsStarted = true;
  // Vital observers live for the document lifetime; callbacks recheck current consent.
  void import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const report = (metric: { name: string; value: number; rating: string }) => {
      if (analyticsEnabled()) void capture('web_vital', { metric: metric.name, value: metric.value, rating: metric.rating });
    };
    onCLS(report); onFCP(report); onINP(report); onLCP(report); onTTFB(report);
  }).catch(() => { vitalsStarted = false; });
}

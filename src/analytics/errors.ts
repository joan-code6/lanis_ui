import { analyticsEnabled, analyticsEpoch, capture, captureSanitizedException, storeDiagnostic } from './client';
import { assetLabel, errorType } from './policy';

const lastReported = new Map<string, number>();
let windowStarted = 0;
let reportsInWindow = 0;

/** Actual exception text is sent only to our authenticated encrypted vault. */
export async function reportException(error: unknown, origin: 'error' | 'rejection' | 'react' | 'api' = 'error', source?: { filename?: string; line?: number; column?: number; requestId?: string }): Promise<void> {
  if (!analyticsEnabled()) return;
  const epoch = analyticsEpoch();
  const page = window.location.pathname;
  const name = errorType(error instanceof Error ? error.name : 'Error');
  const rawStack = error instanceof Error ? error.stack || '' : '';
  const frames: string[] = [];
  for (const match of rawStack.matchAll(/((?:https?:\/\/[^/\s)]+)?\/assets\/[A-Za-z0-9_-]+\.js):(\d+):(\d+)/g)) {
    const file = assetLabel(match[1]);
    if (file) frames.push(`    at app (${match[1]}:${match[2]}:${match[3]})`);
    if (frames.length >= 30) break;
  }
  const fallback = assetLabel(source?.filename);
  if (!frames.length && fallback) frames.push(`    at app (${fallback}:${Math.max(1, source?.line || 1)}:${Math.max(0, source?.column || 0)})`);
  const fingerprint = name + frames.join('\n') + origin;
  const now = Date.now();
  if (now - windowStarted >= 60000) { windowStarted = now; reportsInWindow = 0; }
  if (reportsInWindow >= 20 || now - (lastReported.get(fingerprint) || 0) < 10000) return;
  if (lastReported.size >= 100) lastReported.clear();
  lastReported.set(fingerprint, now);
  reportsInWindow++;
  const diagnosticId = await storeDiagnostic(origin, error, source?.requestId);
  if (!analyticsEnabled() || epoch !== analyticsEpoch()) return;
  const safe = new Error('Application error; details are held by LANIS.');
  safe.name = name;
  safe.stack = `${name}: Application error; details are held by LANIS.\n${frames.join('\n')}`;
  await captureSanitizedException(safe, { error_origin: origin, diagnostic_id: diagnosticId, request_id: source?.requestId }, page);
}

export function startErrorTracking(): () => void {
  const onError = (event: Event) => {
    if (event instanceof ErrorEvent) {
      void reportException(event.error || event.message, 'error', { filename: event.filename, line: event.lineno, column: event.colno });
    } else if (event.target instanceof Element && ['SCRIPT', 'LINK', 'IMG'].includes(event.target.tagName)) {
      const type = event.target.tagName === 'SCRIPT' ? 'script' : event.target.tagName === 'LINK' ? 'stylesheet' : 'image';
      void capture('resource_load_failed', { resource_type: type });
    }
  };
  const rejection = (event: PromiseRejectionEvent) => { void reportException(event.reason, 'rejection'); };
  const online = () => { void capture('network_status_changed', { state: 'online' }); };
  const offline = () => { void capture('network_status_changed', { state: 'offline' }); };
  const visibility = () => { void capture('page_visibility_changed', { state: document.visibilityState }); };
  const interaction = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest('button,a,input[type="checkbox"],input[type="radio"],select');
    if (!element) return;
    const control = element.tagName === 'A' ? 'link' : element.tagName === 'INPUT' ? (element as HTMLInputElement).type : element.tagName.toLowerCase();
    let destination: string | undefined;
    if (element instanceof HTMLAnchorElement) {
      const target = new URL(element.href, window.location.href);
      if (target.origin === window.location.origin) destination = target.pathname;
    }
    // Never read labels, text, form values, IDs or data attributes.
    void capture('ui_interaction', { control, destination });
  };
  document.addEventListener('click', interaction);
  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', rejection);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    document.removeEventListener('click', interaction);
    window.removeEventListener('error', onError, true);
    window.removeEventListener('unhandledrejection', rejection);
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
    document.removeEventListener('visibilitychange', visibility);
  };
}

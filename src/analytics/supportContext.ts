import { analyticsEnabled, analyticsEpoch } from './client';
import { routeLabel } from './policy';
let epoch = -1;
const recent: string[] = [];
export function rememberRequest(value: unknown) {
  if (!analyticsEnabled()) return;
  if (epoch !== analyticsEpoch()) { recent.length = 0; epoch = analyticsEpoch(); }
  if (typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9-]{27}$/.test(value) && !recent.includes(value)) {
    recent.push(value); if (recent.length > 10) recent.shift();
  }
}
export function supportContext() {
  if (!analyticsEnabled()) return undefined;
  const release = import.meta.env.VITE_APP_RELEASE;
  return { release: typeof release === 'string' && /^[a-f0-9]{7,40}$/.test(release) ? release : 'local',
    page: routeLabel(window.location.pathname), request_ids: epoch === analyticsEpoch() ? [...recent] : [] };
}

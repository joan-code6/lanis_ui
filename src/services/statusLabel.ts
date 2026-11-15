import type { Observation } from './publicStatus';
import { statusLabels } from './publicStatus';

export function observationLabel(observation: Pick<Observation, 'status' | 'error' | 'status_code'>): string {
  const code = observation.status_code;
  const http = Number.isInteger(code) && code! >= 100 && code! <= 599 ? ` (HTTP ${code})` : '';
  if (observation.status === 'unknown') {
    if (code === 429 || observation.error === 'rate_limited') return `${code === 429 || code == null ? 'Anfragelimit' : 'Prüfung pausiert'}${http}`;
    if (observation.error === 'access_denied') return `Zugriff verweigert${http}`;
    if (observation.error === 'request_budget_exhausted') return 'Unvollständig';
  }
  return `${statusLabels[observation.status]}${http}`;
}

import type { Observation } from './publicStatus';

export interface MeasurementNotice {
  title: string;
  description: string;
}

// Describe only allowlisted measurement failures, never raw upstream errors.
// A blocked observation cannot establish either an outage or recovery.
export function getMeasurementNotice(
  observation: Pick<Observation, 'status' | 'error'> | null | undefined,
  stale = false,
): MeasurementNotice | null {
  if (!observation || (!stale && observation.status !== 'unknown')) return null;
  if (stale && observation.error === 'rate_limited') return {
    title: 'Letzte Prüfung durch Anfragelimit begrenzt',
    description: 'Das Schulportal hat die letzte Prüfung unseres Statusdienstes begrenzt. Seitdem liegt kein aktuelles Prüfergebnis vor. Der aktuelle Zustand des Schulportals ist unbekannt.',
  };
  if (stale) return {
    title: 'Keine aktuelle Messung',
    description: 'Das letzte Prüfergebnis ist veraltet. Daraus lässt sich der aktuelle Zustand des Schulportals nicht ableiten.',
  };
  switch (observation.error) {
    case 'rate_limited':
      return {
        title: 'Prüfung durch Anfragelimit pausiert',
        description: 'Das Schulportal hat die Anfragen unseres Statusdienstes begrenzt. Die Prüfung wird nach einer Wartezeit automatisch wiederholt. Dieses Ergebnis bestätigt keinen Ausfall und keine Wiederherstellung.',
      };
    case 'access_denied':
      return {
        title: 'Statusprüfung ohne Zugriff',
        description: 'Das Schulportal hat den Zugriff für die Prüfung abgelehnt. Ob andere Konten betroffen sind, lässt sich daraus nicht ableiten.',
      };
    case 'request_budget_exhausted':
      return {
        title: 'Statusprüfung unvollständig',
        description: 'Die Prüfung wurde beendet, um zusätzliche Anfragen an das Schulportal zu vermeiden. Es liegt kein verlässliches Ergebnis zur Verfügbarkeit vor.',
      };
    default:
      return {
        title: 'Kein verlässliches Prüfergebnis',
        description: 'Die Verfügbarkeit lässt sich mit dieser Messung nicht beurteilen. Unbekannte Ergebnisse bestätigen weder einen Ausfall noch eine Wiederherstellung.',
      };
  }
}

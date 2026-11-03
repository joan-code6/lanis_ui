import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AppIcon from '../AppIcon';
import { getApiBaseUrl } from '../../utils/backendConfig';
import { PublicIncident, formatTimestamp, statusColors, statusLabels } from '../../services/publicStatus';
import { formatDuration } from '../../utils/formatDuration';

const featureName = (name: string) => name === 'login' ? 'Anmeldung' : name === 'modules' ? 'Module' : name;

export default function IncidentPage() {
  const { id } = useParams();
  const [data, setData] = useState<PublicIncident | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setData(null);
    setError(false);
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    void fetch(`${getApiBaseUrl()}/status/incident/${encodeURIComponent(id || '')}`, {
      signal: controller.signal, credentials: 'omit',
    }).then(response => {
      if (!response.ok) throw new Error('Incident unavailable');
      return response.json();
    }).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [id, revision]);

  const observations = data?.observations ?? [];
  const timeline = observations.filter((check, index) => index === 0
    || index === observations.length - 1
    || check.status !== observations[index - 1].status
    || check.features.map(feature => `${feature.name}:${feature.status}`).join() !== observations[index - 1].features.map(feature => `${feature.name}:${feature.status}`).join());
  const resolved = Boolean(data?.resolved_at);
  const StateIcon = resolved ? CheckCircleIcon : ExclamationTriangleIcon;

  return (
    <div className="min-h-[100dvh] bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8">
        <nav className="flex items-center justify-between" aria-label="Status-Navigation">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <AppIcon alt="" className="h-7 w-7 rounded-lg" />Lanis
          </Link>
          <Link to="/status" className="btn btn-secondary gap-2 text-sm">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Statusübersicht
          </Link>
        </nav>

        <main className="pb-12 pt-12 sm:pt-16">
          <p className="text-sm font-medium text-surface-500">Schulportal Hessen</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Störung</h1>

          {error ? (
            <div role="alert" className="mt-6 rounded-2xl border bg-white p-6 dark:bg-surface-900">
              <p className="font-medium">Störung nicht verfügbar</p>
              <p className="mt-1 text-sm text-surface-500">Der Eintrag wurde nicht gefunden oder konnte nicht geladen werden.</p>
              <button className="btn btn-secondary mt-5 gap-2 text-sm" onClick={() => setRevision(value => value + 1)}>
                <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />Erneut versuchen
              </button>
            </div>
          ) : !data ? (
            <div role="status" className="mt-6 flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-surface-500 dark:bg-surface-900">
              <ArrowPathIcon className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Störung wird geladen…
            </div>
          ) : (
            <>
              <section className="mt-6 overflow-hidden rounded-2xl border bg-white dark:bg-surface-900" aria-label="Zusammenfassung">
                <div className="flex items-center gap-3 border-b px-5 py-5 sm:px-6">
                  <StateIcon className={`h-6 w-6 shrink-0 ${resolved ? 'text-emerald-500' : data.status === 'down' ? 'text-rose-500' : 'text-amber-500'}`} aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold">{resolved ? 'Störung behoben' : statusLabels[data.status]}</h2>
                    <p className="mt-0.5 text-sm text-surface-500">{data.affected_features.map(featureName).join(' · ') || 'Schulportal Hessen'}</p>
                  </div>
                </div>
                <dl className="grid gap-5 px-5 py-5 sm:grid-cols-3 sm:px-6">
                  {[
                    ['Beginn', formatTimestamp(data.started_at)],
                    ['Behoben', data.resolved_at ? formatTimestamp(data.resolved_at) : 'Noch aktiv'],
                    ['Dauer', data.duration_seconds === null ? 'Läuft noch' : formatDuration(data.duration_seconds)],
                  ].map(([label, value]) => (
                    <div key={label}><dt className="text-xs text-surface-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>
                  ))}
                </dl>
              </section>

              <section className="mt-8" aria-labelledby="timeline-title">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="timeline-title" className="text-lg font-semibold">Verlauf</h2>
                  <span className="text-xs text-surface-500">{data.checks} bestätigte Checks</span>
                </div>
                <ol className="mt-4 divide-y rounded-2xl border bg-white px-5 dark:bg-surface-900 sm:px-6">
                  {timeline.map((check, index) => (
                    <li key={`${check.checked_at}-${index}`} className="flex gap-3 py-4">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusColors[check.status]}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-sm font-medium">{statusLabels[check.status]}</p>
                          <time className="text-xs text-surface-500" dateTime={check.checked_at || undefined}>{formatTimestamp(check.checked_at)}</time>
                        </div>
                        <p className="mt-1 text-xs text-surface-500">{check.features.map(feature => `${featureName(feature.name)}: ${statusLabels[feature.status]}`).join(' · ')}</p>
                      </div>
                    </li>
                  ))}
                  {!timeline.length && <li className="py-5 text-sm text-surface-500">Keine einzelnen Prüfergebnisse verfügbar.</li>}
                </ol>
              </section>
              <p className="mt-5 text-xs leading-relaxed text-surface-500">Der Verlauf zeigt beobachtete Statusänderungen. Messlücken bestätigen keine durchgehende Ausfallzeit. Ergebnisse können je nach Schule oder Konto abweichen.</p>
              <p className="mt-3 break-all text-xs text-surface-400">ID: {data.id}</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

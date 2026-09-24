import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import SEO from '../seo/SEO';
import {
  formatPercent,
  formatTimestamp,
  statusColors,
  statusLabels,
  PublicStatus,
  usePublicStatus,
} from '../../services/publicStatus';
import { getCustomBackendUrl } from '../../utils/backendConfig';

export default function StatusPage() {
  const [windowKey, setWindowKey] = useState<'24h' | '7d' | '30d' | '90d'>('90d');
  const { data, loading, error, status, refresh } = usePublicStatus();
  const customBackend = getCustomBackendUrl();
  const days = data?.daily.slice(-90)
    ?? Array.from({ length: 90 }, (_, index) => ({ day: String(index), status: 'unknown' as const }));
  const services = [
    { name: 'LANIS', state: data ? 'up' as const : 'unknown' as const },
    { name: 'Schulportal Hessen', state: status },
  ];
  const featureReadings = data?.current.features?.length
    ? data.current.features
    : [{ name: 'login', status: 'unknown' as const }, { name: 'modules', status: 'unknown' as const }];
  const windowSummary: (Omit<NonNullable<PublicStatus['summary_windows']>['90d'], 'latency'> & { latency?: NonNullable<PublicStatus['summary_windows']>['90d']['latency'] }) | undefined = data?.summary_windows?.[windowKey] ?? (windowKey === '90d' ? data?.summary : undefined);

  return (
    <div className="min-h-[100dvh] bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      <SEO title="Status" description="Aktueller Status von LANIS und Schulportal Hessen." path="/status" />
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8">
        <nav className="flex items-center justify-between" aria-label="Status-Navigation">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <AppIcon alt="" className="h-7 w-7 rounded-lg" />
            Lanis
          </Link>
          <Link to="/dashboard" className="btn btn-secondary text-sm">Zur App</Link>
        </nav>

        <main className="pb-16 pt-14 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Status</h1>
              {customBackend && <p className="mt-2 text-sm text-surface-500">Eigenes Backend</p>}
            </div>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 dark:text-primary-400 dark:hover:bg-primary-950"
            >
              Aktualisieren
            </button>
          </div>

          <section className="mt-8 overflow-hidden rounded-2xl border bg-white dark:bg-surface-900" aria-label="Dienste">
            {services.map((service, index) => (
              <div
                key={service.name}
                className={`flex items-center justify-between gap-4 px-5 py-5 sm:px-6 ${index > 0 ? 'border-t' : ''}`}
              >
                <span className="font-medium">{service.name}</span>
                <span className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColors[service.state]}`} />
                  {loading ? 'Wird geladen' : statusLabels[service.state]}
                </span>
              </div>
            ))}
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Komponentenstatus">
            {featureReadings.map(feature => (
              <div key={feature.name} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 dark:bg-surface-900">
                <div><p className="text-sm font-medium">{feature.name === 'login' ? 'Anmeldung' : 'Module'}</p><p className="text-xs text-surface-500">{status === 'unknown' ? 'Keine aktuelle Messung' : feature.latency_ms == null ? 'Keine Latenzmessung' : `${feature.latency_ms} ms aktuell`}{data?.summary_windows?.[windowKey]?.latency?.features?.[feature.name]?.p95 == null ? '' : ` · p95 ${data.summary_windows[windowKey].latency?.features?.[feature.name]?.p95} ms`}</p></div>
                <span className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300"><span className={`h-2.5 w-2.5 rounded-full ${statusColors[status === 'unknown' ? 'unknown' : feature.status]}`} />{statusLabels[status === 'unknown' ? 'unknown' : feature.status]}</span>
              </div>
            ))}
          </section>

          <p className="mt-3 text-sm text-surface-500">
            {error ? 'Status nicht verfügbar' : `Stand: ${formatTimestamp(data?.current.checked_at ?? null)}`}
          </p>

          <section className="mt-12" aria-labelledby="history-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="history-title" className="text-xl font-semibold">Verfügbarkeit</h2>
                <p className="mt-1 text-sm text-surface-500">
                  Abdeckung {formatPercent(windowSummary?.coverage_percent ?? null)}
                </p>
              </div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatPercent(windowSummary?.uptime_percent ?? null)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Auswertungszeitraum">
              {([['24h', '24 Stunden'], ['7d', '7 Tage'], ['30d', '30 Tage'], ['90d', '90 Tage']] as const).map(([key, label]) => (
                <button key={key} type="button" disabled={!data?.summary_windows && key !== '90d'} aria-pressed={windowKey === key} onClick={() => setWindowKey(key)} className={`rounded-full border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${windowKey === key ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'border-surface-200 text-surface-500 dark:border-surface-700'}`}>{label}</button>
              ))}
              {windowSummary?.latency?.overall?.median != null && <span className="self-center text-xs text-surface-500">Median {windowSummary.latency.overall.median} ms · p95 {windowSummary.latency.overall.p95 ?? '—'} ms</span>}
            </div>

            <p className="mt-6 text-xs text-surface-500">Täglicher Status über die letzten 90 Tage</p>
            <div
              className="mt-3 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(18,minmax(0,1fr))] sm:gap-2.5"
              aria-label="Täglicher Status der letzten 90 Tage"
              data-status-history
            >
              {days.map(day => (
                <span
                  key={day.day}
                  title={`${day.day}: ${statusLabels[day.status]}`}
                  className={`aspect-square rounded-full ${statusColors[day.status]}`}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-4 text-xs text-surface-500">
              {Object.entries(statusLabels).map(([key, label]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${statusColors[key as keyof typeof statusColors]}`} />
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-12 border-t pt-8" aria-labelledby="incidents-title">
            <h2 id="incidents-title" className="text-xl font-semibold">Störungen</h2>
            {!data ? (
              <p className="mt-4 text-sm text-surface-500">Keine Daten</p>
            ) : data.incidents.length === 0 ? (
              <p className="mt-4 text-sm text-surface-500">Keine Störungen</p>
            ) : (
              <ul className="mt-3 divide-y">
                {data.incidents.slice(0, 10).map((incident, index) => {
                  const hasResolution = Object.prototype.hasOwnProperty.call(incident, 'resolved_at');
                  const isOngoing = hasResolution && incident.resolved_at === null;
                  return (
                  <li key={`${incident.started_at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                    <div><time className="text-surface-500">{formatTimestamp(incident.started_at || incident.checked_at || null)}</time><p className="mt-1 text-xs text-surface-500">{incident.resolved_at ? `Resolved ${formatTimestamp(incident.resolved_at)}` : isOngoing ? 'Ongoing' : 'Historical observation'} · {incident.checks ?? 1} confirmed checks{incident.affected_features?.length ? ` · ${incident.affected_features.map(name => name === 'login' ? 'Anmeldung' : 'Module').join(', ')}` : ''}</p></div>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColors[incident.status]}`} />
                      {incident.resolved_at ? 'Behoben' : statusLabels[incident.status]}
                    </span>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>

        <footer className="flex gap-6 border-t py-6 text-sm text-surface-500">
          <Link to="/">Startseite</Link>
          <Link to="/impressum">Impressum</Link>
          <Link to="/privacy-policy">Datenschutz</Link>
        </footer>
      </div>
    </div>
  );
}

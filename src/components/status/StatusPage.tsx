import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import SEO from '../seo/SEO';
import {
  formatPercent,
  formatTimestamp,
  getEffectiveDailyStatus,
  incidentsForDay,
  statusColors,
  statusLabels,
  PublicIncident,
  PublicStatus,
  ServiceStatus,
  usePublicStatus,
} from '../../services/publicStatus';
import { getCustomBackendUrl } from '../../utils/backendConfig';

type HistoryDay = { day: string; sourceDay: string; status: ServiceStatus };

function formatIncidentDay(day: string): string {
  const timestamp = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : day;
}

export default function StatusPage() {
  const [windowKey, setWindowKey] = useState<'24h' | '7d' | '30d' | '90d'>('90d');
  const { data, loading, error, status, refresh } = usePublicStatus();
  const customBackend = getCustomBackendUrl();
  const windowLabels = {
    '24h': '24 Stunden',
    '7d': '7 Tage',
    '30d': '30 Tage',
    '90d': '90 Tage',
  } as const;
  const windowDays = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 } as const;
  const historyGridClasses = {
    '24h': 'grid-cols-1 max-w-xs',
    '7d': 'grid-cols-7 gap-1 sm:gap-2',
    '30d': 'grid-cols-10 gap-2.5 sm:grid-cols-[repeat(15,minmax(0,1fr))] sm:gap-3',
    '90d': 'grid-cols-[repeat(15,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(18,minmax(0,1fr))] sm:gap-2.5',
  } as const;
  const historyBubbleClasses = {
    '24h': 'h-8 rounded-[2px]',
    '7d': 'h-8 rounded-[2px]',
    '30d': 'aspect-square rounded-full',
    '90d': 'aspect-square rounded-full',
  } as const;
  const selectedWindowLabel = windowLabels[windowKey];
  const selectedDays = windowDays[windowKey];
  const days: HistoryDay[] = (data?.daily.slice(-selectedDays)
    ?? Array.from({ length: selectedDays }, (_, index) => ({ day: String(index), status: 'unknown' as const })))
    .map(day => ({ ...day, sourceDay: day.day }));
  const latestDay: HistoryDay = days[0] ?? { day: 'unknown', sourceDay: 'unknown', status: 'unknown' };
  const historyDays: HistoryDay[] = windowKey === '24h' ? [latestDay] : days;
  const statusForHistoryDay = (day: HistoryDay): ServiceStatus => {
    return getEffectiveDailyStatus(day.sourceDay, day.status, data?.incidents ?? []);
  };
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
      <SEO
        title="Schulportal Hessen Status & Uptime"
        description="Schulportal Hessen Statusseite mit Uptime, Verfügbarkeit und aktuellen Störungen. Ein Status-Feature von Lanis für das SPH mit 24-Stunden-, 7-, 30- und 90-Tage-Verlauf."
        path="/status"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Schulportal Hessen Status & Uptime',
          description: 'Uptime, Verfügbarkeit und aktuelle Störungen des Schulportal Hessen – ein Status-Feature von Lanis.',
          url: 'https://lanis.arg-server.de/status',
          isPartOf: { '@type': 'WebSite', name: 'Lanis', url: 'https://lanis.arg-server.de' },
          about: {
            '@type': 'Service',
            name: 'Schulportal Hessen',
            serviceType: 'Status- und Uptime-Monitoring',
            provider: { '@type': 'Organization', name: 'Lanis', url: 'https://lanis.arg-server.de' },
          },
        }}
      />
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
              <h1 className="text-4xl font-semibold tracking-tight">Schulportal Hessen Status</h1>
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
                <div><p className="text-sm font-medium">{feature.name === 'login' ? 'Anmeldung' : 'Module'}</p><p className="text-xs text-surface-500">{status === 'unknown' ? 'Keine aktuelle Messung' : feature.latency_ms == null ? 'Keine Latenzmessung' : `${feature.latency_ms} ms aktuell`}{data?.summary_windows?.[windowKey]?.latency?.features?.[feature.name]?.median == null ? '' : ` · Median ${data.summary_windows[windowKey].latency?.features?.[feature.name]?.median} ms`}{data?.summary_windows?.[windowKey]?.latency?.features?.[feature.name]?.p95 == null ? '' : ` · p95 ${data.summary_windows[windowKey].latency?.features?.[feature.name]?.p95} ms`}</p></div>
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
                <p className="mt-1 text-sm text-surface-500">Im ausgewählten Zeitraum · Datenabdeckung {formatPercent(windowSummary?.coverage_percent ?? null)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold tracking-tight">
                  {formatPercent(windowSummary?.uptime_percent ?? null)}
                </p>
                {windowSummary?.latency?.overall?.median != null && <p className="mt-1 text-xs text-surface-500">Median {windowSummary.latency.overall.median} ms · p95 {windowSummary.latency.overall.p95 ?? '—'} ms</p>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Auswertungszeitraum">
              {([['24h', '24 Stunden'], ['7d', '7 Tage'], ['30d', '30 Tage'], ['90d', '90 Tage']] as const).map(([key, label]) => (
                <button key={key} type="button" disabled={!data?.summary_windows?.[key] && key !== '90d'} aria-pressed={windowKey === key} onClick={() => setWindowKey(key)} className={`rounded-full border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${windowKey === key ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'border-surface-200 text-surface-500 dark:border-surface-700'}`}>{label}</button>
              ))}
            </div>

            <div
              className={`mt-6 grid w-full items-center ${historyGridClasses[windowKey]}`}
              aria-label={`Statusverlauf der letzten ${selectedWindowLabel}`}
              data-status-history
            >
              {historyDays.map((day, index) => {
                const dayStatus = statusForHistoryDay(day);
                const dayIncidents = dayStatus === 'degraded' || dayStatus === 'down'
                  ? incidentsForDay(data?.incidents ?? [], day.sourceDay)
                  : [];
                const tooltipId = `incident-${day.day}`;
                const tooltipPosition = index === 0
                  ? 'left-0 translate-x-0 sm:left-1/2 sm:-translate-x-1/2'
                  : index === historyDays.length - 1
                    ? 'right-0 left-auto translate-x-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2'
                    : 'left-1/2 -translate-x-1/2';
                return (
                  <span
                    key={day.day}
                    tabIndex={0}
                    aria-label={`${day.sourceDay}: ${statusLabels[dayStatus]}`}
                    aria-describedby={dayIncidents.length ? tooltipId : undefined}
                    className={`group relative min-w-0 outline-none ${historyBubbleClasses[windowKey]} ${statusColors[dayStatus]} transition-transform hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-primary-500`}
                  >
                    {dayIncidents.length > 0 && (
                      <span id={tooltipId} role="tooltip" className={`pointer-events-auto absolute bottom-full z-20 mb-0 hidden w-72 cursor-text select-text rounded-xl border border-surface-200 bg-white p-3 text-left text-xs text-surface-700 shadow-xl group-hover:block group-focus:block dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 ${tooltipPosition}`}>
                        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.12em] text-surface-400">Störung · {formatIncidentDay(day.sourceDay)}</span>
                        <span className="space-y-3">
                          {dayIncidents.map((incident, index) => (
                            <span key={`${incident.started_at}-${index}`} className="block border-t border-surface-100 pt-3 first:border-0 first:pt-0 dark:border-surface-800">
                              <span className="flex items-center gap-2 font-semibold text-surface-900 dark:text-surface-100">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${statusColors[incident.status]}`} />
                                {statusLabels[incident.status]}
                              </span>
                              <span className="mt-1 block text-[11px] text-surface-500">{formatTimestamp(incident.started_at || incident.checked_at || null)} – {Object.prototype.hasOwnProperty.call(incident, 'resolved_at') ? incident.resolved_at ? formatTimestamp(incident.resolved_at) : 'Noch aktiv' : 'Historische Messung'}</span>
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {incident.affected_features?.map(feature => <span key={feature} className="rounded-md bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">{feature === 'login' ? 'Anmeldung' : 'Module'}</span>)}
                                <span className="rounded-md bg-surface-100 px-1.5 py-0.5 text-[10px] text-surface-500 dark:bg-surface-800 dark:text-surface-400">{incident.checks ?? 1} bestätigte Checks</span>
                              </span>
                              {incident.error && <code className="mt-2 block break-words rounded-md bg-surface-50 px-2 py-1 text-[10px] text-surface-500 dark:bg-surface-950 dark:text-surface-400">{incident.error}</code>}
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                  </span>
                );
              })}
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

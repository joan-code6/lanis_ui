import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import SEO from '../seo/SEO';
import {
  formatPercent,
  formatTimestamp,
  statusColors,
  statusLabels,
  usePublicStatus,
} from '../../services/publicStatus';
import { getCustomBackendUrl } from '../../utils/backendConfig';

export default function StatusPage() {
  const { data, loading, error, status, refresh } = usePublicStatus();
  const customBackend = getCustomBackendUrl();
  const days = data?.daily.slice(-90)
    ?? Array.from({ length: 90 }, (_, index) => ({ day: String(index), status: 'unknown' as const }));
  const services = [
    { name: 'LANIS', state: data ? 'up' as const : 'unknown' as const },
    { name: 'Schulportal Hessen', state: status },
  ];

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

          <p className="mt-3 text-sm text-surface-500">
            {error ? 'Status nicht verfügbar' : `Stand: ${formatTimestamp(data?.current.checked_at ?? null)}`}
          </p>

          <section className="mt-12" aria-labelledby="history-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="history-title" className="text-xl font-semibold">Letzte 90 Tage</h2>
                <p className="mt-1 text-sm text-surface-500">
                  Abdeckung {formatPercent(data?.summary.coverage_percent ?? null)}
                </p>
              </div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatPercent(data?.summary.uptime_percent ?? null)}
              </p>
            </div>

            <div
              className="mt-6 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(18,minmax(0,1fr))] sm:gap-2.5"
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
                {data.incidents.slice(0, 5).map((incident, index) => (
                  <li key={`${incident.checked_at}-${index}`} className="flex items-center justify-between gap-4 py-4 text-sm">
                    <time className="text-surface-500">{formatTimestamp(incident.checked_at)}</time>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColors[incident.status]}`} />
                      {statusLabels[incident.status]}
                    </span>
                  </li>
                ))}
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

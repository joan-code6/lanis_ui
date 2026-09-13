import { Link } from 'react-router-dom';
import { formatPercent, usePublicStatus } from '../../services/publicStatus';

export default function ResilienceSection() {
  const { data } = usePublicStatus();
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24" aria-labelledby="resilience-title">
      <div className="rounded-3xl border bg-white p-7 dark:bg-surface-900 sm:p-10">
        <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Auch wenn’s beim Schulportal hakt</p>
        <div className="mt-4 grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div><h2 id="resilience-title" className="max-w-xl text-3xl font-semibold tracking-tight">Schulportal down?<br />Deine geladenen Daten bleiben da.</h2><p className="mt-4 max-w-xl leading-relaxed text-surface-600 dark:text-surface-400">Mit LANIS kannst du bereits gespeicherte Inhalte auch bei Schulportal-Störungen weiter ansehen.</p><p className="mt-2 text-xs text-surface-500">Für angemeldete Nutzer, solange gespeicherte Daten verfügbar sind – bis zu 24 Stunden nach dem Abruf.</p></div>
          <div className="md:text-right">{data?.summary.uptime_percent != null && <><p className="font-mono text-3xl">{formatPercent(data.summary.uptime_percent)}</p><p className="mt-2 max-w-56 text-xs leading-relaxed text-surface-500">erfolgreiche Schulportal-Prüfungen · {data.summary.period_days} Tage · {formatPercent(data.summary.coverage_percent)} Messabdeckung</p></>}<Link to="/status" className="mt-5 inline-flex rounded-md text-sm font-semibold text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 dark:text-primary-400">Live-Status ansehen →</Link></div>
        </div>
      </div>
    </section>
  );
}

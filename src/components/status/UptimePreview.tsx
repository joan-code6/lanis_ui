import { Link } from 'react-router-dom';
import { formatPercent, statusColors, statusLabels, usePublicStatus } from '../../services/publicStatus';

export default function UptimePreview() {
  const { data, status } = usePublicStatus();
  const days = data?.daily.slice(-90)
    ?? Array.from({ length: 90 }, (_, index) => ({ day: String(index), status: 'unknown' as const }));

  return (
    <Link
      to="/status"
      aria-label="Öffentlichen Status ansehen"
      className="flex h-full w-full items-center justify-center p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary-500 sm:p-9"
    >
      <div className="w-full max-w-sm rounded-2xl border border-black/[0.05] bg-white p-5 shadow-soft-md dark:border-white/[0.08] dark:bg-surface-900 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-surface-500">Schulportal Hessen</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-100">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
              {statusLabels[status]}
            </p>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">
            {formatPercent(data?.summary.uptime_percent ?? null)}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2" aria-hidden="true" data-status-history>
          {days.map(day => (
            <span
              key={day.day}
              title={`${day.day}: ${statusLabels[day.status]}`}
              className={`aspect-square rounded-full ${statusColors[day.status]}`}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-surface-500">
          <span>Letzte 90 Tage</span>
          <span>Status ansehen →</span>
        </div>
      </div>
    </Link>
  );
}

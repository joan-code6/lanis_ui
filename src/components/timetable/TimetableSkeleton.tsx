import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { TimetableLayoutMode } from '../../types';

const LessonPlaceholder: React.FC = () => (
  <div className="rounded-xl border p-3" aria-hidden="true">
    <div className="skeleton h-5 w-3/4 mb-3" />
    <div className="skeleton h-4 w-1/2 mb-2" />
    <div className="skeleton h-4 w-2/3" />
  </div>
);

const TimetableSkeleton: React.FC<{ dates: Date[]; layoutMode: TimetableLayoutMode }> = ({ dates, layoutMode }) => (
  <div role="status" aria-busy="true" aria-label="Stundenplan wird geladen">
    <span className="sr-only">Stundenplan wird geladen …</span>
    {layoutMode === 'compact' ? (
      <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="grid border-b" style={{ gridTemplateColumns: `clamp(2.75rem, 10vw, 6rem) repeat(${dates.length}, minmax(0, 1fr))` }}>
          <div className="border-r bg-surface-50 px-0.5 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-surface-400 sm:px-3 sm:py-3 sm:text-left sm:text-xs dark:bg-surface-800/60">Std.</div>
          {dates.map(date => (
            <div key={date.toISOString()} className="px-0.5 py-2 text-center text-[10px] font-semibold sm:px-3 sm:py-3 sm:text-left sm:text-sm">
              <span className="sm:hidden">{format(date, 'EE', { locale: de })}</span>
              <span className="hidden sm:inline">{format(date, 'EEEE', { locale: de })}</span>
              <span className="mt-0.5 block text-[9px] font-normal text-surface-500 sm:text-xs">{format(date, 'dd.MM.')}</span>
            </div>
          ))}
          <div className="border-r bg-surface-50 dark:bg-surface-800/40" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-16 border-t flex items-center justify-center"><div className="skeleton h-4 w-4" /></div>)}
          </div>
          {dates.map(date => (
            <div key={date.toISOString()} className="border-r last:border-r-0" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 border-t p-0.5 sm:p-1"><div className="skeleton h-full w-full rounded-md sm:rounded-xl" /></div>)}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="scrollbar-hide -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:gap-4 xl:grid-cols-5">
        {dates.map(date => (
          <section key={date.toISOString()} className="card min-w-[84vw] snap-start !p-0 overflow-hidden sm:min-w-0">
            <div className="border-b px-4 py-3 bg-surface-50 dark:bg-surface-800/50">
              <h2 className="font-semibold text-surface-900 dark:text-white">{format(date, 'EEEE', { locale: de })}</h2>
              <p className="mt-0.5 text-xs text-surface-500">{format(date, 'd. MMMM', { locale: de })}</p>
            </div>
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }, (_, i) => <LessonPlaceholder key={i} />)}
            </div>
          </section>
        ))}
      </div>
    )}
  </div>
);

export default TimetableSkeleton;

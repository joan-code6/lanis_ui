import React from 'react';
import { AcademicCapIcon, UserIcon } from '@heroicons/react/24/outline';

const Block: React.FC<{ className: string }> = ({ className }) => (
  <div aria-hidden="true" className={`skeleton max-w-full ${className}`} />
);

export const DashboardModulesSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => (
  <div aria-busy="true" aria-label="Module werden geladen" className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className={`card ${viewMode === 'grid' ? 'p-5' : 'flex items-center gap-3 p-3 sm:gap-4 sm:p-4'}`}>
        {viewMode === 'grid' ? (
          <div className="flex min-h-[168px] flex-col items-center">
            <Block className="h-16 w-16 rounded-2xl" />
            <Block className="mt-4 h-5 w-32" />
            <Block className="mt-2 h-[22px] w-20" />
            <span className="mt-2 text-[11px] font-medium text-surface-400">Modul</span>
          </div>
        ) : (
          <><Block className="h-12 w-12 shrink-0" /><div className="flex-1 space-y-1"><Block className="h-5 w-40" /><Block className="h-[22px] w-24" /></div></>
        )}
      </div>
    ))}
  </div>
);

export const MessagesListSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Nachrichten werden geladen">
      <div aria-hidden="true" className="flex-1 overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full shrink-0 bg-surface-100 dark:bg-surface-700 flex items-center justify-center"><UserIcon className="h-4 w-4 text-surface-400" /></div>
            <div className="flex-1 min-w-0"><Block className="h-5 w-4/5" /><Block className="mt-0.5 h-4 w-1/2" /></div>
          </div>
        ))}
      </div>
  </div>
);

export const CoursesGridSkeleton: React.FC = () => (
    <div aria-busy="true" aria-label="Kurse werden geladen" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card">
          <div className="flex items-center mb-4"><div className="h-12 w-12 shrink-0 rounded-lg bg-primary-600 flex items-center justify-center"><AcademicCapIcon className="h-6 w-6 text-white" /></div><div className="ml-4 flex-1"><Block className="h-7 w-3/4" /><Block className="h-5 w-1/2" /></div></div>
          <Block className="h-5 w-full" /><Block className="mt-2 h-5 w-28" />
          <div className="mt-2 rounded border border-surface-200 dark:border-surface-700 p-2"><div className="mb-1 text-xs font-medium text-surface-500">Hausaufgaben:</div><Block className="h-5 w-full" /><Block className="h-5 w-3/4" /></div>
        </div>
      ))}
    </div>
);

export const CourseEntriesSkeleton: React.FC = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Kurs wird geladen">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="card" aria-hidden="true">
        <Block className="h-5 w-40 mb-4" />
        <Block className="h-5 w-3/4 mb-3" />
        <Block className="h-4 w-full" />
      </div>
    ))}
  </div>
);

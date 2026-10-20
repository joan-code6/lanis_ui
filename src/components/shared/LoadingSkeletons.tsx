import React from 'react';

const Block: React.FC<{ className: string }> = ({ className }) => (
  <div aria-hidden="true" className={`skeleton max-w-full ${className}`} />
);

const PageHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="page-header">
    <h1 className="page-title">{title}</h1>
    <p className="page-subtitle">{subtitle}</p>
  </div>
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
            <Block className="mt-2 h-4 w-10" />
          </div>
        ) : (
          <><Block className="h-12 w-12 shrink-0" /><div className="flex-1 space-y-1"><Block className="h-5 w-40" /><Block className="h-[22px] w-24" /></div></>
        )}
      </div>
    ))}
  </div>
);

export const MessagesSkeleton: React.FC = () => (
  <div className="h-[calc(100dvh-3.5rem)] md:h-screen flex overflow-hidden" aria-busy="true" aria-label="Nachrichten werden geladen">
    <div className="w-full lg:w-80 xl:w-1/3 border-r border-surface-100 dark:border-surface-800 flex flex-col bg-white dark:bg-surface-900">
      <div className="p-4 border-b border-surface-100 dark:border-surface-800">
        <div className="flex items-center justify-between mb-4"><h1 className="text-lg font-bold tracking-tight text-surface-900 dark:text-surface-100">Nachrichten</h1><Block className="h-9 w-20" /></div>
        <Block className="h-[42px] w-full" />
      </div>
      <div aria-hidden="true" className="flex-1 overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <Block className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 min-w-0"><Block className="h-5 w-4/5" /><Block className="mt-0.5 h-4 w-1/2" /></div>
          </div>
        ))}
      </div>
    </div>
    <div aria-hidden="true" className="hidden lg:flex flex-1 items-center justify-center"><Block className="h-12 w-12 rounded-2xl" /></div>
  </div>
);

export const CoursesSkeleton: React.FC = () => (
  <div className="p-6" aria-busy="true" aria-label="Kurse werden geladen">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Mein Unterricht</h1>
      <div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row"><Block className="h-[42px] w-full sm:w-28" /><Block className="h-[42px] w-full sm:w-40" /></div>
    </div>
    <div aria-hidden="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card">
          <div className="flex items-center mb-4"><Block className="h-12 w-12 shrink-0" /><div className="ml-4 flex-1"><Block className="h-7 w-3/4" /><Block className="h-5 w-1/2" /></div></div>
          <Block className="h-5 w-full" /><Block className="mt-2 h-5 w-28" />
          <div className="mt-2 rounded border border-surface-200 dark:border-surface-700 p-2"><Block className="h-4 w-24 mb-1" /><Block className="h-5 w-full" /><Block className="h-5 w-3/4" /></div>
        </div>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="p-4 sm:p-6 max-w-6xl mx-auto" aria-busy="true" aria-label="Profil wird geladen">
    <PageHeader title="Profil" subtitle="Ihre Benutzerinformationen und Kontodetails" />
    <div aria-hidden="true" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card">
        <div className="flex items-center gap-4 mb-6"><Block className="h-16 w-16 rounded-2xl shrink-0" /><div className="flex-1 space-y-1"><Block className="h-7 w-40" /><Block className="h-5 w-28" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3 p-3.5 border border-surface-200 dark:border-surface-700 rounded-xl"><Block className="h-5 w-5 shrink-0" /><div className="flex-1"><Block className="h-4 w-20" /><Block className="h-5 w-28" /></div></div>)}
        </div>
      </div>
      <div className="space-y-5">{['security', 'status'].map(section => <div key={section} className="card"><Block className="h-5 w-24 mb-4" /><div className="space-y-3">{Array.from({ length: 2 }, (_, i) => <Block key={i} className="h-[22px] w-full" />)}</div></div>)}</div>
    </div>
  </div>
);

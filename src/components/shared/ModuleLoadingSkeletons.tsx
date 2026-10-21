import React from 'react';
import {
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`skeleton max-w-full ${className}`} />
);
const Loading: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = '' }) => (
  <div role="status" aria-busy="true" aria-label={label} className={className}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">{children}</div>
  </div>
);

export const FileStorageSkeleton = () => (
  <Loading label="Dateispeicher wird geladen">
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
        Ordner
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card flex items-start gap-3">
            <FolderIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" />
            <div className="min-w-0 flex-1">
              <Bar className="h-6 w-32" />
              <Bar className="mt-1 h-5 w-40" />
            </div>
          </div>
        ))}
      </div>
    </section>
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
        Dateien
      </h2>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40">
              <DocumentTextIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <Bar className="h-6 w-48" />
              <Bar className="mt-1 h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  </Loading>
);

export const FileDistributionSkeleton = () => (
  <Loading label="Verteilte Dateien werden geladen">
    <div className="space-y-8">
      {[0, 1].map((i) => (
        <section
          key={i}
          className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-5"
        >
          <div className="flex items-center gap-2.5 md:block">
            <Bar className="h-9 w-9 shrink-0 rounded-xl" />
            <Bar className="h-5 w-28 md:mt-2" />
          </div>
          <div className="min-w-0 rounded-2xl border border-surface-200 bg-white p-4 shadow-soft dark:border-surface-800 dark:bg-surface-900 sm:p-5">
            <Bar className="h-6 w-48" />
            <Bar className="mt-1 h-4 w-32" />
            <Bar className="mt-3 h-6 w-full" />
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-2.5 dark:border-surface-700 dark:bg-surface-950/60">
              <DocumentTextIcon className="h-9 w-9 shrink-0 p-2 text-primary-600 dark:text-primary-300" />
              <Bar className="h-5 w-40" />
            </div>
          </div>
        </section>
      ))}
    </div>
  </Loading>
);

export const VideoRoomsSkeleton = () => (
  <Loading label="Videoräume werden geladen">
    <Bar className="mb-3 h-5 w-48" />
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Bar className="h-6 w-48" />
              <Bar className="mt-1 h-5 w-32" />
              <Bar className="mt-1 h-5 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </Loading>
);

export const SubstitutionPlanSkeleton = () => (
  <Loading label="Vertretungsplan wird geladen">
    <div className="mb-4 flex gap-2 overflow-hidden pb-1">
      {[0, 1, 2].map((i) => (
        <Bar key={i} className="h-10 w-32 shrink-0 rounded-xl" />
      ))}
    </div>
    <Bar className="mb-5 h-4 w-64" />
    <div className="mb-5 flex items-center gap-2">
      <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
        Klasse
      </span>
      <Bar className="h-10 w-36" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card !p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-surface-100 bg-surface-50 px-4 py-3 dark:border-surface-800 dark:bg-surface-800/50">
            <div className="min-w-0">
              <Bar className="h-4 w-20" />
              <Bar className="mt-0.5 h-6 w-32" />
            </div>
            <Bar className="h-6 w-12" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
            {['Klasse', 'Raum', 'Lehrkraft', 'Vertretung', 'Lerngruppe'].map(
              (label) => (
                <div key={label}>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {label}
                  </p>
                  <Bar className="mt-1 h-5 w-16" />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  </Loading>
);

export const AttendanceSkeleton = () => (
  <Loading label="Anwesenheit wird geladen">
    <div className="mb-6 rounded-xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/40">
      <Bar className="h-5 w-72" />
    </div>
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h2 className="section-title">Gesamt</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['Anwesend', 'Entschuldigt', 'Unentschuldigt', 'Fehlend'].map(
          (label) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-surface-100 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-800/60"
            >
              <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                {label}
              </span>
              <Bar className="mt-2 h-7 w-12" />
              <p className="text-xs text-surface-400 dark:text-surface-500">
                Unterrichtsstunden
              </p>
            </div>
          ),
        )}
      </div>
    </section>
    <section>
      <h2 className="mb-3 section-title">Nach Kurs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card">
            <Bar className="h-6 w-40" />
            <Bar className="mt-1 h-5 w-28" />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <Bar key={j} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  </Loading>
);

export const ConversationSkeleton = () => (
  <Loading
    label="Nachrichtenverlauf wird geladen"
    className="flex-1 overflow-y-auto p-6"
  >
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
              <UserIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex justify-between gap-2">
                <Bar className="h-5 w-28" />
                <Bar className="h-4 w-16" />
              </div>
              <Bar className="h-5 w-full" />
              <Bar className="mt-1 h-5 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </Loading>
);

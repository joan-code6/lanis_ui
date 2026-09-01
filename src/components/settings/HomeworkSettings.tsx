import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usePreferences } from '../../contexts/PreferencesContext';

const HomeworkSettings: React.FC = () => {
  const { preferences, updatePreferences, isSaving } = usePreferences();
  const hideCompletedInOverview = preferences.homework.hide_completed_in_overview;

  const toggleCompletedInOverview = () => {
    void updatePreferences({
      homework: { hide_completed_in_overview: !hideCompletedInOverview },
    });
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              Erledigte Hausaufgaben in der Übersicht ausblenden
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-surface-500">
              Nach dem Abhaken verschwindet die Hausaufgabe aus „Mein Unterricht“. In den Kursdetails bleibt sie sichtbar.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCompletedInOverview}
            disabled={isSaving}
            className={clsx(
              'relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ease-out-expo disabled:cursor-not-allowed disabled:opacity-60',
              hideCompletedInOverview ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700',
            )}
            role="switch"
            aria-checked={hideCompletedInOverview}
            aria-label="Erledigte Hausaufgaben in der Übersicht ausblenden"
          >
            <span
              className={clsx(
                'absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-soft transition-transform duration-300 ease-out-expo',
                hideCompletedInOverview ? 'translate-x-7' : 'translate-x-0',
              )}
            >
              <span className={clsx('h-2 w-2 rounded-full', hideCompletedInOverview ? 'bg-primary-600' : 'bg-surface-400')} />
            </span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 border-t border-surface-100 pt-5 dark:border-surface-800 sm:grid-cols-2">
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 dark:border-amber-500 dark:bg-amber-950/35">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              <ClockIcon className="h-4 w-4" />
              Offen
            </div>
            <p className="mt-2 text-sm text-amber-950 dark:text-amber-100">Arbeitsblatt fertigstellen</p>
          </div>
          <div
            className={clsx(
              'rounded-xl border-l-4 p-3 transition-colors',
              hideCompletedInOverview
                ? 'border-dashed border-surface-300 bg-surface-50 dark:border-surface-600 dark:bg-surface-800/60'
                : 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/35',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <CheckCircleIcon className="h-4 w-4" />
              {hideCompletedInOverview ? 'In der Übersicht ausgeblendet' : 'Erledigt · weiterhin sichtbar'}
            </div>
            <p className="mt-2 text-sm text-surface-500 line-through decoration-surface-400">Arbeitsblatt fertigstellen</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeworkSettings;

import React from 'react';
import { CheckCircleIcon, ClockIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usePreferences } from '../../contexts/PreferencesContext';
import { CompletedHomeworkDisplay } from '../../types';

const displayOptions: Array<{ id: CompletedHomeworkDisplay; title: string; description: string }> = [
  { id: 'orange', title: 'Orange · deutlich', description: 'Erledigte Aufgaben bleiben auffällig markiert.' },
  { id: 'green', title: 'Grün · dezent', description: 'Ein grüner Status zeigt sie, ohne offene Aufgaben zu überstrahlen.' },
  { id: 'hidden', title: 'Ausblenden', description: 'Erledigte Aufgaben verschwinden aus der Übersicht.' },
];

const HomeworkSettings: React.FC = () => {
  const { preferences, updatePreferences, isSaving } = usePreferences();
  const selectedDisplay = preferences.homework.completed_display;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Erledigte Hausaufgaben in „Mein Unterricht“</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-surface-500">
          Wähle, wie erledigte Aufgaben in der Übersicht aussehen. In den Kursdetails bleiben sie immer sichtbar.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Darstellung erledigter Hausaufgaben">
          {displayOptions.map(option => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selectedDisplay === option.id}
              onClick={() => void updatePreferences({ homework: { completed_display: option.id } })}
              disabled={isSaving}
              className={clsx(
                'rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
                selectedDisplay === option.id
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/15 dark:bg-primary-950/40'
                  : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900',
              )}
            >
              <HomeworkPreview display={option.id} />
              <p className="mt-3 text-sm font-semibold">{option.title}</p>
              <p className="mt-1 text-xs leading-5 text-surface-500">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const HomeworkPreview: React.FC<{ display: CompletedHomeworkDisplay }> = ({ display }) => {
  if (display === 'hidden') {
    return (
      <div className="flex h-[4.5rem] items-center justify-center rounded-lg border border-dashed border-surface-300 bg-surface-50 text-center text-xs text-surface-500 dark:border-surface-600 dark:bg-surface-800/70">
        <span><EyeSlashIcon className="mx-auto mb-1 h-4 w-4" />Nicht in der Übersicht</span>
      </div>
    );
  }

  const green = display === 'green';
  return (
    <div className={clsx(
      'h-[4.5rem] rounded-lg border-l-4 p-3',
      green ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/35' : 'border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-950/35',
    )}>
      <div className={clsx('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', green ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300')}>
        {green ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <ClockIcon className="h-3.5 w-3.5" />}
        Erledigt
      </div>
      <p className="mt-1.5 truncate text-xs text-surface-600 line-through decoration-surface-400 dark:text-surface-300">Arbeitsblatt fertigstellen</p>
    </div>
  );
};

export default HomeworkSettings;

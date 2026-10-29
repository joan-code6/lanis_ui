import React from 'react';
import { TimetableLayoutMode } from '../../types';
import { timetableDatesForMode, TimetableViewMode } from '../../utils/timetableView';

export const TimetableRangePreview: React.FC<{ mode: TimetableViewMode }> = ({ mode }) => {
  const today = new Date();
  const days = timetableDatesForMode(mode, today);
  return (
    <span aria-hidden="true" className="settings-preview grid grid-cols-5 gap-1">
      {days.map(day => (
        <span key={day.toISOString()} className="flex min-w-0 flex-col gap-1">
          <span className={`rounded py-1 text-center text-[10px] ${day.toDateString() === today.toDateString() ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-500 dark:bg-surface-800'}`}>{day.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')}</span>
          {[0, 1, 2].map(lesson => <span key={lesson} className="h-2 rounded-sm bg-primary-200 dark:bg-primary-900" />)}
        </span>
      ))}
    </span>
  );
};

export const TimetableLayoutPreview: React.FC<{ mode: TimetableLayoutMode }> = ({ mode }) => (
  <span aria-hidden="true" className="settings-preview">
    {mode === 'cards' ? (
      <span className="grid grid-cols-2 gap-2">
        {['Mo', 'Di'].map(day => <span key={day} className="space-y-1">
          <span className="block text-center text-[10px] text-surface-500">{day}</span>
          {['Mathe', 'Deutsch'].map(subject => <span key={subject} className="block rounded border border-surface-200 bg-surface-50 px-1 py-1 text-[9px] text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">{subject}</span>)}
        </span>)}
      </span>
    ) : (
      <span className="grid grid-cols-5 gap-1">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((day, index) => <span key={day} className="space-y-1">
          <span className="block text-center text-[10px] text-surface-500">{day}</span>
          {[0, 1, 2].map(lesson => <span key={lesson} className={`block h-4 rounded-sm ${['bg-sky-200 dark:bg-sky-900', 'bg-amber-200 dark:bg-amber-900', 'bg-violet-200 dark:bg-violet-900'][(index + lesson) % 3]}`} />)}
        </span>)}
      </span>
    )}
  </span>
);

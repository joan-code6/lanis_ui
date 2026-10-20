import React from 'react';

type Detail = { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode };

// Shared by real lessons and placeholders so their rows and spacing cannot drift.
const TimetableLessonFields: React.FC<{
  title: React.ReactNode;
  secondary?: React.ReactNode;
  badges: React.ReactNode;
  details: Detail[];
}> = ({ title, secondary, badges, details }) => (
  <>
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {title}
        {secondary}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{badges}</div>
    </div>
    <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
      {details.map(({ icon: Icon, value }, index) => (
        <p key={index} className="flex min-h-4 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0" />{value}
        </p>
      ))}
    </div>
  </>
);

export default TimetableLessonFields;

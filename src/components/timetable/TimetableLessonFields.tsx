import React from 'react';

type Detail = { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode };

// Mirror the populated lesson markup without changing its layout.
const TimetableLessonFields: React.FC<{
  title: React.ReactNode;
  secondary?: React.ReactNode;
  badges: React.ReactNode;
  details: Detail[];
}> = ({ title, secondary, badges, details }) => (
  <>
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        {title}
        {secondary}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{badges}</div>
    </div>
    <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
      {details.map(({ icon: Icon, value }, index) => (
        <p key={index} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />{value}
        </p>
      ))}
    </div>
  </>
);

export default TimetableLessonFields;

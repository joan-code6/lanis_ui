import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const DemoBar: React.FC = () => {
  const navigate = useNavigate();

  const handleExit = () => {
    localStorage.removeItem('__demo_mode');
    navigate('/');
  };

  return (
    <div className="box-border flex h-10 min-h-10 flex-shrink-0 bg-primary-50 dark:bg-primary-950/70 border-b border-primary-200 dark:border-primary-900">
      <div className="w-full px-4 sm:px-6 h-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <InformationCircleIcon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-semibold text-primary-800 dark:text-primary-200 whitespace-nowrap">
            Interaktive Vorschau
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex-shrink-0 rounded-lg bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 transition-colors hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-100 dark:hover:bg-primary-800"
        >
          Zur Startseite
        </button>
      </div>
    </div>
  );
};

export default DemoBar;

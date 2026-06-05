import React from 'react';
import { useNavigate } from 'react-router-dom';

const DemoBar: React.FC = () => {
  const navigate = useNavigate();

  const handleExit = () => {
    localStorage.removeItem('__demo_mode');
    navigate('/');
  };

  return (
    <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
      <div className="px-4 sm:px-6 h-10 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
            Demo-Modus
          </span>
          <span className="text-[11px] text-amber-500 dark:text-amber-400 truncate hidden sm:inline">
            Alle Daten sind Platzhalter und nicht echt
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex-shrink-0 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-800/60 hover:bg-amber-200 dark:hover:bg-amber-800 px-3 py-1 rounded-lg transition-colors"
        >
          Demo beenden
        </button>
      </div>
    </div>
  );
};

export default DemoBar;

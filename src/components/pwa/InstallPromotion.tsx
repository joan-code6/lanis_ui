import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { usePwaInstall } from '../../contexts/PwaInstallContext';
import AppIcon from '../AppIcon';

const InstallPromotion: React.FC = () => {
  const { availability, dismissPromotion, isInstalling, requestInstall, shouldPromote } = usePwaInstall();

  if (!shouldPromote) return null;

  const buttonLabel = availability === 'ios-safari'
    || availability === 'ios-browser'
    ? 'So geht’s'
    : 'App installieren';

  return (
    <section
      aria-labelledby="install-promotion-title"
      className="mb-6 overflow-hidden rounded-2xl border border-primary-200/80 bg-primary-50/70 shadow-soft dark:border-primary-800/70 dark:bg-primary-950/25"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <div className="relative shrink-0">
            <AppIcon alt="" className="h-12 w-12 rounded-xl shadow-soft" />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white ring-2 ring-primary-50 dark:ring-primary-950">
              <ArrowDownTrayIcon className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 id="install-promotion-title" className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Lanis schneller öffnen
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-surface-600 dark:text-surface-300">
              Stundenplan, Vertretungen und Nachrichten direkt vom Homescreen starten.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void requestInstall('promotion')}
            disabled={isInstalling}
            className="btn btn-primary flex-1 whitespace-nowrap sm:flex-none"
          >
            {isInstalling ? 'Wird geöffnet…' : buttonLabel}
          </button>
          <button
            type="button"
            onClick={dismissPromotion}
            className="btn btn-ghost whitespace-nowrap"
          >
            Nicht jetzt
          </button>
        </div>
      </div>
    </section>
  );
};

export default InstallPromotion;

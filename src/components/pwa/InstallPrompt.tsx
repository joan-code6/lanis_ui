import React from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_STORAGE_KEY = 'lanis.pwa.installPromptDismissed';

const isStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIosDevice = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent);

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);

  React.useEffect(() => {
    setIsDismissed(window.localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true');
    setIsInstalled(isStandaloneMode());
    setIsIos(isIosDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true' || isStandaloneMode()) {
        return;
      }

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
      setDeferredPrompt(null);
      setIsDismissed(true);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
      setIsInstalled(true);
    } else {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
      setIsDismissed(true);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    setDeferredPrompt(null);
    setIsDismissed(true);
  };

  if (isInstalled || isDismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md">
      <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/80 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-soft-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            <ArrowDownTrayIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  {deferredPrompt ? 'Lanis als App speichern' : 'Lanis zum Homescreen hinzufügen'}
                </p>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {deferredPrompt
                    ? 'Dann kannst du es direkt vom Homescreen öffnen, wie eine echte App.'
                    : 'Auf dem iPhone: Teilen öffnen und „Zum Home-Bildschirm“ wählen.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                aria-label="Nicht mehr anzeigen"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="btn btn-primary flex-1"
                >
                  Installieren
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="btn btn-primary flex-1"
                >
                  Verstanden
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="btn btn-secondary"
              >
                Nicht mehr anzeigen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;

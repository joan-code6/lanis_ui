import React, { useState, useEffect, useRef } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

const SHOW_COUNT_KEY = 'pwa_show_count';
const DISMISSED_DATE_KEY = 'pwa_dismissed_date';
const PERMANENT_DISMISS_KEY = 'pwa_permanent_dismiss';
const FIRST_USAGE_DATE_KEY = 'pwa_first_usage_date';
const NAV_COUNT_KEY = 'pwa_nav_count';

const MIN_NAV_COUNT = 3;
const MIN_PERMANENT_SHOW = 2;

const today = () => new Date().toISOString().slice(0, 10);

const isStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIosDevice = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent);

const isAndroid = () => /android/i.test(window.navigator.userAgent);

let _deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  _deferredPrompt = event as BeforeInstallPromptEvent;
});

export const getDeferredPrompt = () => _deferredPrompt;

const canBrowserInstall = () =>
  _deferredPrompt !== null || isIosDevice() || isAndroid();

const InstallPrompt: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showPermanentOpt, setShowPermanentOpt] = useState(false);
  const accounted = useRef(false);
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (!localStorage.getItem(FIRST_USAGE_DATE_KEY)) {
      localStorage.setItem(FIRST_USAGE_DATE_KEY, today());
    }
    if (localStorage.getItem(PERMANENT_DISMISS_KEY) === 'true') return;
    if (localStorage.getItem(FIRST_USAGE_DATE_KEY) === today()) return;
    if (localStorage.getItem(DISMISSED_DATE_KEY) === today()) return;
  }, []);

  useEffect(() => {
    if (location.pathname !== prevPathname.current) {
      prevPathname.current = location.pathname;
      const count = parseInt(localStorage.getItem(NAV_COUNT_KEY) || '0', 10);
      localStorage.setItem(NAV_COUNT_KEY, String(count + 1));
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsVisible(false);
      accounted.current = false;
      return;
    }
    if (localStorage.getItem(PERMANENT_DISMISS_KEY) === 'true') {
      setIsVisible(false);
      accounted.current = false;
      return;
    }
    if (localStorage.getItem(FIRST_USAGE_DATE_KEY) === today()) {
      setIsVisible(false);
      accounted.current = false;
      return;
    }
    if (localStorage.getItem(DISMISSED_DATE_KEY) === today()) {
      setIsVisible(false);
      accounted.current = false;
      return;
    }
    if (!canBrowserInstall()) {
      setIsVisible(false);
      accounted.current = false;
      return;
    }
    const navCount = parseInt(localStorage.getItem(NAV_COUNT_KEY) || '0', 10);
    if (navCount < MIN_NAV_COUNT) {
      setIsVisible(false);
      accounted.current = false;
      return;
    }

    setIsVisible(true);

    if (!accounted.current) {
      accounted.current = true;
      const count = parseInt(localStorage.getItem(SHOW_COUNT_KEY) || '0', 10);
      const newCount = count + 1;
      localStorage.setItem(SHOW_COUNT_KEY, String(newCount));
      setShowPermanentOpt(newCount > MIN_PERMANENT_SHOW);
    }
  }, [location.pathname]);

  const handleInstall = () => {
    const pwa = document.querySelector('pwa-install') as PwaInstallElement | null;
    pwa?.showDialog(true);
    setIsVisible(false);
    accounted.current = false;
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_DATE_KEY, today());
    setIsVisible(false);
    accounted.current = false;
  };

  const handlePermanentDismiss = () => {
    localStorage.setItem(PERMANENT_DISMISS_KEY, 'true');
    localStorage.setItem(DISMISSED_DATE_KEY, today());
    setIsVisible(false);
    accounted.current = false;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md animate-slide-up">
      <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/80 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-soft-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            <ArrowDownTrayIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Lanis als App speichern
                </p>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  Direkt vom Homescreen öffnen, wie eine echte App.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                aria-label="Später"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="btn btn-primary flex-1"
              >
                Jetzt installieren
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="btn btn-secondary"
              >
                Später
              </button>
              {showPermanentOpt && (
                <button
                  type="button"
                  onClick={handlePermanentDismiss}
                  className="btn btn-ghost w-full mt-1"
                >
                  Nicht mehr anzeigen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;

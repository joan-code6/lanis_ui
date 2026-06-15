import React, { useState, useEffect } from 'react';
import { useTheme, ThemeColor } from '../../contexts/ThemeContext';
import { SunIcon, MoonIcon, CheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import SEO from '../seo/SEO';
import { getDeferredPrompt } from '../pwa/InstallPrompt';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const themeColors: { key: ThemeColor; label: string; hex: string }[] = [
  { key: 'emerald', label: 'Emerald', hex: '#10b981' },
  { key: 'sapphire', label: 'Saphir', hex: '#3b82f6' },
  { key: 'amethyst', label: 'Amethyst', hex: '#a855f7' },
  { key: 'ruby', label: 'Rubin', hex: '#f43f5e' },
  { key: 'amber', label: 'Bernstein', hex: '#f59e0b' },
  { key: 'cyan', label: 'Cyan', hex: '#06b6d4' },
];

const Settings: React.FC = () => {
  const { isDark, toggleDark, themeColor, setThemeColor } = useTheme();
  const [installStatus, setInstallStatus] = useState<'idle' | 'installed' | 'unsupported'>('unsupported');
  const [ghostClicks, setGhostClicks] = useState(0);

  useEffect(() => {
    const prompt = getDeferredPrompt();

    if (prompt) {
      setInstallStatus('idle');
      const el = document.querySelector('pwa-install') as PwaInstallElement | null;
      const onInstalled = () => setInstallStatus('installed');
      el?.addEventListener('pwa-install-success-event', onInstalled);
      return () => {
        el?.removeEventListener('pwa-install-success-event', onInstalled);
      };
    }

    if (isStandalone()) {
      setInstallStatus('installed');
      return;
    }

    const el = document.querySelector('pwa-install') as PwaInstallElement | null;

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isFirefoxMobile = /android/i.test(ua) && /firefox/i.test(ua);
    if (isIos || isFirefoxMobile) {
      setInstallStatus('idle');
    } else {
      const timer = setTimeout(() => {
        const el2 = document.querySelector('pwa-install') as PwaInstallElement | null;
        if (el2?.isInstallAvailable || el2?.isAppleMobilePlatform || el2?.isAndroid) {
          setInstallStatus('idle');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    const onInstalled = () => setInstallStatus('installed');
    el?.addEventListener('pwa-install-success-event', onInstalled);
    return () => {
      el?.removeEventListener('pwa-install-success-event', onInstalled);
    };
  }, []);

  const handleOpenInstall = () => {
    const el = document.querySelector('pwa-install') as PwaInstallElement | null;
    el?.showDialog(true);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <SEO
        title="Einstellungen"
        description="Lanis Einstellungen — Passe das Erscheinungsbild und Design von Lanis an deine Wünsche an."
        path="/settings"
        noindex
      />
      <div className="page-header">
        <h1 className="page-title">Einstellungen</h1>
        <p className="page-subtitle">Erscheinungsbild und Design anpassen</p>
      </div>

      <div className="space-y-6">
        {/* Dark Mode */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Dark Mode</h3>
              <p className="text-sm text-surface-500 mt-0.5">
                {isDark ? 'Dunkles Design ist aktiv' : 'Helles Design ist aktiv'}
              </p>
            </div>
            <button
              onClick={toggleDark}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ease-out-expo ${
                isDark ? 'bg-primary-600' : 'bg-surface-300'
              }`}
              role="switch"
              aria-checked={isDark}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white dark:bg-surface-200 shadow-soft flex items-center justify-center transition-all duration-300 ease-out-expo ${
                  isDark ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                {isDark ? (
                  <MoonIcon className="w-3 h-3 text-primary-600" />
                ) : (
                  <SunIcon className="w-3 h-3 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Color */}
        <div className="card">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">Primärfarbe</h3>
          <p className="text-sm text-surface-500 mb-5">Wähle eine Farbe für das Design</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {themeColors.map((c) => (
              <button
                key={c.key}
                onClick={() => setThemeColor(c.key)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ease-out-expo active:scale-95"
                style={{
                  borderColor: themeColor === c.key ? c.hex : 'var(--color-surface-200)',
                  backgroundColor: themeColor === c.key ? `${c.hex}0f` : 'transparent',
                }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: c.hex }}
                >
                  {themeColor === c.key && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </span>
                <span className="text-xs font-medium text-surface-600">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Card */}
        <div className="card">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-4">Vorschau</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-primary-900">Primäre Oberfläche</p>
                <p className="text-xs text-primary-700">Verwendet deine ausgewählte Farbe</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary text-xs px-3 py-2">Primär Button</button>
              <button className="btn btn-secondary text-xs px-3 py-2">Sekundär</button>
              <button className="btn btn-ghost text-xs px-3 py-2" onClick={() => setGhostClicks(c => c + 1)}>Ghost</button>
            </div>
          </div>
        </div>

        {/* App installieren */}
        {installStatus !== 'unsupported' && (
          <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <ArrowDownTrayIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                {installStatus === 'installed'
                  ? 'App installiert'
                  : 'Lanis als App installieren'}
              </h3>

              {installStatus === 'installed' ? (
                <p className="text-sm text-surface-500 mt-1">
                  Lanis ist als App installiert und kann direkt vom Homescreen geöffnet werden.
                </p>
              ) : (
                <>
                  <p className="text-sm text-surface-500 mt-1">
                    Für schnelleren Zugriff und ein App-ähnliches Erlebnis
                    auf deinem Gerät installieren.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenInstall}
                    className="btn btn-primary mt-4"
                  >
                    Installieren
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        )}

        {ghostClicks >= 5 && (
          <div className="card border-dashed border-primary-300/50 dark:border-primary-700/50 bg-primary-50/30 dark:bg-primary-950/20">
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-3">PWA Debug</h3>
            <div className="text-xs font-mono text-surface-500 space-y-1">
              {(() => {
                const el = document.querySelector('pwa-install') as PwaInstallElement | null;
                const rows: [string, unknown][] = el
                  ? [
                      ['_deferredPrompt', getDeferredPrompt() ? 'captured' : 'null'],
                      ['isInstallAvailable', el.isInstallAvailable],
                      ['isUnderStandaloneMode', el.isUnderStandaloneMode],
                      ['isAppleMobilePlatform', el.isAppleMobilePlatform],
                      ['isAppleDesktopPlatform', el.isAppleDesktopPlatform],
                      ['isApple26Plus', el.isApple26Plus],
                      ['isAndroid', el.isAndroid],
                      ['isAndroidFallback', el.isAndroidFallback],
                      ['isDialogHidden', el.isDialogHidden],
                      ['userChoiceResult', el.userChoiceResult],
                      ['platforms', el.platforms?.join(', ') || '-'],
                    ]
                  : [['element', 'not found'] as [string, unknown]];
                return rows.map(([k, v]) => (
                  <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-xs text-surface-400">
          Einstellungen werden lokal gespeichert und bleiben beim nächsten Besuch erhalten.
        </div>
      </div>
    </div>
  );
};

export default Settings;

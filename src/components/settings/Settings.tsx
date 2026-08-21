import React, { useState, useEffect } from 'react';
import { useTheme, ThemeColor } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsAPI } from '../../services/api';
import { NotificationPreferences, PushSubscriptionPayload } from '../../types';
import { SunIcon, MoonIcon, CheckIcon, ArrowDownTrayIcon, BellAlertIcon, BellIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
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

const defaultNotificationPreferences: NotificationPreferences = {
  enabled: false,
  start_time: '07:00',
  end_time: '21:00',
  poll_interval_minutes: 15,
  timezone: 'Europe/Berlin',
  show_preview: true,
};

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  } catch {
    return 'Europe/Berlin';
  }
};

const base64ToArrayBuffer = (value: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const Settings: React.FC = () => {
  const { isDark, toggleDark, themeColor, setThemeColor } = useTheme();
  const { token } = useAuth();
  const [installStatus, setInstallStatus] = useState<'idle' | 'installed' | 'unsupported'>('unsupported');
  const [ghostClicks, setGhostClicks] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationTestSending, setNotificationTestSending] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const pushSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

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
    const isAndroid = /android/i.test(ua);
    if (isIos || isAndroid) {
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

  useEffect(() => {
    if (!token) {
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    setNotificationError('');

    const controller = new AbortController();
    const loadNotificationSettings = async () => {
      try {
        const [config, preferences] = await Promise.all([
          notificationsAPI.getConfig(token, controller.signal),
          notificationsAPI.getPreferences(token, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        setNotificationConfigured(config.configured);
        setNotificationPrefs({
          ...defaultNotificationPreferences,
          ...preferences.preferences,
        });
        if (pushSupported) {
          setNotificationPermission(Notification.permission);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load notification settings:', error);
          setNotificationError('Benachrichtigungseinstellungen konnten nicht geladen werden.');
        }
      } finally {
        if (!controller.signal.aborted) setNotificationsLoading(false);
      }
    };

    loadNotificationSettings();
    return () => controller.abort();
  }, [token, pushSupported]);

  const getPushRegistration = async () => {
    if (!pushSupported) throw new Error('Dieser Browser unterstützt keine Push-Benachrichtigungen.');
    const existing = await navigator.serviceWorker.getRegistration();
    return existing || navigator.serviceWorker.register('/sw.js');
  };

  const registerBrowserSubscription = async (): Promise<PushSubscriptionPayload> => {
    if (!token || !notificationConfigured) {
      throw new Error('Push-Benachrichtigungen sind auf dem Server nicht eingerichtet.');
    }
    if (Notification.permission === 'denied') {
      throw new Error('Benachrichtigungen sind im Browser blockiert. Bitte erlaube sie in den Website-Einstellungen.');
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== 'granted') {
      throw new Error('Die Browser-Berechtigung für Benachrichtigungen wurde nicht erteilt.');
    }

    const config = await notificationsAPI.getConfig(token);
    if (!config.configured || !config.public_key) {
      throw new Error('Push-Benachrichtigungen sind auf dem Server nicht eingerichtet.');
    }
    const registration = await getPushRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToArrayBuffer(config.public_key),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      throw new Error('Die Browser-Subscription ist unvollständig.');
    }
    const payload: PushSubscriptionPayload = {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    };
    await notificationsAPI.registerSubscription(token, payload);
    return payload;
  };

  const saveNotificationSettings = async (nextPrefs: NotificationPreferences) => {
    if (!token) return;
    setNotificationsSaving(true);
    setNotificationError('');
    setNotificationMessage('');
    try {
      const response = await notificationsAPI.updatePreferences(token, {
        ...nextPrefs,
        timezone: nextPrefs.timezone || getBrowserTimezone(),
      });
      setNotificationPrefs(response.preferences);
      setNotificationMessage('Benachrichtigungseinstellungen gespeichert.');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setNotificationError('Benachrichtigungseinstellungen konnten nicht gespeichert werden.');
    } finally {
      setNotificationsSaving(false);
    }
  };

  const handleNotificationsToggle = async () => {
    setNotificationError('');
    setNotificationMessage('');
    if (!notificationPrefs.enabled) {
      setNotificationsSaving(true);
      try {
        await registerBrowserSubscription();
        const response = await notificationsAPI.updatePreferences(token!, {
          ...notificationPrefs,
          enabled: true,
          timezone: getBrowserTimezone(),
        });
        setNotificationPrefs(response.preferences);
        setNotificationMessage('Benachrichtigungen sind jetzt aktiv.');
      } catch (error) {
        setNotificationError(error instanceof Error ? error.message : 'Benachrichtigungen konnten nicht aktiviert werden.');
      } finally {
        setNotificationsSaving(false);
      }
      return;
    }

    await saveNotificationSettings({ ...notificationPrefs, enabled: false });
  };

  const sendTestNotification = async () => {
    if (!token) return;
    setNotificationTestSending(true);
    setNotificationError('');
    setNotificationMessage('');
    try {
      await registerBrowserSubscription();
      await notificationsAPI.sendTest(token);
      setNotificationMessage('Testbenachrichtigung wurde gesendet.');
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Testbenachrichtigung konnte nicht gesendet werden.');
    } finally {
      setNotificationTestSending(false);
    }
  };

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

        {/* Nachrichten-Benachrichtigungen */}
        <div className="card overflow-hidden border-primary-100 dark:border-primary-900/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                {notificationPrefs.enabled ? (
                  <BellAlertIcon className="h-5 w-5" />
                ) : (
                  <BellIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Nachrichten-Benachrichtigungen</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {notificationPrefs.enabled
                    ? `Aktiv von ${notificationPrefs.start_time} bis ${notificationPrefs.end_time} · Prüfung alle ${notificationPrefs.poll_interval_minutes} Min.`
                    : 'Lanis prüft auf Wunsch tagsüber auf neue Nachrichten.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNotificationsToggle}
              disabled={notificationsLoading || notificationsSaving || !notificationConfigured || !pushSupported}
              className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ease-out-expo disabled:cursor-not-allowed disabled:opacity-50 ${
                notificationPrefs.enabled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700'
              }`}
              role="switch"
              aria-checked={notificationPrefs.enabled}
              aria-label="Nachrichten-Benachrichtigungen aktivieren"
            >
              <span
                className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-soft transition-all duration-300 ease-out-expo ${
                  notificationPrefs.enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${notificationPrefs.enabled ? 'bg-primary-600' : 'bg-surface-400'}`} />
              </span>
            </button>
          </div>

          <div className="mt-5 space-y-4 border-t border-surface-100 pt-5 dark:border-surface-800">
            {!notificationConfigured && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Push-Benachrichtigungen sind auf diesem Server noch nicht eingerichtet.
              </p>
            )}
            {notificationConfigured && !pushSupported && (
              <p className="rounded-xl bg-surface-50 p-3 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                Dieser Browser unterstützt keine Web-Push-Benachrichtigungen. Installiere Lanis als App oder nutze einen aktuellen Browser.
              </p>
            )}
            {pushSupported && notificationPermission === 'denied' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Dein Browser blockiert Benachrichtigungen. Erlaube sie in den Website-Einstellungen und aktiviere den Schalter erneut.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="notification-start">Aktiv ab</label>
                <div className="relative">
                  <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    id="notification-start"
                    type="time"
                    className="input pl-9 text-sm"
                    value={notificationPrefs.start_time}
                    onChange={event => setNotificationPrefs(previous => ({ ...previous, start_time: event.target.value }))}
                    disabled={notificationsLoading || notificationsSaving}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notification-end">Aktiv bis</label>
                <div className="relative">
                  <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    id="notification-end"
                    type="time"
                    className="input pl-9 text-sm"
                    value={notificationPrefs.end_time}
                    onChange={event => setNotificationPrefs(previous => ({ ...previous, end_time: event.target.value }))}
                    disabled={notificationsLoading || notificationsSaving}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notification-interval">Prüfintervall</label>
                <select
                  id="notification-interval"
                  className="input text-sm"
                  value={notificationPrefs.poll_interval_minutes}
                  onChange={event => setNotificationPrefs(previous => ({ ...previous, poll_interval_minutes: Number(event.target.value) }))}
                  disabled={notificationsLoading || notificationsSaving}
                >
                  {[5, 10, 15, 30, 60].map(minutes => (
                    <option key={minutes} value={minutes}>{minutes} Minuten</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-50 p-3 dark:bg-surface-800/70">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                checked={notificationPrefs.show_preview}
                onChange={event => setNotificationPrefs(previous => ({ ...previous, show_preview: event.target.checked }))}
                disabled={notificationsLoading || notificationsSaving}
              />
              <span>
                <span className="block text-sm font-medium text-surface-800 dark:text-surface-200">Vorschau in der Benachrichtigung</span>
                <span className="mt-0.5 block text-xs text-surface-500">Zeigt Absender und Betreff auf dem Sperrbildschirm an.</span>
              </span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs text-surface-500">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>Zeitzone: {notificationPrefs.timezone || getBrowserTimezone()}. Die erste Prüfung legt nur den Startstand fest.</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
                  disabled={notificationsLoading || notificationsSaving || notificationTestSending || !notificationConfigured || !pushSupported}
                  className="btn btn-secondary h-9 text-xs disabled:opacity-50"
                >
                  {notificationTestSending ? 'Sende...' : 'Test senden'}
                </button>
                <button
                  type="button"
                  onClick={() => saveNotificationSettings({ ...notificationPrefs, timezone: notificationPrefs.timezone || getBrowserTimezone() })}
                  disabled={notificationsLoading || notificationsSaving || !token}
                  className="btn btn-primary h-9 text-xs disabled:opacity-50"
                >
                  {notificationsSaving ? 'Speichere...' : 'Speichern'}
                </button>
              </div>
            </div>

            {notificationError && (
              <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{notificationError}</p>
            )}
            {notificationMessage && (
              <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notificationMessage}</p>
            )}
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
          Erscheinungsbild wird lokal gespeichert. Benachrichtigungen werden mit deinem Konto synchronisiert.
        </div>
      </div>
    </div>
  );
};

export default Settings;

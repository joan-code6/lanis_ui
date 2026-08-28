import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme, ThemeColor } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../contexts/BasePathContext';
import { notificationsAPI } from '../../services/api';
import { NotificationPreferences, PushSubscriptionPayload } from '../../types';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  BellAlertIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import SEO from '../seo/SEO';
import { getDeferredPrompt } from '../pwa/InstallPrompt';
import TimetableSettings from './TimetableSettings';

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
  messages_enabled: true,
  vertretungsplan_enabled: false,
  vertretungsplan_class_mode: 'own',
  vertretungsplan_classes: [],
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

const pushSubscriptionToPayload = (subscription: PushSubscription): PushSubscriptionPayload => {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Die Browser-Subscription ist unvollständig.');
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

type SettingsSection = 'home' | 'appearance' | 'timetable' | 'notifications' | 'app';

const settingsSections: Array<{
  id: Exclude<SettingsSection, 'home'>;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    id: 'appearance',
    title: 'Erscheinungsbild',
    description: 'Farben, Dark Mode und die Oberfläche von Lanis.',
    icon: PaintBrushIcon,
  },
  {
    id: 'timetable',
    title: 'Stundenplan',
    description: 'Anzeige wählen, Stunden ändern und Kurse verknüpfen.',
    icon: CalendarDaysIcon,
  },
  {
    id: 'notifications',
    title: 'Benachrichtigungen',
    description: 'Push-Mitteilungen für Nachrichten und den Vertretungsplan verwalten.',
    icon: BellAlertIcon,
  },
  {
    id: 'app',
    title: 'App & Installation',
    description: 'Lanis installieren und Geräteoptionen ansehen.',
    icon: DevicePhoneMobileIcon,
  },
];

const sectionMeta: Record<SettingsSection, { title: string; subtitle: string }> = {
  home: { title: 'Einstellungen', subtitle: 'Passe dein Schulportal an.' },
  appearance: { title: 'Erscheinungsbild', subtitle: 'Farben und Oberfläche an deine Gewohnheiten anpassen.' },
  timetable: { title: 'Stundenplan', subtitle: 'Anzeige und eigene Stundenplanänderungen verwalten.' },
  notifications: { title: 'Benachrichtigungen', subtitle: 'Nachrichten und neue Vertretungsplan-Einträge per Web-Push mitbekommen.' },
  app: { title: 'App & Installation', subtitle: 'Lanis auf deinem Gerät griffbereit halten.' },
};

const SettingsIndex: React.FC<{ basePath: string }> = ({ basePath }) => (
  <div className="divide-y divide-surface-100 overflow-hidden rounded-xl border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
    {settingsSections.map(item => (
      <Link
        key={item.id}
        to={`${basePath}/settings/${item.id}`}
        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/70 sm:px-5"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          <item.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-surface-900 dark:text-white">{item.title}</h2>
          <p className="mt-0.5 text-sm text-surface-500">{item.description}</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-surface-300 group-hover:text-surface-500 dark:text-surface-600" />
      </Link>
    ))}
  </div>
);

const Settings: React.FC = () => {
  const { isDark, isOled, toggleDark, toggleOled, themeColor, setThemeColor } = useTheme();
  const { token } = useAuth();
  const location = useLocation();
  const basePath = useBasePath();
  const settingsRoot = `${basePath}/settings`;
  const requestedSection = location.pathname.slice(settingsRoot.length).split('/').filter(Boolean)[0] as SettingsSection | undefined;
  const section: SettingsSection = requestedSection && settingsSections.some(item => item.id === requestedSection)
    ? requestedSection
    : 'home';
  const [installStatus, setInstallStatus] = useState<'idle' | 'installed' | 'unsupported'>('unsupported');
  const [ghostClicks, setGhostClicks] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [notificationBrowserReady, setNotificationBrowserReady] = useState(false);
  const [notificationSettingsLoaded, setNotificationSettingsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationTestSending, setNotificationTestSending] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [ownClass, setOwnClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [vertretungsplanOptionsError, setVertretungsplanOptionsError] = useState('');

  const pushSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
  const notificationSelectionValid = !notificationPrefs.vertretungsplan_enabled
    || notificationPrefs.vertretungsplan_class_mode === 'all'
    || (notificationPrefs.vertretungsplan_class_mode === 'own' && Boolean(ownClass))
    || (
      notificationPrefs.vertretungsplan_class_mode === 'selected'
      && notificationPrefs.vertretungsplan_classes.some(value => value.trim().length > 0)
    );

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
    setNotificationConfigured(false);
    setNotificationPrefs(defaultNotificationPreferences);
    setNotificationBrowserReady(false);
    setNotificationSettingsLoaded(false);
    setNotificationPermission('default');
    setNotificationsSaving(false);
    setNotificationTestSending(false);
    setNotificationError('');
    setNotificationMessage('');
    setOwnClass('');
    setAvailableClasses([]);
    setVertretungsplanOptionsError('');

    if (section !== 'notifications') {
      setNotificationsLoading(false);
      return;
    }

    if (!token) {
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);

    const controller = new AbortController();
    const loadNotificationSettings = async () => {
      try {
        const [config, preferences, vertretungsplanOptions] = await Promise.all([
          notificationsAPI.getConfig(token, controller.signal),
          notificationsAPI.getPreferences(token, controller.signal),
          notificationsAPI.getVertretungsplanOptions(token, controller.signal).catch(() => ({
            success: false,
            own_class: '',
            available_classes: [],
          })),
        ]);
        if (controller.signal.aborted) return;
        if (!config.success || !preferences.success) {
          throw new Error('Notification settings response was unsuccessful.');
        }

        const loadedPreferences = {
          ...defaultNotificationPreferences,
          ...preferences.preferences,
        };
        setNotificationConfigured(config.configured);
        setNotificationPrefs(loadedPreferences);
        if (vertretungsplanOptions.success) {
          setOwnClass(vertretungsplanOptions.own_class || '');
          setAvailableClasses(vertretungsplanOptions.available_classes || []);
        } else {
          setVertretungsplanOptionsError('Klassen konnten gerade nicht aus dem Vertretungsplan geladen werden. Du kannst sie trotzdem manuell eingeben.');
        }
        setNotificationSettingsLoaded(true);
        if (pushSupported) {
          setNotificationPermission(Notification.permission);
          if (config.configured && loadedPreferences.enabled && Notification.permission === 'granted') {
            try {
              const subscription = await getBrowserSubscription(config.public_key, false);
              if (controller.signal.aborted) return;
              if (subscription) {
                const response = await notificationsAPI.registerSubscription(token, pushSubscriptionToPayload(subscription));
                if (!response.success) {
                  throw new Error('Die Browser-Subscription konnte nicht registriert werden.');
                }
                if (controller.signal.aborted) return;
                setNotificationBrowserReady(true);
              } else {
                setNotificationMessage('Benachrichtigungen sind für dein Konto aktiv. Aktiviere sie auf diesem Gerät über den Schalter.');
              }
            } catch (error) {
              if (!controller.signal.aborted) {
                console.error('Failed to register existing push subscription:', error);
                setNotificationMessage('Aktiviere Benachrichtigungen auf diesem Gerät über den Schalter.');
              }
            }
          } else if (config.configured && loadedPreferences.enabled && Notification.permission !== 'denied') {
            setNotificationMessage('Benachrichtigungen sind für dein Konto aktiv. Aktiviere sie auf diesem Gerät über den Schalter.');
          }
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
  }, [token, pushSupported, section]);

  const getPushRegistration = async () => {
    if (!pushSupported) throw new Error('Dieser Browser unterstützt keine Push-Benachrichtigungen.');
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready;
  };

  const buffersEqual = (left: ArrayBuffer | null, right: ArrayBuffer) => {
    if (!left) return false;
    const leftBytes = new Uint8Array(left);
    const rightBytes = new Uint8Array(right);
    return leftBytes.length === rightBytes.length
      && leftBytes.every((value, index) => value === rightBytes[index]);
  };

  const getBrowserSubscription = async (publicKey: string, createIfMissing: boolean) => {
    const registration = await getPushRegistration();
    const configuredKey = base64ToArrayBuffer(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !buffersEqual(subscription.options.applicationServerKey, configuredKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription && createIfMissing) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: configuredKey,
      });
    }
    return subscription;
  };

  const registerBrowserSubscription = async (
    onEndpointReady?: (endpoint: string) => void,
  ): Promise<PushSubscriptionPayload> => {
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
    if (!config.success || !config.configured || !config.public_key) {
      throw new Error('Push-Benachrichtigungen sind auf dem Server nicht eingerichtet.');
    }
    const subscription = await getBrowserSubscription(config.public_key, true);
    if (!subscription) throw new Error('Die Browser-Subscription konnte nicht erstellt werden.');

    const payload = pushSubscriptionToPayload(subscription);
    onEndpointReady?.(payload.endpoint);
    const response = await notificationsAPI.registerSubscription(token, payload);
    if (!response.success) {
      throw new Error('Die Browser-Subscription konnte nicht registriert werden.');
    }
    setNotificationBrowserReady(true);
    return payload;
  };

  const unregisterBrowserSubscription = async () => {
    if (!token) return;
    const registration = await getPushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setNotificationBrowserReady(false);
      return;
    }

    const payload = pushSubscriptionToPayload(subscription);
    const response = await notificationsAPI.unregisterSubscription(token, payload.endpoint);
    if (!response.success) {
      throw new Error('Die Browser-Subscription konnte nicht entfernt werden.');
    }
    try {
      await subscription.unsubscribe();
    } catch (error) {
      console.warn('Failed to unsubscribe this browser locally:', error);
    }
    setNotificationBrowserReady(false);
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
      if (!response.success || !response.preferences) {
        throw new Error('Benachrichtigungseinstellungen konnten nicht gespeichert werden.');
      }
      setNotificationPrefs({ ...defaultNotificationPreferences, ...response.preferences });
      if (!response.preferences.enabled) setNotificationBrowserReady(false);
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
    const notificationsActive = notificationPrefs.enabled && notificationBrowserReady;
    if (!notificationsActive) {
      setNotificationsSaving(true);
      let registeredEndpoint: string | null = null;
      try {
        const subscription = await registerBrowserSubscription(endpoint => {
          registeredEndpoint = endpoint;
        });
        const response = await notificationsAPI.updatePreferences(token!, {
          ...notificationPrefs,
          enabled: true,
          timezone: getBrowserTimezone(),
        });
        if (!response.success || !response.preferences) {
          throw new Error('Benachrichtigungseinstellungen konnten nicht aktiviert werden.');
        }
        setNotificationPrefs({ ...defaultNotificationPreferences, ...response.preferences });
        setNotificationMessage('Benachrichtigungen sind jetzt aktiv.');
      } catch (error) {
        let rollbackError: Error | null = null;
        if (registeredEndpoint && token) {
          try {
            const response = await notificationsAPI.unregisterSubscription(token, registeredEndpoint);
            if (!response.success) {
              throw new Error('Die fehlgeschlagene Aktivierung konnte serverseitig nicht zurückgerollt werden.');
            }
            const registration = await getPushRegistration();
            const subscription = await registration.pushManager.getSubscription();
            if (subscription?.endpoint === registeredEndpoint) {
              try {
                await subscription.unsubscribe();
              } catch (unsubscribeError) {
                console.warn('Failed to unsubscribe rolled-back push subscription locally:', unsubscribeError);
              }
            }
          } catch (cleanupError) {
            console.warn('Failed to roll back push subscription registration:', cleanupError);
            rollbackError = cleanupError instanceof Error
              ? cleanupError
              : new Error('Push-Subscription konnte nicht zurückgerollt werden.');
          }
        }
        setNotificationBrowserReady(false);
        setNotificationError(
          rollbackError?.message
            || (error instanceof Error ? error.message : 'Benachrichtigungen konnten nicht aktiviert werden.'),
        );
      } finally {
        setNotificationsSaving(false);
      }
      return;
    }

    setNotificationsSaving(true);
    try {
      await unregisterBrowserSubscription();
      await saveNotificationSettings({ ...notificationPrefs, enabled: false });
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Benachrichtigungen konnten nicht deaktiviert werden.');
    } finally {
      setNotificationsSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!token) return;
    if (!notificationPrefs.enabled || !notificationBrowserReady) {
      setNotificationError('Aktiviere Benachrichtigungen auf diesem Gerät zuerst.');
      return;
    }
    setNotificationTestSending(true);
    setNotificationError('');
    setNotificationMessage('');
    try {
      const response = await notificationsAPI.sendTest(token);
      if (!response.success) throw new Error('Testbenachrichtigung konnte nicht gesendet werden.');
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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <SEO
        title={sectionMeta[section].title}
        description={sectionMeta[section].subtitle}
        path={`/settings${section === 'home' ? '' : `/${section}`}`}
        noindex
      />
      <div className="page-header">
        {section !== 'home' && (
          <Link to={settingsRoot} className="mb-3 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            <ArrowLeftIcon className="mr-1.5 h-4 w-4" />
            Alle Einstellungen
          </Link>
        )}
        <h1 className="page-title">{sectionMeta[section].title}</h1>
        <p className="page-subtitle">{sectionMeta[section].subtitle}</p>
      </div>

      {section === 'home' && <SettingsIndex basePath={basePath} />}

      {section === 'timetable' && <TimetableSettings />}

      <div className="space-y-6">
        {section === 'appearance' && (
          <>
        {/* Dark Mode */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Dark Mode</h3>
              <p className="text-sm text-surface-500 mt-0.5">
                {isOled ? 'OLED-Design ist aktiv' : isDark ? 'Dunkles Design ist aktiv' : 'Helles Design ist aktiv'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleDark}
              className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ease-out-expo ${
                isDark ? 'bg-primary-600' : 'bg-surface-300'
              }`}
              role="switch"
              aria-checked={isDark}
              aria-label="Dunkles Design"
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

          {isDark && (
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-surface-100 pt-5 dark:border-surface-800">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">OLED-Modus</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {isOled
                    ? 'Reines Schwarz spart Energie auf OLED-Displays'
                    : 'Schwarzer Hintergrund für OLED-Displays'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleOled}
                className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ease-out-expo ${
                  isOled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700'
                }`}
                role="switch"
                aria-checked={isOled}
                aria-label="OLED-Modus"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white dark:bg-surface-200 shadow-soft flex items-center justify-center transition-all duration-300 ease-out-expo ${
                    isOled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                >
                  <MoonIcon className={`w-3 h-3 ${isOled ? 'text-primary-600' : 'text-surface-400'}`} />
                </span>
              </button>
            </div>
          )}
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
                  borderColor: themeColor === c.key
                    ? c.hex
                    : `rgb(var(--color-surface-${isDark ? '700' : '200'}))`,
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
                <span className="text-xs font-medium text-surface-600 dark:text-surface-300">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

          </>
        )}

        {/* Push-Benachrichtigungen */}
        {section === 'notifications' && (
        <div className="card overflow-hidden border-primary-100 dark:border-primary-900/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                {notificationPrefs.enabled && notificationBrowserReady ? (
                  <BellAlertIcon className="h-5 w-5" />
                ) : (
                  <BellIcon className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Push-Benachrichtigungen</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {notificationPrefs.enabled && notificationBrowserReady
                    ? `Aktiv von ${notificationPrefs.start_time} bis ${notificationPrefs.end_time} · Prüfung alle ${notificationPrefs.poll_interval_minutes} Min.`
                    : notificationPrefs.enabled
                      ? 'Für diesen Browser noch nicht aktiviert. Klicke den Schalter, um ihn zu registrieren.'
                    : 'Lanis kann dich über Nachrichten und neue Vertretungsplan-Einträge informieren.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNotificationsToggle}
              disabled={notificationsLoading || notificationsSaving || !notificationSettingsLoaded || !notificationConfigured || !pushSupported || (!(notificationPrefs.enabled && notificationBrowserReady) && !notificationSelectionValid)}
              className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ease-out-expo disabled:cursor-not-allowed disabled:opacity-50 ${
                notificationPrefs.enabled && notificationBrowserReady ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700'
              }`}
              role="switch"
              aria-checked={notificationPrefs.enabled && notificationBrowserReady}
              aria-label="Push-Benachrichtigungen aktivieren"
            >
              <span
                className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-soft transition-all duration-300 ease-out-expo ${
                  notificationPrefs.enabled && notificationBrowserReady ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${notificationPrefs.enabled && notificationBrowserReady ? 'bg-primary-600' : 'bg-surface-400'}`} />
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
            {notificationPrefs.enabled && !notificationBrowserReady && pushSupported && notificationPermission !== 'denied' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Dein Konto hat Benachrichtigungen aktiviert, aber dieser Browser ist noch nicht registriert. Aktiviere den Schalter, um ihn zu verbinden.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  checked={notificationPrefs.messages_enabled}
                  onChange={event => setNotificationPrefs(previous => ({ ...previous, messages_enabled: event.target.checked }))}
                  disabled={notificationsLoading || notificationsSaving}
                />
                <span>
                  <span className="block text-sm font-medium text-surface-800 dark:text-surface-200">Neue Nachrichten</span>
                  <span className="mt-0.5 block text-xs text-surface-500">Benachrichtigt bei neuen oder aktualisierten ungelesenen Unterhaltungen.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  checked={notificationPrefs.vertretungsplan_enabled}
                  onChange={event => setNotificationPrefs(previous => ({ ...previous, vertretungsplan_enabled: event.target.checked }))}
                  disabled={notificationsLoading || notificationsSaving}
                />
                <span className="flex gap-2">
                  <ClipboardDocumentListIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <span>
                    <span className="block text-sm font-medium text-surface-800 dark:text-surface-200">Neue Vertretungsplan-Einträge</span>
                    <span className="mt-0.5 block text-xs text-surface-500">Die erste Prüfung legt nur den Startstand fest.</span>
                  </span>
                </span>
              </label>
            </div>

            {notificationPrefs.vertretungsplan_enabled && (
              <div className="space-y-3 rounded-xl bg-surface-50 p-4 dark:bg-surface-800/70">
                <div>
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Welche Klassen?</p>
                  <p className="mt-0.5 text-xs text-surface-500">Standardmäßig erhältst du nur Einträge für deine eigene Klasse.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    ['own', ownClass ? `Meine Klasse (${ownClass})` : 'Meine Klasse'],
                    ['selected', 'Ausgewählte Klassen'],
                    ['all', 'Alle Klassen'],
                  ] as const).map(([mode, label]) => (
                    <label key={mode} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${
                      notificationPrefs.vertretungsplan_class_mode === mode
                        ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200'
                        : 'border-surface-200 bg-white text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300'
                    } ${mode === 'own' && !ownClass ? 'opacity-60' : ''}`}>
                      <input
                        type="radio"
                        name="vertretungsplan-class-mode"
                        value={mode}
                        checked={notificationPrefs.vertretungsplan_class_mode === mode}
                        onChange={() => setNotificationPrefs(previous => ({ ...previous, vertretungsplan_class_mode: mode }))}
                        disabled={notificationsLoading || notificationsSaving || (mode === 'own' && !ownClass)}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {notificationPrefs.vertretungsplan_class_mode === 'selected' && (
                  <div>
                    <label className="label" htmlFor="notification-classes">Klassen (mit Komma trennen)</label>
                    <input
                      id="notification-classes"
                      type="text"
                      className="input text-sm"
                      value={notificationPrefs.vertretungsplan_classes.join(', ')}
                      onChange={event => setNotificationPrefs(previous => ({
                        ...previous,
                        vertretungsplan_classes: event.target.value.split(',').map(value => value.trimStart()),
                      }))}
                      placeholder="z. B. 10a, 10b, Q2"
                      disabled={notificationsLoading || notificationsSaving}
                    />
                    {availableClasses.length > 0 && (
                      <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto p-1">
                        {availableClasses.map(className => {
                          const selected = notificationPrefs.vertretungsplan_classes.includes(className);
                          return (
                            <button
                              key={className}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setNotificationPrefs(previous => ({
                                ...previous,
                                vertretungsplan_classes: selected
                                  ? previous.vertretungsplan_classes.filter(value => value !== className)
                                  : [...previous.vertretungsplan_classes, className],
                              }))}
                              className={`min-h-9 rounded-full px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${
                                selected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white text-surface-600 ring-1 ring-surface-200 dark:bg-surface-900 dark:text-surface-300 dark:ring-surface-700'
                              }`}
                            >
                              {className}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!ownClass && notificationPrefs.vertretungsplan_class_mode === 'own' && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    Deine Klasse konnte nicht aus dem Profil gelesen werden. Wähle Klassen selbst aus oder abonniere alle Klassen.
                  </p>
                )}
                {vertretungsplanOptionsError && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{vertretungsplanOptionsError}</p>
                )}
              </div>
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

            {notificationPrefs.messages_enabled && (
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
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs text-surface-500">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>Zeitzone: {notificationPrefs.timezone || getBrowserTimezone()}. Die erste Prüfung legt nur den Startstand fest.</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
              disabled={notificationsLoading || notificationsSaving || notificationTestSending || !notificationSettingsLoaded || !notificationPrefs.enabled || !notificationBrowserReady || !notificationConfigured || !pushSupported}
                  className="btn btn-secondary h-9 text-xs disabled:opacity-50"
                >
                  {notificationTestSending ? 'Sende...' : 'Test senden'}
                </button>
                <button
                  type="button"
                  onClick={() => saveNotificationSettings({ ...notificationPrefs, timezone: notificationPrefs.timezone || getBrowserTimezone() })}
                  disabled={notificationsLoading || notificationsSaving || !notificationSettingsLoaded || !token || !notificationSelectionValid}
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
        )}

        {/* Preview Card */}
        {section === 'appearance' && (
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
        )}

        {/* App installieren */}
        {section === 'app' && installStatus !== 'unsupported' && (
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

        {section === 'app' && installStatus === 'unsupported' && (
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-300">
                <DevicePhoneMobileIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Installation nicht verfügbar</h3>
                <p className="mt-1 text-sm text-surface-500">Dieser Browser bietet aktuell keine direkte App-Installation an. Du kannst Lanis trotzdem wie gewohnt nutzen.</p>
              </div>
            </div>
          </div>
        )}

        {section === 'app' && ghostClicks >= 5 && (
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
        {section === 'appearance' && (
          <div className="text-center text-xs text-surface-400">
            Erscheinungsbild wird lokal gespeichert.
          </div>
        )}
        {section === 'notifications' && (
          <div className="text-center text-xs text-surface-400">
            Benachrichtigungen werden mit deinem Konto synchronisiert.
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

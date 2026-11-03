import { capture } from '../../analytics/client';
import { AnalyticsControls } from '../../analytics/Analytics';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme, ThemeColor } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  CUSTOM_BACKEND_STORAGE_KEY,
  clearBackendScopedStorage,
} from '../../utils/backendConfig';
import {
  beginAccountDataDeletion,
  captureAccountDataGeneration,
  confirmAccountDataDeletion,
  finishAccountDataDeletion,
  hasAccountDataLoginSince,
  isAccountDataDeletionInProgress,
  ownsAccountDataDeletion,
  recordAccountDataDeletion,
  purgeDeletedAccountBrowserData,
  withAccountDataLifecycleLock,
} from '../../utils/accountDataWrites';
import { useBasePath } from '../../contexts/BasePathContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { authAPI, notificationsAPI } from '../../services/api';
import { NotificationPreferences, PushSubscriptionPayload } from '../../types';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  Bars3Icon,
  BellAlertIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  PaintBrushIcon,
  ServerStackIcon,
  UserCircleIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import SEO from '../seo/SEO';
import { usePwaInstall } from '../../contexts/PwaInstallContext';
import TimetableSettings from './TimetableSettings';
import VertretungsplanSettings from './VertretungsplanSettings';
import AgentsSettings from './AgentsSettings';
import DashboardSettings from './DashboardSettings';
import SettingsSwitch from './SettingsSwitch';
import {
  DEFAULT_SIDEBAR_ORDER,
  normalizeSidebarOrder,
  SIDEBAR_ITEM_LABELS,
  SidebarItemId,
  isDivider,
  getSidebarLabel,
} from '../../utils/sidebarNavigation';

const themeColors: { key: ThemeColor; label: string; hex: string; checkClass?: string }[] = [
  { key: 'emerald', label: 'Smaragd', hex: '#10b981' },
  { key: 'sapphire', label: 'Saphir', hex: '#3b82f6' },
  { key: 'amethyst', label: 'Amethyst', hex: '#a855f7' },
  { key: 'ruby', label: 'Rubin', hex: '#f43f5e' },
  { key: 'amber', label: 'Bernstein', hex: '#f59e0b' },
  { key: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { key: 'coral', label: 'Koralle', hex: '#f88379' },
  { key: 'blush', label: 'Rosé', hex: '#fee3ea', checkClass: 'text-surface-800' },
  { key: 'moss', label: 'Oliv', hex: '#4b573f' },
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

type SettingsSection = 'home' | 'appearance' | 'timetable' | 'notifications' | 'navigation' | 'connections' | 'help' | 'privacy';

const settingsSections: Array<{
  id: Exclude<SettingsSection, 'home'>;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    id: 'appearance',
    title: 'Erscheinungsbild',
    description: 'Wähle ein Design und eine Primärfarbe.',
    icon: PaintBrushIcon,
  },
  {
    id: 'timetable',
    title: 'Stundenplan & Vertretungsplan',
    description: 'Lege deine Klasse, die Stundenplanansicht und die Hausaufgaben-Markierung fest.',
    icon: CalendarDaysIcon,
  },
  {
    id: 'notifications',
    title: 'Benachrichtigungen',
    description: 'Verwalte Hinweisbanner im Dashboard und Web-Push-Benachrichtigungen.',
    icon: BellAlertIcon,
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Ordne die Seitenleiste und blende Einträge nach Bedarf ein oder aus.',
    icon: Bars3Icon,
  },
  {
    id: 'connections',
    title: 'Verbindungen',
    description: 'Verwalte aktive Agentenverbindungen.',
    icon: SparklesIcon,
  },
  {
    id: 'help',
    title: 'App & Hilfe',
    description: 'Installiere Lanis oder starte die Einführung erneut.',
    icon: DevicePhoneMobileIcon,
  },
  {
    id: 'privacy',
    title: 'Datenschutz & Konto',
    description: 'Verwalte die Nutzungsanalyse, exportiere deine Daten oder lösche dein Konto.',
    icon: UserCircleIcon,
  },
];

const sectionMeta: Record<SettingsSection, { title: string; subtitle: string }> = {
  home: { title: 'Einstellungen', subtitle: 'Passe Lanis an deinen Schulalltag an.' },
  appearance: { title: 'Erscheinungsbild', subtitle: 'Wähle ein Design und eine Primärfarbe.' },
  timetable: { title: 'Stundenplan & Vertretungsplan', subtitle: 'Lege deine Klasse und deine Stundenplan-Einstellungen fest.' },
  notifications: { title: 'Benachrichtigungen', subtitle: 'Verwalte Hinweisbanner im Dashboard und Web-Push-Benachrichtigungen.' },
  navigation: { title: 'Navigation', subtitle: 'Ordne die Seitenleiste und blende Einträge nach Bedarf ein oder aus.' },
  connections: { title: 'Verbindungen', subtitle: 'Verwalte die mit deinem Lanis-Konto verbundenen Agenten.' },
  help: { title: 'App & Hilfe', subtitle: 'Installiere Lanis oder starte die Einführung erneut.' },
  privacy: { title: 'Datenschutz & Konto', subtitle: 'Verwalte die Nutzungsanalyse, exportiere deine Daten oder lösche dein Konto.' },
};

const AccountSettings: React.FC = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const exportData = async () => {
    if (!token) return;
    setExporting(true);
    setError('');
    try {
      const blob = await authAPI.exportAccount(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lanis-account-export.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Der Export wurde heruntergeladen.');
    } catch {
      setError('Der Datenexport konnte nicht erstellt werden. Bitte versuche es später erneut.');
    } finally {
      setExporting(false);
    }
  };

  const performAccountDeletion = async () => {
    if (!token || confirmation !== 'LÖSCHEN') return;
    setDeleting(true);
    setError('');
    const freshToken = await authAPI.getValidSessionToken();
    if (!freshToken) {
      setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an und versuche es danach noch einmal.');
      setDeleting(false);
      return;
    }
    const deletionGeneration = beginAccountDataDeletion(freshToken, localStorage.getItem('auth_refresh_token') || '');
    try {
      const result = await authAPI.deleteAccount(freshToken);
      if (!result.success) {
        throw new Error('Die Kontolöschung wurde vom Server nicht bestätigt.');
      }
    } catch {
      // A timeout does not establish whether DELETE reached the server.
      // Startup recovery will fence it before restoring a surviving session.
      window.location.replace('/login');
      setError('Der Löschvorgang wird beim nächsten Start überprüft.');
      setDeleting(false);
      return;
    }

    const deletionConfirmedRecorded = confirmAccountDataDeletion(deletionGeneration);

    if (
      !ownsAccountDataDeletion(deletionGeneration)
      && (
        isAccountDataDeletionInProgress()
        || hasAccountDataLoginSince(deletionGeneration)
      )
    ) {
      window.location.replace('/login');
      return;
    }

    const cleanupComplete = await purgeDeletedAccountBrowserData();
    if (!deletionConfirmedRecorded) recordAccountDataDeletion();
    try {
      await logout(() => (
        ownsAccountDataDeletion(deletionGeneration)
        || (
          !isAccountDataDeletionInProgress()
          && !hasAccountDataLoginSince(deletionGeneration)
        )
      ));
    } catch {
      // The account is already deleted; always continue to the login screen.
    }
    if (cleanupComplete) finishAccountDataDeletion(deletionGeneration);
    navigate('/login', { replace: true });
    setDeleting(false);
  };

  const deleteAccount = async () => {
    try {
      await withAccountDataLifecycleLock(performAccountDeletion);
    } catch {
      setError('Kontoänderungen können in diesem Browser gerade nicht sicher koordiniert werden. Bitte versuche es erneut.');
      setDeleting(false);
    }
  };

  return <div className="space-y-6">
    <div className="card">
      <h2 className="item-title">Alle Daten exportieren</h2>
      <p className="mt-1 text-sm leading-relaxed text-surface-500">Lade dein bei Lanis gespeichertes Profil, deine Einstellungen, Benachrichtigungen, Aktivitäten und zwischengespeicherten Daten als JSON-Datei herunter. Passwörter, Zugriffstoken, Cookies und kryptografische Schlüssel sind nicht enthalten.</p>
      <button type="button" onClick={() => void exportData()} disabled={exporting} className="btn btn-primary mt-5"><ArrowDownTrayIcon className="mr-2 h-4 w-4" />{exporting ? 'Export wird vorbereitet …' : 'Alle Daten exportieren'}</button>
    </div>
    <div className="card border-2 border-red-300 dark:border-red-900/70">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Gefahrenbereich</h2>
      <h3 className="item-title mt-2">Konto löschen</h3>
      <p className="mt-1 text-sm leading-relaxed text-surface-500">Dadurch werden dein Lanis-Profil, deine Einstellungen, Aktivitäten, Push-Abos, Verbindungen, Sitzungen und lokale Zwischenspeicher dauerhaft gelöscht. Originaldaten im Schulportal bleiben unberührt.</p>
      <label className="mt-5 block max-w-sm text-sm font-medium text-surface-700 dark:text-surface-300">Gib zur Bestätigung <span className="font-mono">LÖSCHEN</span> ein<input value={confirmation} onChange={event => setConfirmation(event.target.value.toLocaleUpperCase('de-DE'))} className="mt-2 block w-full rounded-xl border border-surface-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-red-500 dark:border-surface-700 dark:bg-surface-900" autoComplete="off" /></label>
      <button type="button" onClick={() => void deleteAccount()} disabled={deleting || confirmation !== 'LÖSCHEN'} className="btn mt-4 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"><TrashIcon className="mr-2 h-4 w-4" />{deleting ? 'Konto wird gelöscht …' : 'Konto löschen'}</button>
    </div>
    {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
  </div>;
};

type SidebarSaveState = 'idle' | 'saved' | 'error';

const SidebarSettings: React.FC = () => {
  const isDemo = useBasePath() === '/demo';
  const { preferences, updatePreferences, isSaving } = usePreferences();
  const [order, setOrder] = useState(() => normalizeSidebarOrder(preferences.sidebar.order));
  const [hiddenItems, setHiddenItems] = useState<string[]>(() => preferences.sidebar.hidden_items);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SidebarSaveState>('idle');
  const [feedbackSaveState, setFeedbackSaveState] = useState<SidebarSaveState>('idle');
  const [hasUnresolvedSidebarSaveFailure, setHasUnresolvedSidebarSaveFailure] = useState(false);

  useEffect(() => {
    setOrder(normalizeSidebarOrder(preferences.sidebar.order));
    setHiddenItems(preferences.sidebar.hidden_items);
  }, [preferences.sidebar.order, preferences.sidebar.hidden_items]);

  const visibleOrder = order.filter(id => !hiddenItems.includes(id));
  const hiddenOrder = order.filter(id => hiddenItems.includes(id));
  const displayOrder = [...visibleOrder, ...hiddenOrder];

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const index = displayOrder.indexOf(itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= displayOrder.length) return;
    if (hiddenItems.includes(itemId) !== hiddenItems.includes(displayOrder[nextIndex])) return;
    const next = [...displayOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setOrder(next);
    setSaveState('idle');
  };

  const moveItemTo = (itemId: string, targetId: string) => {
    setOrder(current => {
      const currentDisplayOrder = [
        ...current.filter(id => !hiddenItems.includes(id)),
        ...current.filter(id => hiddenItems.includes(id)),
      ];
      if (hiddenItems.includes(itemId) !== hiddenItems.includes(targetId)) return current;
      const fromIndex = currentDisplayOrder.indexOf(itemId);
      const toIndex = currentDisplayOrder.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
      const next = [...currentDisplayOrder];
      const [movedItem] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedItem);
      return next;
    });
    setSaveState('idle');
  };

  const hasChanges = JSON.stringify(order) !== JSON.stringify(normalizeSidebarOrder(preferences.sidebar.order));
  const hasVisibilityChanges = JSON.stringify(hiddenItems) !== JSON.stringify(preferences.sidebar.hidden_items);
  const isSidebarSaveInProgress = isSaving;
  const applyOrder = async () => {
    setSaveState('idle');
    const saved = await updatePreferences({ sidebar: { order, hidden_items: hiddenItems } });
    setSaveState(saved ? 'saved' : 'error');
    setHasUnresolvedSidebarSaveFailure(!saved);
  };

  const saveFeedbackButton = async (showFeedbackButton: boolean) => {
    setFeedbackSaveState('idle');
    const saved = await updatePreferences({ sidebar: { show_feedback_button: showFeedbackButton } });
    setFeedbackSaveState(saved ? 'saved' : 'error');
  };

  const cancelChanges = () => {
    setOrder(normalizeSidebarOrder(preferences.sidebar.order));
    setHiddenItems(preferences.sidebar.hidden_items);
    setSaveState('idle');
  };

  const resetOrder = () => {
    setOrder([...DEFAULT_SIDEBAR_ORDER]);
    setHiddenItems([]);
    setSaveState('idle');
  };

  const toggleVisibility = (id: string) => {
    if (isDivider(id)) {
      return;
    }
    setHiddenItems(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
    setSaveState('idle');
  };

  const addDivider = () => {
    const newId = `divider-${Date.now()}`;
    setOrder(current => [...current, newId]);
    setSaveState('idle');
  };

  const deleteDivider = (id: string) => {
    setOrder(current => current.filter(item => item !== id));
    setHiddenItems(current => current.filter(item => item !== id));
    setSaveState('idle');
  };

  return (
    <div className="space-y-6">
    <section className="card !p-0 overflow-hidden">
      <div className="border-b border-surface-100 px-5 py-5 dark:border-surface-800 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="item-title">Reihenfolge der Seitenleiste</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-surface-500 dark:text-surface-400">
              Ziehe die Einträge an die gewünschte Stelle oder nutze die Pfeile. Nicht benötigte Einträge kannst du ausblenden.
            </p>
          </div>
          {(hasChanges || hasVisibilityChanges) && (
            <span className="badge badge-primary shrink-0">Nicht gespeichert</span>
          )}
        </div>
      </div>

      <ol className="space-y-2 bg-surface-50/70 p-3 dark:bg-surface-950/30 sm:p-4" aria-label="Reihenfolge der Seitenleiste">
        {displayOrder.map((id, index) => (
          <li
            key={id}
            onDragOver={(event) => { if (!isSidebarSaveInProgress) event.preventDefault(); }}
            onDragEnter={() => {
              if (!isSidebarSaveInProgress && draggedId && hiddenItems.includes(draggedId) === hiddenItems.includes(id)) moveItemTo(draggedId, id);
            }}
            onDrop={() => setDraggedId(null)}
            className={`group flex min-h-16 items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-150 dark:bg-surface-900 sm:px-4 ${
              draggedId === id
                ? 'scale-[1.015] border-primary-300 bg-primary-50 shadow-soft-md dark:border-primary-700 dark:bg-primary-950/30'
                : hiddenItems.includes(id)
                  ? 'border-surface-200 opacity-50 dark:border-surface-700'
                  : 'border-surface-200 dark:border-surface-700'
            }`}
          >
            <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-surface-400 dark:text-surface-500" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              draggable={!isSidebarSaveInProgress}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', id);
                setDraggedId(id);
              }}
              onDragEnd={() => setDraggedId(null)}
              className="cursor-grab touch-none rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 active:cursor-grabbing dark:hover:bg-surface-800 dark:hover:text-surface-200"
              title={`${getSidebarLabel(id)} ziehen`}
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{getSidebarLabel(id)}</p>
              <p className="mt-0.5 text-xs text-surface-400">{isDivider(id) ? 'Trennlinie' : hiddenItems.includes(id) ? 'Ausgeblendet' : 'In der Seitenleiste sichtbar'}</p>
            </div>
            <span className="sr-only">Position {index + 1} von {order.length}</span>
            {isDivider(id) ? (
              <button
                type="button"
                onClick={() => deleteDivider(id)}
                disabled={isSidebarSaveInProgress}
                aria-label={`Trennlinie löschen`}
                className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-red-400"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Löschen</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggleVisibility(id)}
                disabled={isSidebarSaveInProgress}
                aria-label={hiddenItems.includes(id) ? `${getSidebarLabel(id)} einblenden` : `${getSidebarLabel(id)} ausblenden`}
                className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-primary-400"
              >
                {hiddenItems.includes(id) ? <EyeIcon className="h-4 w-4" aria-hidden="true" /> : <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />}
                <span className="hidden sm:inline">{hiddenItems.includes(id) ? 'Einblenden' : 'Ausblenden'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => moveItem(id, -1)}
              disabled={isSidebarSaveInProgress || index === 0 || hiddenItems.includes(id) !== hiddenItems.includes(displayOrder[index - 1])}
              aria-label={`${getSidebarLabel(id)} nach oben verschieben`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-25 dark:hover:bg-surface-800 dark:hover:text-surface-100"
            >
              <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(id, 1)}
              disabled={isSidebarSaveInProgress || index === displayOrder.length - 1 || hiddenItems.includes(id) !== hiddenItems.includes(displayOrder[index + 1])}
              aria-label={`${getSidebarLabel(id)} nach unten verschieben`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-25 dark:hover:bg-surface-800 dark:hover:text-surface-100"
            >
              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>

      <div className="border-t border-surface-100 px-4 py-4 dark:border-surface-800 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={addDivider}
            disabled={isSidebarSaveInProgress}
            className="btn btn-ghost justify-center sm:justify-start disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bars3Icon className="mr-2 h-4 w-4 rotate-90" aria-hidden="true" />
            Trennlinie hinzufügen
          </button>
          <button type="button" onClick={resetOrder} disabled={isSidebarSaveInProgress} className="btn btn-ghost justify-center sm:justify-start">
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Standard wiederherstellen
          </button>
          <div className="flex gap-3 sm:ml-auto">
            <button type="button" onClick={cancelChanges} disabled={(!hasChanges && !hasVisibilityChanges) || isSidebarSaveInProgress} className="btn btn-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              Verwerfen
            </button>
            <button
              type="button"
              onClick={() => void applyOrder()}
              disabled={(!hasChanges && !hasVisibilityChanges && !hasUnresolvedSidebarSaveFailure) || isSidebarSaveInProgress}
              className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {isSidebarSaveInProgress ? 'Wird gespeichert …' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
        <div className="mt-3 min-h-5 text-sm" aria-live="polite">
          {saveState === 'saved' && (
            <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
              Gespeichert und mit deinem Konto synchronisiert.
            </p>
          )}
          {hasUnresolvedSidebarSaveFailure && (
            <p className="text-amber-700 dark:text-amber-300">
              Lokal gespeichert, aber noch nicht mit deinem Konto synchronisiert. Bitte erneut versuchen.
            </p>
          )}
        </div>
      </div>
    </section>
    {!isDemo && <section className="card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="item-title">Feedback-Schaltfläche anzeigen</h3>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Zeigt den Feedback-Eintrag unterhalb der Navigation an.</p>
        </div>
        <SettingsSwitch
          checked={preferences.sidebar.show_feedback_button}
          label="Feedback-Schaltfläche anzeigen"
          onChange={() => void saveFeedbackButton(!preferences.sidebar.show_feedback_button)}
          disabled={isSaving}
        />
      </div>
      <div className="mt-3 min-h-5 text-sm" aria-live="polite">
        {feedbackSaveState === 'saved' && <p className="text-emerald-700 dark:text-emerald-400">Gespeichert und mit deinem Konto synchronisiert.</p>}
        {feedbackSaveState === 'error' && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-amber-700 dark:text-amber-300">
            <p>Lokal gespeichert, aber noch nicht mit deinem Konto synchronisiert.</p>
            <button type="button" onClick={() => void saveFeedbackButton(preferences.sidebar.show_feedback_button)} disabled={isSaving} className="font-medium underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    </section>}
    </div>
  );
};

const SettingsIndex: React.FC<{
  basePath: string;
  sections: typeof settingsSections;
}> = ({ basePath, sections }) => (
  <div className="space-y-6">
    <div className="grid gap-3 xl:grid-cols-2">
    {sections.map(item => (
      <Link
        key={item.id}
        to={`${basePath}/settings/${item.id}`}
        className="card card-hover group flex items-center gap-4"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          <item.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="item-title">{item.title}</h2>
          <p className="mt-0.5 text-sm text-surface-500">{item.description}</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-surface-300 group-hover:text-surface-500 dark:text-surface-600" />
      </Link>
    ))}
    </div>
    <details className="card">
      <summary className="cursor-pointer text-sm font-medium text-surface-900 dark:text-surface-100">Erweitert</summary>
      <div className="mt-4 border-t border-surface-100 pt-4 dark:border-surface-800">
        <Link to="/set-custom-backend" className="flex items-center gap-3 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300">
          <ServerStackIcon className="h-5 w-5" />
          Eigenes Backend
          <ChevronRightIcon className="ml-auto h-5 w-5" />
        </Link>
      </div>
    </details>
  </div>
);

const Settings: React.FC = () => {
  const { themeMode, setThemeMode, themeColor, setThemeColor } = useTheme();
  const { preferences, updatePreferences, syncError } = usePreferences();
  const { token } = useAuth();
  const location = useLocation();
  const basePath = useBasePath();
  const isDemo = basePath === '/demo';
  const { availability: installAvailability, canInstall, isInstalling, requestInstall } = usePwaInstall();
  const settingsRoot = `${basePath}/settings`;
  const visibleSettingsSections = settingsSections.filter(item => (
    item.id !== 'privacy' || !isDemo
  ));
  const requestedSection = location.pathname.slice(settingsRoot.length).split('/').filter(Boolean)[0];
  const sectionAliases: Record<string, SettingsSection> = {
    dashboard: 'notifications',
    homework: 'timetable',
    vertretungsplan: 'timetable',
    sidebar: 'navigation',
    agents: 'connections',
    whatsapp: 'connections',
    app: 'help',
    account: 'privacy',
  };
  const selectedSection = requestedSection ? sectionAliases[requestedSection] || requestedSection : undefined;
  const section: SettingsSection = selectedSection && visibleSettingsSections.some(item => item.id === selectedSection)
    ? selectedSection as SettingsSection
    : 'home';
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [notificationBrowserReady, setNotificationBrowserReady] = useState(false);
  const [notificationSettingsLoaded, setNotificationSettingsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationTestSending, setNotificationTestSending] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationClassSyncFailed, setNotificationClassSyncFailed] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const pushSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
  const notificationTypesSelected = notificationPrefs.messages_enabled
    || notificationPrefs.vertretungsplan_enabled;

  const withSelectedClass = (next: NotificationPreferences): NotificationPreferences => {
    const selectedClass = preferences.vertretungsplan.class_override.trim();
    return {
      ...next,
      vertretungsplan_class_mode: selectedClass ? 'selected' : 'own',
      vertretungsplan_classes: selectedClass ? [selectedClass] : [],
    };
  };

  useEffect(() => {
    setNotificationConfigured(false);
    setNotificationPrefs(defaultNotificationPreferences);
    setNotificationBrowserReady(false);
    setNotificationSettingsLoaded(false);
    setNotificationPermission('default');
    setNotificationsSaving(false);
    setNotificationTestSending(false);
    setNotificationError('');
    setNotificationClassSyncFailed(false);
    setNotificationMessage('');
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
        const [config, preferences] = await Promise.all([
          notificationsAPI.getConfig(token, controller.signal),
          notificationsAPI.getPreferences(token, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        if (!config.success || !preferences.success) {
          throw new Error('Notification settings response was unsuccessful.');
        }

        const loadedPreferences = {
          ...defaultNotificationPreferences,
          ...preferences.preferences,
        };
        const classScopedPreferences = withSelectedClass(loadedPreferences);
        setNotificationConfigured(config.configured);
        setNotificationPrefs(classScopedPreferences);
        setNotificationSettingsLoaded(true);
        if (loadedPreferences.vertretungsplan_enabled && (
          loadedPreferences.vertretungsplan_class_mode !== classScopedPreferences.vertretungsplan_class_mode
          || JSON.stringify(loadedPreferences.vertretungsplan_classes) !== JSON.stringify(classScopedPreferences.vertretungsplan_classes)
        )) {
          try {
            const response = await notificationsAPI.updatePreferences(token, classScopedPreferences);
            if (!response.success) throw new Error('Substitution notification class could not be synced.');
          } catch (syncError) {
            if (controller.signal.aborted) return;
            console.error('Failed to sync substitution notification class:', syncError);
            setNotificationClassSyncFailed(true);
          }
        }
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

    void loadNotificationSettings();
    return () => controller.abort();
  }, [token, pushSupported, section, preferences.vertretungsplan.class_override]);

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
    if (nextPrefs.enabled && !nextPrefs.messages_enabled && !nextPrefs.vertretungsplan_enabled) {
      setNotificationError('Wähle mindestens eine Benachrichtigungsart aus.');
      return;
    }
    const scopedPreferences = withSelectedClass(nextPrefs);
    setNotificationsSaving(true);
    setNotificationError('');
    setNotificationMessage('');
    try {
      const response = await notificationsAPI.updatePreferences(token, {
        ...scopedPreferences,
        timezone: scopedPreferences.timezone || getBrowserTimezone(),
      });
      if (!response.success || !response.preferences) {
        throw new Error('Benachrichtigungseinstellungen konnten nicht gespeichert werden.');
      }
      void capture('settings_updated', { section: 'notifications' });
      const savedPreferences = withSelectedClass({ ...defaultNotificationPreferences, ...response.preferences });
      setNotificationPrefs(savedPreferences);
      setNotificationClassSyncFailed(false);
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
      const activationPreferences = notificationTypesSelected
        ? notificationPrefs
        : { ...notificationPrefs, messages_enabled: true };
      setNotificationPrefs(activationPreferences);
      setNotificationsSaving(true);
      let registeredEndpoint: string | null = null;
      try {
        const subscription = await registerBrowserSubscription(endpoint => {
          registeredEndpoint = endpoint;
        });
        const response = await notificationsAPI.updatePreferences(token!, {
          ...withSelectedClass(activationPreferences),
          enabled: true,
          timezone: getBrowserTimezone(),
        });
        if (!response.success || !response.preferences) {
          throw new Error('Benachrichtigungseinstellungen konnten nicht aktiviert werden.');
        }
        void capture('settings_updated', { section: 'notifications' });
        const savedPreferences = withSelectedClass({ ...defaultNotificationPreferences, ...response.preferences });
        setNotificationPrefs(savedPreferences);
        setNotificationClassSyncFailed(false);
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
    void requestInstall('settings');
  };

  const changeThemeMode = (mode: 'system' | 'light' | 'dark' | 'oled') => {
    setThemeMode(mode);
    void updatePreferences({ appearance: { theme_mode: mode } });
  };

  const changeThemeColor = (color: ThemeColor) => {
    setThemeColor(color);
    void updatePreferences({ appearance: { theme_color: color } });
  };

  return (
    <div className="module-page">
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

      {section === 'home' && <SettingsIndex basePath={basePath} sections={visibleSettingsSections} />}

      {syncError && section !== 'notifications' && section !== 'home' && (
        <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{syncError}</p>
      )}

      {section === 'timetable' && (
        <div className="space-y-6">
          <VertretungsplanSettings />
          <TimetableSettings />
        </div>
      )}
      {section === 'navigation' && <SidebarSettings />}
      {section === 'connections' && <AgentsSettings />}
      {section === 'privacy' && <div className="space-y-6"><AnalyticsControls /><AccountSettings /></div>}

      <div className="space-y-6">
        {section === 'appearance' && (
          <>
        {/* Display mode */}
        <div className="card">
          <h3 className="item-title">Design</h3>
          <div className="segmented-control mt-4 grid-cols-2 sm:grid-cols-4" role="radiogroup" aria-label="Design">
            {([
              { id: 'system' as const, label: 'Automatisch', preview: 'bg-gradient-to-r from-surface-100 to-surface-800' },
              { id: 'light' as const, label: 'Hell', preview: 'bg-surface-100' },
              { id: 'dark' as const, label: 'Dunkel', preview: 'bg-surface-800' },
              { id: 'oled' as const, label: 'OLED', preview: 'bg-black' },
            ]).map(option => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={themeMode === option.id}
                onClick={() => changeThemeMode(option.id)}
                className="segmented-control-option min-h-20 flex-col items-start gap-2"
              >
                <span className={`h-7 w-full rounded-md border border-surface-200 dark:border-surface-700 ${option.preview}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="item-title mb-1">Primärfarbe</h3>
          <p className="mb-5 text-sm text-surface-500">Wähle die Akzentfarbe für die Oberfläche.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Primärfarbe">
            {themeColors.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => changeThemeColor(c.key)}
                aria-pressed={themeColor === c.key}
                aria-label={c.label}
                title={c.label}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900 ${themeColor === c.key ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-surface-200 dark:border-surface-700'}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: c.hex }}>
                  {themeColor === c.key && (
                    <CheckIcon className={`h-3 w-3 ${c.checkClass || 'text-white'}`} />
                  )}
                </span>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-200">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

          </>
        )}

        {/* Push-Benachrichtigungen */}
        {section === 'notifications' && (
        <>
        <DashboardSettings />
        <div className="card">
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
                <h3 className="item-title">Push-Benachrichtigungen</h3>
                <p className="text-sm text-surface-500 mt-0.5">Web-Push – auch, wenn Lanis geschlossen ist.</p>
                {notificationPrefs.enabled && !notificationBrowserReady && (
                  <p className="mt-1 text-xs text-surface-500">Für dieses Gerät noch nicht eingerichtet.</p>
                )}
              </div>
            </div>
            <SettingsSwitch
              checked={notificationPrefs.enabled && notificationBrowserReady}
              onChange={handleNotificationsToggle}
              disabled={notificationsLoading || notificationsSaving || !notificationSettingsLoaded || !notificationConfigured || !pushSupported}
              label="Push-Benachrichtigungen"
            />
          </div>

          <div className="mt-5 space-y-4 border-t border-surface-100 pt-5 dark:border-surface-800">
            {!notificationConfigured && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Push-Benachrichtigungen sind auf diesem Server noch nicht eingerichtet.
              </p>
            )}
            {notificationConfigured && !pushSupported && (
              <p className="rounded-xl bg-surface-50 p-3 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                Dieser Browser unterstützt keine Web-Push-Benachrichtigungen. Installiere Lanis oder verwende einen aktuellen Browser.
              </p>
            )}
            {pushSupported && notificationPermission === 'denied' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Dein Browser blockiert Benachrichtigungen. Erlaube sie in den Website-Einstellungen und versuche es erneut.
              </p>
            )}
            {notificationPrefs.enabled && !notificationBrowserReady && pushSupported && notificationPermission !== 'denied' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Push ist für dein Konto aktiviert, aber dieser Browser ist noch nicht eingerichtet. Aktiviere den Schalter, um ihn zu verbinden.
              </p>
            )}

            {notificationPrefs.enabled && <fieldset className="space-y-3">
              <legend className="item-title mb-3">Was soll gesendet werden?</legend>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  checked={notificationPrefs.messages_enabled}
                  onChange={event => setNotificationPrefs(previous => ({ ...previous, messages_enabled: event.target.checked }))}
                  disabled={notificationsLoading || notificationsSaving} />
                <span className="text-sm font-medium">Neue Nachrichten</span>
              </label>
              <div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    checked={notificationPrefs.vertretungsplan_enabled}
                    onChange={event => setNotificationPrefs(previous => ({ ...previous, vertretungsplan_enabled: event.target.checked }))}
                    disabled={notificationsLoading || notificationsSaving} />
                  <span className="text-sm font-medium">Änderungen im Vertretungsplan</span>
                </label>
                {notificationPrefs.vertretungsplan_enabled && (
                  <p className="ml-7 mt-1 text-xs text-surface-500">
                    Es wird die Klasse „{preferences.vertretungsplan.class_override.trim() || 'automatisch erkannte Klasse'}“ aus „Stundenplan &amp; Vertretungsplan“ verwendet.
                  </p>
                )}
              </div>
            </fieldset>}

            {notificationPrefs.enabled && <fieldset>
              <legend className="item-title mb-3">Aktive Zeiten</legend>
              <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="notification-start">Von</label>
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
                <label className="label" htmlFor="notification-end">Bis</label>
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
            </fieldset>}

            {notificationPrefs.enabled && <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
              disabled={notificationsLoading || notificationsSaving || notificationTestSending || !notificationSettingsLoaded || !notificationPrefs.enabled || !notificationBrowserReady || !notificationConfigured || !pushSupported}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {notificationTestSending ? 'Wird gesendet …' : 'Test senden'}
                </button>
                <button
                  type="button"
                  onClick={() => saveNotificationSettings({ ...notificationPrefs, timezone: notificationPrefs.timezone || getBrowserTimezone() })}
                  disabled={notificationsLoading || notificationsSaving || !notificationSettingsLoaded || !token || !notificationTypesSelected}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {notificationsSaving ? 'Wird gespeichert …' : 'Speichern'}
                </button>
            </div>}

            {notificationClassSyncFailed && (
              <div role="alert" className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p>Der Klassenfilter konnte nicht synchronisiert werden. Push-Benachrichtigungen verwenden möglicherweise noch die bisherige Klasse.</p>
                <button type="button" className="btn btn-secondary" onClick={() => void saveNotificationSettings(notificationPrefs)}
                  disabled={notificationsLoading || notificationsSaving || !notificationSettingsLoaded || !token}>
                  {notificationsSaving ? 'Wird gespeichert …' : 'Erneut versuchen'}
                </button>
              </div>
            )}
            {notificationError && (
              <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{notificationError}</p>
            )}
            {notificationMessage && (
              <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notificationMessage}</p>
            )}
          </div>
        </div>

        </>
        )}

        {/* App installieren */}
        {section === 'help' && (canInstall || installAvailability === 'installed') && (
          <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <ArrowDownTrayIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="item-title">
                {installAvailability === 'installed' ? 'Lanis ist installiert' : 'Lanis als Web-App installieren'}
              </h3>

              {installAvailability === 'installed' ? (
                <p className="text-sm text-surface-500 mt-1">
                  Öffne Lanis direkt über deinen Startbildschirm.
                </p>
              ) : (
                <>
                  <p className="text-sm text-surface-500 mt-1">
                    Füge Lanis zu deinem Gerät hinzu, um schnell darauf zuzugreifen und es wie eine App zu nutzen.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenInstall}
                    disabled={isInstalling}
                    className="btn btn-primary mt-4"
                  >
                    {isInstalling
                      ? 'Wird geöffnet…'
                      : installAvailability === 'ios-safari'
                        || installAvailability === 'ios-browser'
                        || installAvailability === 'macos-safari'
                        ? 'Anleitung öffnen'
                          : 'Installieren'}
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        )}

        {section === 'help' && !canInstall && installAvailability !== 'installed' && (
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-300">
                <DevicePhoneMobileIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="item-title">
                  {installAvailability === 'ios-other-browser'
                    ? 'Öffne Lanis in Safari, um es zu installieren'
                    : installAvailability === 'macos-safari'
                      ? 'Über Safari installieren'
                      : 'Installation nicht verfügbar'}
                </h3>
                <p className="mt-1 text-sm text-surface-500">
                  {installAvailability === 'ios-other-browser'
                    ? 'Öffne das Teilen-Menü in Safari und wähle „Zum Home-Bildschirm“.'
                    : installAvailability === 'macos-safari'
                      ? 'Wähle in Safari unter macOS Sonoma oder neuer „Ablage → Zum Dock hinzufügen“.'
                      : 'Dieser Browser bietet die Installation derzeit nicht an. Du kannst Lanis weiterhin hier nutzen.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {section === 'help' && !isDemo && (
          <section className="card">
            <h2 className="item-title">Einführung erneut starten</h2>
            <p className="mt-1 text-sm text-surface-500">Gehe die ersten Einrichtungsschritte noch einmal durch.</p>
            <Link to="/onboarding" className="btn btn-secondary mt-4">Einführung erneut starten</Link>
          </section>
        )}

        {/* Info */}
        {section === 'notifications' && (
          <div className="text-center text-xs text-surface-400">
            Die Benachrichtigungseinstellungen werden mit deinem Konto synchronisiert.
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

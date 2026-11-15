import { TimeInput } from '../ui/TimeInput';
import { Select, SelectOption } from '../ui/Select';
import { useCallback, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { toggleLessonProgress } from '../../platform/lessonProgress';
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon, ArrowTopRightOnSquareIcon, BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ANDROID_TAB_IDS, DEFAULT_ANDROID_TABS, useAndroidTabs } from '../../platform/androidNavigation';
import { getSidebarLabel } from '../../utils/sidebarNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsAPI } from '../../services/api';
import { isAndroid, LanisNative, type DeviceStatus } from '../../platform/native';
import type { NotificationPreferences } from '../../types';
import SettingsSwitch from '../settings/SettingsSwitch';
import AppLockSettings from './AppLockSettings';

const defaults: NotificationPreferences = { enabled: false, messages_enabled: true, vertretungsplan_enabled: false, vertretungsplan_class_mode: 'own', vertretungsplan_classes: [], start_time: '07:00', end_time: '21:00', timezone: 'Europe/Berlin', poll_interval_minutes: 15, show_preview: false };

export default function AndroidSettings({ notificationsOnly = false }: { notificationsOnly?: boolean }) {
  const { token } = useAuth();
  const [tabs, setTabs] = useAndroidTabs();
  const nativeAvailable = isAndroid && !window.location.pathname.startsWith('/demo');
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaults);
  const [serverPush, setServerPush] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!nativeAvailable || !token) return;
    const [native, remote] = await Promise.allSettled([
      LanisNative.getStatus(),
      Promise.all([notificationsAPI.getAndroidConfig(token), notificationsAPI.getPreferences(token)]),
    ]);
    if (native.status === 'rejected') throw native.reason;
    const device = native.value;
    setStatus(device);
    if (remote.status === 'fulfilled') {
      const [config, preferences] = remote.value;
      setServerPush(config.configured); setPrefs(preferences.preferences); setLoaded(true);
    } else {
      setServerPush(false); setLoaded(false);
      setError('Benachrichtigungen nicht erreichbar.');
    }

  }, [token, nativeAvailable]);
  useEffect(() => {
    if (!nativeAvailable) return;
    let active = true;
    const refresh = () => { void LanisNative.getStatus().then(device => { if (active) setStatus(device); }).catch(() => {}); };
    const listener = App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); });
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); void listener.then(handle => handle.remove()); };
  }, [nativeAvailable]);
  useEffect(() => { void load().catch(() => setError('Einstellungen nicht geladen. Prüfe deine Verbindung.')); }, [load]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Die Aktion konnte nicht abgeschlossen werden.'); }
    finally { setBusy(false); }
  };

  const enableNotifications = async (enabled: boolean) => {
    if (!token) return;
    if (enabled && !prefs.messages_enabled && !prefs.vertretungsplan_enabled) throw new Error('Wähle mindestens eine Benachrichtigungsart.');
    // Persist categories first so device registration can't create unexpected alerts.
    const next = { ...prefs, enabled };
    const response = await notificationsAPI.updatePreferences(token, next);
    if (!response.success) throw new Error('Die Benachrichtigungen konnten nicht gespeichert werden.');
    setPrefs(response.preferences);
    try {
      const result = await LanisNative.setNotifications({ enabled }); setStatus(result);
      if (enabled && !result.notificationsAllowed) throw new Error('Erlaube Benachrichtigungen in den Android-Einstellungen.');
      setMessage(enabled ? 'Benachrichtigungen aktiviert.' : 'Benachrichtigungen deaktiviert.');
    } catch (error) {
      if (enabled) {
        const rollback = await notificationsAPI.updatePreferences(token, { ...next, enabled: false });
        setPrefs(rollback.preferences);
      }
      throw error;
    }
  };

  const buttonClass = 'btn btn-secondary inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50';
  return <div className="space-y-6">
    {!notificationsOnly && <section id="navigation" className="card scroll-mt-6">
      <h2 className="text-base font-semibold">Navigationsleiste</h2>
      <p className="mt-1 text-sm text-surface-500">Wähle deine Verknüpfungen und ihre Reihenfolge.</p>
      <div className="mt-5 space-y-3">{tabs.map((tab, index) => <div key={tab} className="flex items-center gap-1.5">
        <label className="min-w-0 flex-1"><span className="sr-only">Verknüpfung {index + 1}</span>
          <Select className="input w-full min-w-0" value={tab} onValueChange={value => {
            const next = [...tabs];
            const existing = next.indexOf(value);
            if (existing >= 0) next[existing] = tab;
            next[index] = value;
            setTabs(next);
          }}>{ANDROID_TAB_IDS.map(id => <SelectOption key={id} value={id}>{getSidebarLabel(id)}</SelectOption>)}</Select>
        </label>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 disabled:opacity-25 dark:hover:bg-surface-800" disabled={index === 0} aria-label={`${getSidebarLabel(tab)} nach oben verschieben`} onClick={() => { const next = [...tabs]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setTabs(next); }}><ArrowUpIcon className="h-4 w-4" /></button>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 disabled:opacity-25 dark:hover:bg-surface-800" disabled={index === tabs.length - 1} aria-label={`${getSidebarLabel(tab)} nach unten verschieben`} onClick={() => { const next = [...tabs]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setTabs(next); }}><ArrowDownIcon className="h-4 w-4" /></button>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={`${getSidebarLabel(tab)} entfernen`} onClick={() => setTabs(tabs.filter(id => id !== tab))}><XMarkIcon className="h-4 w-4" /></button>
      </div>)}</div>
      {tabs.length < ANDROID_TAB_IDS.length && <label className="mt-4 block text-sm font-medium">Verknüpfung hinzufügen<Select className="input mt-1.5" value="" onValueChange={value => { if (value) setTabs([...tabs, value]); }}><SelectOption value="" disabled>Bereich auswählen …</SelectOption>{ANDROID_TAB_IDS.filter(id => !tabs.includes(id)).map(id => <SelectOption key={id} value={id}>{getSidebarLabel(id)}</SelectOption>)}</Select></label>}
      {!tabs.length && <p role="status" className="mt-3 text-sm text-surface-500">Leiste ausgeblendet. Alle Bereiche findest du im Menü.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-surface-500">Auf diesem Gerät gespeichert.</p><button type="button" className="btn btn-secondary shrink-0" onClick={() => setTabs(DEFAULT_ANDROID_TABS)}>Zurücksetzen</button></div>
    </section>}
    {!nativeAvailable && <p role="status" className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-200">Vorschau · Geräteeinstellungen sind in der Android-App verfügbar.</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}<button className="ml-2 underline" disabled={busy} onClick={() => void run(load)}>Erneut versuchen</button></div>}
    {message && <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircleIcon className="h-5 w-5 shrink-0" />{message}</p>}
    {nativeAvailable && !notificationsOnly && <AppLockSettings />}
    {nativeAvailable && !notificationsOnly && status?.lessonProgressSupported && <section className="card">
      <h2 className="section-title">Unterrichtsfortschritt</h2>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div><p className="text-sm font-medium">Unterricht anzeigen</p><p className="mt-1 text-sm text-surface-500">Verbleibende Unterrichtszeit als Live-Update.</p></div>
        <SettingsSwitch label="Unterricht als Live-Update anzeigen" checked={status.glyphLessonsEnabled} disabled={busy} onChange={() => void run(async () => {
          setStatus(await toggleLessonProgress(LanisNative));
        })} />
      </div>
      {status.glyphSupported && <button type="button" className="btn btn-secondary mt-4" disabled={busy} onClick={() => void run(async () => { await LanisNative.openGlyphSettings(); })}>Glyph-Einstellungen öffnen</button>}
      {status.glyphLessonsEnabled && <div className="mt-4 space-y-4 border-t border-surface-200 pt-4 dark:border-surface-700">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Pausen anzeigen</p><p className="mt-1 text-sm text-surface-500">Auch Pausen und Freistunden zwischen zwei Unterrichtsstunden anzeigen.</p></div>
          <SettingsSwitch label="Pausen als Live-Update anzeigen" checked={status.glyphBreaksEnabled} disabled={busy} onChange={() => void run(async () => { setStatus(await LanisNative.setLessonProgress({ enabled: true, breaks: !status.glyphBreaksEnabled })); })} />
        </div>
        {!status.notificationsAllowed && <button className="btn btn-secondary" disabled={busy} onClick={() => void run(async () => { await LanisNative.openNotificationSettings(); })}>Benachrichtigungen in Android erlauben</button>}
        {status.notificationsAllowed && !status.glyphPromotionAllowed && <button className="btn btn-secondary" disabled={busy} onClick={() => void run(async () => { await LanisNative.openProgressSettings(); })}>Live-Updates in Android erlauben</button>}
        <div className="flex items-center justify-between gap-4"><p className="text-sm font-medium">Nur kurz vor Ende anzeigen</p>
          <SettingsSwitch label="Live-Update erst vor Ende anzeigen" checked={status.glyphBeforeEndMinutes > 0} disabled={busy} onChange={() => void run(async () => { setStatus(await LanisNative.setLessonProgress({ enabled: true, breaks: status.glyphBreaksEnabled, beforeEndMinutes: status.glyphBeforeEndMinutes > 0 ? 0 : 5 })); })} />
        </div>
        {status.glyphBeforeEndMinutes > 0 && <label className="label block">Minuten vor Ende
          <Select aria-label="Fortschritt vor Stundenende" className="input mt-2" disabled={busy} value={status.glyphBeforeEndMinutes} onValueChange={value => { const minutes = Number(value); void run(async () => { setStatus(await LanisNative.setLessonProgress({ enabled: true, breaks: status.glyphBreaksEnabled, beforeEndMinutes: minutes })); }); }}>
            {Array.from({ length: 60 }, (_, i) => i + 1).map(minutes => <SelectOption key={minutes} value={minutes}>{minutes} {minutes === 1 ? 'Minute' : 'Minuten'}</SelectOption>)}
          </Select>
        </label>}
        <p className="text-xs text-surface-500">Android kann Aktualisierungen im Energiesparmodus verzögern.</p>
      </div>}
    </section>}


    <section className="card"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950 dark:text-primary-400"><BellIcon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="section-title break-words">Benachrichtigungen</h2><p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Nachrichten und Vertretungen direkt auf deinem Handy.</p></div></div>
      {nativeAvailable && loaded && (!serverPush || !status?.pushConfigured) && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Benachrichtigungen sind noch nicht eingerichtet.</p>}
      <div className="mt-5 flex items-center justify-between gap-4 border-b border-surface-200 pb-4 dark:border-surface-700"><p className="text-sm font-medium">Auf diesem Gerät aktivieren</p><SettingsSwitch label="Benachrichtigungen aktivieren" checked={Boolean(prefs.enabled && status?.notificationsEnabled)} disabled={busy || !loaded || !serverPush || !status?.pushConfigured} onChange={() => void run(() => enableNotifications(!(prefs.enabled && status?.notificationsEnabled)))} /></div>
      <div className="mt-4 space-y-4">{([{ key: 'messages_enabled', label: 'Neue Nachrichten' }, { key: 'vertretungsplan_enabled', label: 'Vertretungen' }, { key: 'show_preview', label: 'Inhaltsvorschau' }] as const).map(({ key, label }) => <div key={key} className="flex min-h-11 items-center justify-between gap-4 text-sm text-surface-800 dark:text-surface-200"><span>{label}</span><SettingsSwitch label={label} disabled={busy || !loaded} checked={prefs[key]} onChange={() => setPrefs(current => ({ ...current, [key]: !current[key] }))} /></div>)}
        <p className="text-sm font-medium">Benachrichtigungszeiten</p>
        <div className="grid grid-cols-2 gap-3"><div className="min-w-0 text-xs text-surface-500">Ab<TimeInput aria-label="Benachrichtigungen ab" className="input mt-1 w-full min-w-0" value={prefs.start_time} disabled={busy || !loaded} onValueChange={value => setPrefs({ ...prefs, start_time: value })} /></div><div className="min-w-0 text-xs text-surface-500">Bis<TimeInput aria-label="Benachrichtigungen bis" className="input mt-1 w-full min-w-0" value={prefs.end_time} disabled={busy || !loaded} onValueChange={value => setPrefs({ ...prefs, end_time: value })} /></div></div>
        <p className="text-xs text-surface-500">{prefs.timezone} · Prüfung alle {prefs.poll_interval_minutes} Min.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button className="btn btn-primary min-h-11 disabled:opacity-50" disabled={busy || !loaded || !token} onClick={() => void run(async () => { const result = await notificationsAPI.updatePreferences(token!, prefs); if (!result.success) throw new Error('Einstellungen konnten nicht gespeichert werden.'); setPrefs(result.preferences); setMessage('Einstellungen gespeichert.'); })}>Speichern</button>
        <button className={buttonClass} disabled={busy || !loaded || !prefs.enabled || !status?.notificationsEnabled || !status.notificationsAllowed} onClick={() => void run(async () => { const result = await notificationsAPI.sendTest(token!); if (!result.success) throw new Error('Test konnte nicht gesendet werden.'); setMessage('Testbenachrichtigung gesendet.'); })}>Test senden</button></div>
        <button className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-600 disabled:opacity-50 dark:text-primary-400" disabled={!nativeAvailable} onClick={() => void run(() => LanisNative.openNotificationSettings())}><ArrowTopRightOnSquareIcon className="h-4 w-4" />Android-Einstellungen</button>
      </div>
    </section>

  </div>;
}

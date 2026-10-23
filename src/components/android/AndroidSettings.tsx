import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowUpIcon, ArrowDownIcon, XMarkIcon, ArrowTopRightOnSquareIcon, BellIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, ShieldCheckIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { ANDROID_TAB_IDS, DEFAULT_ANDROID_TABS, useAndroidTabs } from '../../platform/androidNavigation';
import { getSidebarLabel } from '../../utils/sidebarNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsAPI } from '../../services/api';
import { isAndroid, LanisNative, type DeviceStatus, type WidgetKind } from '../../platform/native';
import type { NotificationPreferences } from '../../types';
import AppLockSettings from './AppLockSettings';

const widgets: { kind: WidgetKind; title: string; size: string; description: string }[] = [
  { kind: 'next', title: 'Nächste Stunde', size: 'Kompakt', description: 'Fach, Raum und Uhrzeit auf einen Blick.' },
  { kind: 'today', title: 'Dein Schultag', size: 'Übersicht', description: 'Deine heutigen Stunden mit Änderungen und Ausfällen.' },
  { kind: 'changes', title: 'Vertretungen', size: 'Änderungen', description: 'Änderungen und Hinweise aus deinem persönlichen Stundenplan.' },
];
const defaults: NotificationPreferences = { enabled: false, messages_enabled: true, vertretungsplan_enabled: false, vertretungsplan_class_mode: 'own', vertretungsplan_classes: [], start_time: '07:00', end_time: '21:00', timezone: 'Europe/Berlin', poll_interval_minutes: 15, show_preview: false };

export default function AndroidSettings({ notificationsOnly = false }: { notificationsOnly?: boolean }) {
  const { token } = useAuth();
  const [tabs, setTabs] = useAndroidTabs();
  const nativeAvailable = isAndroid && !window.location.pathname.startsWith('/demo');
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [kind, setKind] = useState<WidgetKind>('next');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaults);
  const [serverPush, setServerPush] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [subject, setSubject] = useState('Nächste Stunde');
  const [detail, setDetail] = useState('Fach · Raum · Uhrzeit');
  const selection = widgets.find(widget => widget.kind === kind)!;

  const load = useCallback(async () => {
    if (!nativeAvailable || !token) return;
    const [native, remote] = await Promise.allSettled([
      Promise.all([LanisNative.getStatus(), LanisNative.getTimetable()]),
      Promise.all([notificationsAPI.getAndroidConfig(token), notificationsAPI.getPreferences(token)]),
    ]);
    if (native.status === 'rejected') throw native.reason;
    const [device, snapshot] = native.value;
    setStatus(device);
    if (remote.status === 'fulfilled') {
      const [config, preferences] = remote.value;
      setServerPush(config.configured); setPrefs(preferences.preferences); setLoaded(true);
    } else {
      setServerPush(false); setLoaded(false);
      setError('Benachrichtigungen nicht erreichbar.');
    }
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const lesson = snapshot.data?.days.find(day => day.date >= today)?.lessons.find(lesson => !lesson.cancelled);
    if (lesson) { setSubject(lesson.subject); setDetail([lesson.start_time, lesson.room && `Raum ${lesson.room}`].filter(Boolean).join(' · ')); }
  }, [token]);
  useEffect(() => { void load().catch(() => setError('Einstellungen nicht geladen. Prüfe deine Verbindung.')); }, [load]);

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
          <select className="input w-full min-w-0" value={tab} onChange={event => {
            const next = [...tabs];
            const existing = next.indexOf(event.target.value);
            if (existing >= 0) next[existing] = tab;
            next[index] = event.target.value;
            setTabs(next);
          }}>{ANDROID_TAB_IDS.map(id => <option key={id} value={id}>{getSidebarLabel(id)}</option>)}</select>
        </label>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 disabled:opacity-25 dark:hover:bg-surface-800" disabled={index === 0} aria-label={`${getSidebarLabel(tab)} nach oben verschieben`} onClick={() => { const next = [...tabs]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setTabs(next); }}><ArrowUpIcon className="h-4 w-4" /></button>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 disabled:opacity-25 dark:hover:bg-surface-800" disabled={index === tabs.length - 1} aria-label={`${getSidebarLabel(tab)} nach unten verschieben`} onClick={() => { const next = [...tabs]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setTabs(next); }}><ArrowDownIcon className="h-4 w-4" /></button>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={`${getSidebarLabel(tab)} entfernen`} onClick={() => setTabs(tabs.filter(id => id !== tab))}><XMarkIcon className="h-4 w-4" /></button>
      </div>)}</div>
      {tabs.length < ANDROID_TAB_IDS.length && <label className="mt-4 block text-sm font-medium">Verknüpfung hinzufügen<select className="input mt-1.5" value="" onChange={event => { if (event.target.value) setTabs([...tabs, event.target.value]); }}><option value="" disabled>Bereich auswählen …</option>{ANDROID_TAB_IDS.filter(id => !tabs.includes(id)).map(id => <option key={id} value={id}>{getSidebarLabel(id)}</option>)}</select></label>}
      {!tabs.length && <p role="status" className="mt-3 text-sm text-surface-500">Leiste ausgeblendet. Alle Bereiche findest du im Menü.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-surface-500">Auf diesem Gerät gespeichert.</p><button type="button" className="btn btn-secondary shrink-0" onClick={() => setTabs(DEFAULT_ANDROID_TABS)}>Zurücksetzen</button></div>
    </section>}
    {!nativeAvailable && <p role="status" className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-200">Vorschau · Widgets sind in der Android-App verfügbar.</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}<button className="ml-2 underline" disabled={busy} onClick={() => void run(load)}>Erneut versuchen</button></div>}
    {message && <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircleIcon className="h-5 w-5 shrink-0" />{message}</p>}
    {nativeAvailable && !notificationsOnly && <AppLockSettings />}
    {!notificationsOnly && <>
      <section className="card !overflow-hidden !p-0">
        <div className="border-b border-surface-100 px-5 py-5 dark:border-surface-800 sm:px-6"><h2 className="flex items-center gap-2 text-base font-semibold text-surface-950 dark:text-white"><Squares2X2Icon className="h-5 w-5" />Widgets</h2></div>
        <div className="p-5 sm:p-6"><div role="group" aria-label="Widget auswählen" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">{widgets.map(widget => <button key={widget.kind} type="button" aria-pressed={kind === widget.kind} onClick={() => setKind(widget.kind)} className={`min-h-11 rounded-lg px-2 text-xs font-medium transition-colors ${kind === widget.kind ? 'bg-white text-surface-950 shadow-sm dark:bg-surface-700 dark:text-white' : 'text-surface-500 dark:text-surface-400'}`}>{widget.title}</button>)}</div>
          <div className="native-widget-stage"><div className={`native-widget-preview ${kind !== 'next' ? 'native-widget-tall' : ''}`}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-65">LANIS · {kind === 'next' ? 'Als Nächstes' : kind === 'today' ? 'Dein Schultag' : 'Vertretungen'}</span><CalendarDaysIcon className="h-4 w-4 opacity-60" /></div>
            <p className="mt-5 text-xl font-semibold leading-tight">{kind === 'changes' ? 'Änderungen im Blick' : subject}</p><p className="mt-2 text-xs opacity-70">{kind === 'changes' ? 'Ausfälle · Räume · Vertretungen' : detail}</p>{kind !== 'next' && <div className="mt-5 space-y-3" aria-hidden="true">{[80, 64, 72].map(width => <div key={width} className="flex items-center gap-3"><span className="h-7 w-1 rounded-full bg-current opacity-30" /><span style={{ width: `${width}%` }} className="h-2 rounded-full bg-current opacity-10" /></div>)}</div>}
            <div className="mt-5 flex items-center gap-1.5 text-[10px] opacity-60"><ClockIcon className="h-3 w-3" />Vorschau</div></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-semibold text-surface-900 dark:text-white">{selection.title}<span className="ml-2 text-xs font-normal text-surface-400">{selection.size}</span></h3><p className="mt-1 max-w-sm text-sm text-surface-500 dark:text-surface-400">{selection.description}</p></div><button type="button" disabled={busy || !nativeAvailable || !status?.widgetPinSupported} className="btn btn-primary min-h-11" onClick={() => void run(async () => { const result = await LanisNative.pinWidget({ kind }); setMessage(result.requested ? 'Bestätige das Widget auf deinem Homescreen.' : 'Öffne die Widget-Auswahl deines Launchers und suche nach LANIS.'); })}>Widget hinzufügen</button></div>
          {nativeAvailable && status && !status.widgetPinSupported && <p className="mt-3 text-xs text-surface-500">Halte eine freie Stelle auf deinem Homescreen gedrückt und wähle Widgets → LANIS.</p>}
        </div>
      </section>
      <section className="card"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950 dark:text-primary-400"><ArrowPathIcon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="font-semibold text-surface-950 dark:text-white">Offline-Stundenplan</h2><p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Automatisch gespeichert und im Hintergrund aktualisiert.</p><p className="mt-3 text-xs text-surface-500">{status?.lastUpdated ? `Zuletzt aktualisiert: ${new Date(status.lastUpdated).toLocaleString('de-DE')}` : 'Zum Speichern einmal den Stundenplan öffnen.'}</p>{status?.syncError && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{status.syncError}</p>}<button className={`${buttonClass} mt-4`} disabled={busy || !nativeAvailable} onClick={() => void run(async () => { const result = await LanisNative.sync(); setStatus(result); if (result.syncError) throw new Error(result.syncError); setMessage('Stundenplan und Widgets wurden aktualisiert.'); })}><ArrowPathIcon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Jetzt aktualisieren</button></div></div><p className="mt-5 border-t border-surface-100 pt-4 text-xs text-surface-500 dark:border-surface-800">Android kann Aktualisierungen verzögern, um Akku zu sparen.</p></section>
    </>}
    <section className="card"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950 dark:text-primary-400"><BellIcon className="h-5 w-5" /></div><div className="flex-1"><h2 className="font-semibold text-surface-950 dark:text-white">Benachrichtigungen</h2><p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Nachrichten und Vertretungen direkt auf deinem Handy.</p></div></div>
      {nativeAvailable && loaded && (!serverPush || !status?.pushConfigured) && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Benachrichtigungen sind noch nicht eingerichtet.</p>}
      <div className="mt-5 space-y-4">{([{ key: 'messages_enabled', label: 'Neue Nachrichten' }, { key: 'vertretungsplan_enabled', label: 'Vertretungen' }, { key: 'show_preview', label: 'Inhaltsvorschau' }] as const).map(({ key, label }) => <label key={key} className="flex min-h-11 items-center justify-between gap-4 text-sm text-surface-800 dark:text-surface-200"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-primary-600" disabled={busy || !loaded} checked={prefs[key]} onChange={event => setPrefs({ ...prefs, [key]: event.target.checked })} /></label>)}
        <div className="grid grid-cols-2 gap-3"><label className="text-xs text-surface-500">Ab<input aria-label="Benachrichtigungen ab" type="time" className="input mt-1 w-full" value={prefs.start_time} disabled={busy || !loaded} onChange={event => setPrefs({ ...prefs, start_time: event.target.value })} /></label><label className="text-xs text-surface-500">Bis<input aria-label="Benachrichtigungen bis" type="time" className="input mt-1 w-full" value={prefs.end_time} disabled={busy || !loaded} onChange={event => setPrefs({ ...prefs, end_time: event.target.value })} /></label></div>
        <p className="text-xs text-surface-500">{prefs.timezone} · Prüfung alle {prefs.poll_interval_minutes} Min.</p>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary min-h-11 disabled:opacity-50" disabled={busy || !loaded || !serverPush || !status?.pushConfigured} onClick={() => void run(() => enableNotifications(!(prefs.enabled && status?.notificationsEnabled)))}>{prefs.enabled && status?.notificationsEnabled ? 'Ausschalten' : 'Einschalten'}</button><button className={buttonClass} disabled={busy || !loaded || !token} onClick={() => void run(async () => { const result = await notificationsAPI.updatePreferences(token!, prefs); if (!result.success) throw new Error('Einstellungen konnten nicht gespeichert werden.'); setPrefs(result.preferences); setMessage('Einstellungen gespeichert.'); })}>Speichern</button>
        <button className={buttonClass} disabled={busy || !loaded || !prefs.enabled || !status?.notificationsEnabled || !status.notificationsAllowed} onClick={() => void run(async () => { const result = await notificationsAPI.sendTest(token!); if (!result.success) throw new Error('Test konnte nicht gesendet werden.'); setMessage('Testbenachrichtigung gesendet.'); })}>Test senden</button></div>
        <button className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-600 disabled:opacity-50 dark:text-primary-400" disabled={!nativeAvailable} onClick={() => void run(() => LanisNative.openNotificationSettings())}><ArrowTopRightOnSquareIcon className="h-4 w-4" />Android-Einstellungen</button>
      </div>
    </section>
    {!notificationsOnly && <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-surface-500 dark:text-surface-400"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0" /><p>Anmeldung und Offline-Daten sind verschlüsselt. Abmelden löscht sie und leert die Widgets.{status && <span className="mt-1 block">LANIS für Android · {status.version}</span>}</p></div>}
  </div>;
}

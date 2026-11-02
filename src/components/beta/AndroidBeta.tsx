import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DevicePhoneMobileIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { androidBetaAPI, AndroidBetaState } from '../../services/api';
import { betaPrompt, isAndroidBrowser } from '../../utils/androidBeta';

const GROUP_URL = 'https://groups.google.com/g/lanis-beta/about';
const JOIN_URL = 'https://play.google.com/apps/testing/de.joancode.lanis';

export default function AndroidBeta({ settings = false }: { settings?: boolean }) {
  const { token } = useAuth();
  const [state, setState] = useState<AndroidBetaState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const mutation = useRef(false);
  const locallyClosed = useRef(false);
  const native = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  const eligible = isAndroidBrowser(navigator.userAgent, native);

  const load = useCallback(async () => {
    if (!token) return;
    const version = ++generation.current;
    try {
      const next = await androidBetaAPI.get(token);
      if (version === generation.current) { setState(next); setError(''); }
    } catch {
      if (version === generation.current) { setState(null); setError('Die Beta-Einstellungen konnten nicht geladen werden.'); }
    } finally { if (version === generation.current) setLoading(false); }
  }, [token]);

  useEffect(() => {
    void load();
    const resume = () => { if (document.visibilityState === 'visible' && !mutation.current && !open) void load(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { generation.current++; document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, [load, open]);

  useEffect(() => {
    if (settings || !eligible || !state?.available) { setOpen(false); return; }
    if (open || locallyClosed.current || !betaPrompt(state)) return;
    const timer = window.setInterval(() => {
      const pwa = document.querySelector('pwa-install') as (HTMLElement & { isDialogHidden?: boolean }) | null;
      if (pwa?.isDialogHidden === false || document.visibilityState !== 'visible' || document.documentElement.classList.contains('onboarding-active') || document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open], [aria-modal="true"]')) return;
      setOpen(true);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [settings, eligible, state, open]);

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    // Only recruitment cooldown is recorded, never group membership or Play enrollment.
    if (token) void androidBetaAPI.change(token, 'presented').catch(() => setError('Die Erinnerung konnte nicht gespeichert werden. Bitte versuche „Später“ erneut.'));
    return () => { node.close(); previous?.focus(); };
  }, [open, token]);

  function closeLocally() {
    locallyClosed.current = true;
    setOpen(false);
  }

  async function dismiss(action: 'later' | 'dismiss') {
    if (!token || mutation.current) return;
    mutation.current = true; generation.current++; setBusy(true); setError('');
    try { setState(await androidBetaAPI.change(token, action)); setOpen(false); }
    catch { setError('Die Erinnerung konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { mutation.current = false; setBusy(false); }
  }

  const content = <div className="space-y-5">
    <div className="flex items-start gap-3">
      <span className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950 dark:text-primary-400"><DevicePhoneMobileIcon className="h-6 w-6" /></span>
      <div><p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">Android · Geschlossene Beta</p><h2 id={settings ? 'beta-settings-title' : 'beta-dialog-title'} className="item-title mt-1">Teste die LANIS Android-App</h2></div>
    </div>
    <p className="text-sm text-surface-600 dark:text-surface-400">Hilf uns, die App im Alltag zu testen: Nutze sie, gib Feedback und bleibe mindestens 14 Tage im geschlossenen Test angemeldet.</p>
    {loading && <p role="status" className="text-sm">Beta-Einstellungen werden geladen…</p>}
    {!state?.available && !loading && <p className="rounded-xl bg-surface-100 p-3 text-sm dark:bg-surface-800">{state ? 'Der geschlossene Test ist noch nicht freigegeben. Die Links bleiben hier verfügbar. Der Download ist erst möglich, wenn die Veröffentlichung in Google Play abgeschlossen ist.' : 'Die Verfügbarkeit des geschlossenen Tests konnte nicht geprüft werden. Die Links bleiben hier verfügbar; der Download setzt eine veröffentlichte Testversion voraus.'}</p>}
    <ol className="space-y-3">
      <li className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
        <h3 className="text-sm font-semibold">1. Google-Gruppe beitreten</h3>
        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">Melde dich mit dem Google-Konto an, das du im Play Store verwendest, und tritt der Gruppe bei.</p>
        <a className="btn btn-secondary mt-3 inline-flex items-center gap-2" href={state?.group_url || GROUP_URL} target="_blank" rel="noopener noreferrer">Zur Google-Gruppe<ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" /></a>
      </li>
      <li className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
        <h3 className="text-sm font-semibold">2. Dem geschlossenen Test beitreten</h3>
        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">Öffne den Test mit demselben Google-Konto. Bestätige dort ausdrücklich deinen Beitritt. Danach kannst du die App herunterladen.</p>
        <a className={`btn ${state?.available ? 'btn-primary' : 'btn-secondary'} mt-3 inline-flex items-center gap-2`} href={state?.join_url || JOIN_URL} target="_blank" rel="noopener noreferrer">Beta beitreten<ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" /></a>
      </li>
    </ol>
    <p className="text-xs text-surface-500 dark:text-surface-400">Die Gruppenmitgliedschaft ermöglicht den Zugang; sie ersetzt den Testbeitritt nicht. LANIS prüft weder Mitgliedschaft noch Testbeitritt oder Installation. Bei beaufsichtigten Kinderkonten kann Google den Gruppenbeitritt einschränken.</p>
    {error && <div role="alert" className="space-y-2 text-sm text-red-600 dark:text-red-400"><p>{error} {!state && <button className="ml-1 underline" onClick={() => void load()}>Erneut versuchen</button>}</p>{!settings && <button type="button" className="btn btn-secondary" onClick={closeLocally}>Ohne Speichern schließen</button>}</div>}
    {!settings && <div className="flex flex-wrap gap-2 border-t border-surface-200 pt-4 dark:border-surface-700"><button className="btn btn-secondary" disabled={busy} onClick={() => void dismiss('later')}>Später</button><button className="btn btn-ghost" disabled={busy} onClick={() => void dismiss('dismiss')}>Nicht mehr anzeigen</button></div>}
  </div>;
  if (settings) return <section aria-labelledby="beta-settings-title" className="card p-4 sm:p-6">{content}</section>;
  return open ? <dialog ref={dialog} aria-labelledby="beta-dialog-title" onCancel={event => { event.preventDefault(); if (error) closeLocally(); else void dismiss('later'); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-surface-200 bg-white p-5 text-surface-900 shadow-xl backdrop:bg-black/50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 sm:p-6">{content}</dialog> : null;
}

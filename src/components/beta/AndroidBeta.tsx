import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DevicePhoneMobileIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { androidBetaAPI, AndroidBetaState } from '../../services/api';
import { betaPrompt, isAndroidBrowser } from '../../utils/androidBeta';

export default function AndroidBeta({ settings = false, mode = 'all' }: { settings?: boolean; mode?: 'all' | 'approval' | 'invitation' }) {
  const { token } = useAuth();
  const [state, setState] = useState<AndroidBetaState | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [signup, setSignup] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const revision = useRef(0);
  const mutation = useRef(false);
  const serverEmail = useRef<string | null | undefined>(undefined);
  const native = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  const eligible = isAndroidBrowser(navigator.userAgent, native);
  const load = useCallback(async () => {
    if (!token) return;
    const version = ++revision.current;
    try {
      const next = await androidBetaAPI.get(token);
      if (version !== revision.current) return;
      setState(next);
      if (serverEmail.current !== next.email) setEmail(next.email || '');
      serverEmail.current = next.email; setError('');
    } catch { if (version === revision.current) { setState(null); setError('Der Beta-Status konnte nicht geladen werden. Bitte versuche es erneut.'); } }
    finally { if (version === revision.current) setLoading(false); }
  }, [token]);
  useEffect(() => {
    void load();
    const resume = () => { if (document.visibilityState === 'visible' && !mutation.current && !settings) void load(); };
    const changed = () => { if (!mutation.current) void load(); };
    window.addEventListener('android-beta-changed', changed);
    document.addEventListener('visibilitychange', resume); window.addEventListener('focus', resume);
    return () => { revision.current++; window.removeEventListener('android-beta-changed', changed); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, [load, settings]);
  useEffect(() => {
    if (settings || !eligible || !state || (!betaPrompt(state) && !(open && state.status === 'pending')) || (mode === 'approval' && betaPrompt(state) !== 'approval') || (mode === 'invitation' && state.status === 'approved')) { setOpen(false); return; }
    const attempt = () => {
      if (!betaPrompt(state)) return;
      const pwa = document.querySelector('pwa-install') as (HTMLElement & { isDialogHidden?: boolean }) | null;
      if (pwa?.isDialogHidden === false) return;
      if (document.visibilityState !== 'visible' || document.documentElement.classList.contains('onboarding-active') || document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open], [aria-modal="true"]')) return;
      setOpen(true);
    };
    const timer = window.setInterval(attempt, 1500);
    return () => window.clearInterval(timer);
  }, [settings, eligible, state, mode, open, error]);
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    // Starting the invitation also sets the account cooldown if navigation interrupts it.
    if (token && state?.status === 'none') {
      void androidBetaAPI.change(token, 'later').catch(() => setError('Die Erinnerung konnte nicht gespeichert werden. Bitte versuche „Später“ erneut.'));
    }
    return () => { node.close(); previous?.focus(); };
  }, [open]);
  async function change(action: string) {
    if (!token || busy) return;
    mutation.current = true; setBusy(true); setError(''); setNotice(''); revision.current++;
    try {
      const next = await androidBetaAPI.change(token, action, email, state?.revision);
      setState(next); setEmail(next.email || ''); serverEmail.current = next.email;
      if (action === 'withdraw') setNotice('Deine Anmeldung wurde zurückgezogen.');
      if (action === 'signup' && settings) setNotice('Deine Adresse wurde gespeichert.');
      window.dispatchEvent(new Event('android-beta-changed'));
      if (action !== 'signup') setOpen(false);
      setSignup(false);
    } catch { setError(action === 'signup' ? 'Die Anmeldung konnte nicht gespeichert werden. Prüfe die Adresse und versuche es erneut. Falls sie schon verwendet wird, nutze eine andere.' : 'Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  const approved = state?.status === 'approved';
  const pending = state?.status === 'pending';
  const form = <form className="space-y-4" onSubmit={event => { event.preventDefault(); void change('signup'); }}>
    <div><label className="label" htmlFor={settings ? 'beta-email-settings' : 'beta-email-dialog'}>Google-Play-E-Mail-Adresse</label><input id={settings ? 'beta-email-settings' : 'beta-email-dialog'} className="input w-full" type="email" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} autoComplete="email" aria-describedby="beta-email-help" /></div>
    <p id="beta-email-help" className="text-sm text-surface-600 dark:text-surface-400">Gib die E-Mail-Adresse des Google-Kontos ein, das du im Play Store verwendest. Wir fügen sie manuell zur Google-Play-Tester-Liste hinzu.</p>
    <p className="text-sm text-surface-600 dark:text-surface-400">Nutze die App, gib uns Feedback und bleibe mindestens 14 Tage im geschlossenen Test angemeldet.</p>
    {approved && <p className="text-sm text-amber-700 dark:text-amber-300">Eine neue Adresse muss erneut freigeschaltet werden.</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Wird gespeichert…' : pending || approved ? 'Adresse speichern' : 'Auf die Warteliste'}</button>
  </form>;
  const content = <div className="space-y-4">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-950 dark:text-primary-400">{approved ? <CheckCircleIcon className="h-6 w-6" /> : <DevicePhoneMobileIcon className="h-6 w-6" />}</span><div><p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">Android · Geschlossene Beta</p><h2 id={settings ? 'beta-settings-title' : 'beta-dialog-title'} className="item-title mt-1">{approved ? 'Dein Zugang wurde freigeschaltet.' : pending ? 'Du bist auf der Warteliste.' : 'Teste die LANIS Android-App'}</h2></div></div>
    {loading ? <p role="status" className="text-sm">Beta-Status wird geladen…</p> : error && !state ? null : <>
      {pending && <p role="status" className="text-sm text-surface-600 dark:text-surface-400">Sobald du freigeschaltet bist, informieren wir dich hier in LANIS.</p>}
      {(pending || approved) && <p className="break-all text-sm font-medium">{state?.email}</p>}
      {approved && state?.available && <><p className="text-sm text-surface-600 dark:text-surface-400">Öffne Google Play mit dieser Google-Adresse und tritt dem Test ausdrücklich bei. Danach kannst du die App herunterladen.</p><a className="btn btn-primary inline-flex" href={state.join_url} target="_blank" rel="noopener noreferrer">Beta beitreten</a></>}
      {!state?.available && <p className="text-sm text-surface-600 dark:text-surface-400">Die Beta-Anmeldung ist derzeit geschlossen. Deine Anmeldung kannst du weiterhin zurückziehen.</p>}
      {state?.available && ((!pending && !approved && (settings || signup)) || ((pending || approved) && settings)) && form}
      {!settings && !signup && !pending && !approved && <><p className="text-sm text-surface-600 dark:text-surface-400">Hilf uns, die Android-App im Alltag zu testen. Melde dich mit deiner Google-Play-Adresse an.</p><button className="btn btn-primary" onClick={() => setSignup(true)}>Ich möchte mitmachen</button></>}
      {settings && (pending || approved) && <button className="btn btn-ghost" disabled={busy} onClick={() => void change('withdraw')}>Anmeldung zurückziehen</button>}
    </>}
    {notice && <p role="status" className="text-sm text-primary-700 dark:text-primary-300">{notice}</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error} {!state && <button className="underline" onClick={() => void load()}>Erneut versuchen</button>}</p>}
    {!settings && <div className="flex flex-wrap gap-2 border-t border-surface-200 pt-4 dark:border-surface-700">{approved ? <button className="btn btn-secondary" disabled={busy} onClick={() => void change('acknowledge')}>Schließen</button> : pending ? <button className="btn btn-secondary" onClick={() => setOpen(false)}>Schließen</button> : <><button className="btn btn-secondary" disabled={busy} onClick={() => void change('later')}>Später</button><button className="btn btn-ghost" disabled={busy} onClick={() => void change('dismiss')}>Nicht mehr anzeigen</button></>}</div>}
  </div>;
  if (settings) return <section aria-labelledby="beta-settings-title" className="card p-4 sm:p-6">{content}</section>;
  return open ? <dialog ref={dialog} aria-labelledby="beta-dialog-title" onCancel={event => { event.preventDefault(); void change(approved ? 'acknowledge' : 'later'); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-surface-200 bg-white p-5 text-surface-900 shadow-xl backdrop:bg-black/50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 sm:p-6">{content}</dialog> : null;
}

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, ArrowPathIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';
import { AgentAuthorization as Authorization, agentsAPI } from '../../services/api';
import LoginForm from '../auth/LoginForm';
import { AgentMark, agentButton, agentPanel } from '../settings/AgentsSettings';

const AgentAuthorization: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const [params] = useSearchParams();
  const request = params.get('request') || '';
  const [data, setData] = useState<Authorization | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token || !request) return;
    let cancelled = false;
    setError(''); setData(null);
    agentsAPI.authorization(token, request).then(result => {
      if (cancelled) return;
      setData(result); setName(result.client_name); setScopes(result.scopes.map(s => s.id));
    }).catch(error => {
      if (cancelled) return;
      const gone = error?.response?.status === 410;
      setExpired(gone);
      setError(gone ? 'Diese Anfrage ist abgelaufen oder wurde bereits beantwortet. Starte die Verbindung in deinem Agenten erneut.' : 'Die Verbindungsanfrage konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.');
    });
    return () => { cancelled = true; };
  }, [token, request, retry]);
  const decide = async (approve: boolean) => {
    if (!token || !data || busy) return;
    setBusy(true); setError('');
    try {
      const result = await agentsAPI.decide(token, request, approve, scopes, name);
      // Callback comes exclusively from the server’s validated, stored OAuth request.
      const target = new URL(result.redirect_url);
      if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Invalid callback');
      window.location.assign(target.href);
    } catch (error: any) {
      const gone = error?.response?.status === 410;
      setExpired(gone);
      setError(gone ? 'Diese Anfrage ist abgelaufen. Starte die Verbindung in deinem Agenten erneut.' : 'Deine Entscheidung konnte nicht gespeichert werden. Bitte versuche es erneut.');
      setBusy(false);
    }
  };
  const meta = <Helmet><title>Agent verbinden | LANIS</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>;
  if (!request) return <main className="mx-auto max-w-lg px-5 py-20">{meta}<h1 className="text-2xl font-semibold">Keine Verbindungsanfrage</h1><p className="mt-3 text-surface-500">Starte die Verbindung in ChatGPT, Claude oder deinem Agenten. Hier bestätigst du anschließend den Zugriff.</p><Link to="/settings/agents" className={`${agentButton} mt-6`}>Zu deinen Agenten</Link></main>;
  if (!isAuthenticated) return <>{meta}<div className="border-b border-surface-200 bg-primary-50 px-5 py-4 text-center text-sm text-primary-800 dark:border-surface-800 dark:bg-primary-950 dark:text-primary-200">Melde dich bei LANIS an, um die Agenten-Anfrage zu prüfen. Du erteilst damit noch keinen Zugriff.</div><LoginForm /></>;
  return <main className="flex min-h-[100dvh] items-center justify-center bg-surface-50 px-4 py-10 dark:bg-surface-950 sm:py-16">{meta}
    <div className="w-full max-w-xl"><Link to="/settings/agents" className="mb-7 flex items-center justify-center gap-2 text-sm font-bold tracking-[0.2em] text-surface-500"><LockClosedIcon className="h-4 w-4" /> LANIS</Link>
      <section className={`${agentPanel} !p-0 overflow-hidden shadow-soft-md`}>
        {!data ? <div className="p-8 text-center">{error ? <><h1 className="text-xl font-semibold">Verbindung nicht verfügbar</h1><p role="alert" className="mt-3 text-sm leading-relaxed text-surface-500">{error}</p>{!expired && <button onClick={() => setRetry(v => v + 1)} className={`${agentButton} mt-5`}><ArrowPathIcon className="h-4 w-4" />Erneut versuchen</button>}<Link to="/settings/agents" className="mt-5 block text-sm text-primary-600">Zu deinen Agenten</Link></> : <p role="status" className="text-sm text-surface-500">Verbindungsanfrage wird geprüft …</p>}</div> : <>
          <div className="px-6 pb-6 pt-8 sm:px-9"><div aria-hidden="true" className="mb-7 flex items-center justify-center gap-5"><AgentMark name={data.client_name} large /><span className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700"><ArrowRightIcon className="h-4 w-4 text-surface-400" /></span><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">LANIS</span></div>
            <h1 className="text-center text-2xl font-semibold tracking-tight">{data.client_name} mit LANIS verbinden?</h1><p className="mt-3 text-center text-sm leading-relaxed text-surface-500">Dieser Agent möchte auf dein Schulportal zugreifen. Wähle aus, was du freigeben möchtest.</p>
            <div className="mt-6 rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm dark:border-surface-700 dark:bg-surface-950"><p className="font-medium">{data.username} <span className="font-normal text-surface-500">· Schule {data.school_id}</span></p><p className="mt-2 break-all text-xs text-surface-500">Rückkehr zu: <span className="font-medium text-surface-700 dark:text-surface-300">{data.redirect_origin}</span></p><p className="mt-2 text-xs leading-relaxed text-surface-500">Der App-Name wurde vom Anbieter angegeben. Bestätige nur, wenn du diese Verbindung selbst gestartet hast und die Adresse kennst.</p></div>
          </div>
          <div className="border-y border-surface-100 px-6 py-6 dark:border-surface-800 sm:px-9"><fieldset disabled={busy || expired}><legend className="mb-4 text-sm font-semibold">Diesen Zugriff erlauben</legend><div className="space-y-3">{data.scopes.map(s => <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${scopes.includes(s.id) ? 'border-primary-300 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30' : 'border-surface-200 dark:border-surface-700'}`}><input type="checkbox" checked={scopes.includes(s.id)} onChange={e => setScopes(e.target.checked ? [...scopes, s.id] : scopes.filter(v => v !== s.id))} className="mt-1 h-4 w-4 shrink-0 accent-primary-600" /><span><span className="block text-sm font-medium">{s.title}</span><span className="mt-1 block text-xs leading-relaxed text-surface-500">{s.description}</span></span></label>)}</div></fieldset><label className="mt-5 block text-xs font-medium text-surface-500">Name in deinen Einstellungen<input value={name} onChange={e => setName(e.target.value)} maxLength={100} disabled={busy} className="mt-2 w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-950 dark:text-white" /></label></div>
          <div className="p-6 sm:px-9"><p className="mb-4 text-xs leading-relaxed text-surface-500">Freigegebene Inhalte werden an den Anbieter dieses Agenten übertragen. <Link to="/privacy-policy" target="_blank" rel="noreferrer" className="underline underline-offset-2">Mehr zum Datenschutz</Link></p><p className="mb-5 flex items-start gap-2 text-xs leading-relaxed text-surface-500"><ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary-600" />Dein Passwort wird nicht weitergegeben. Du kannst diese Verbindung jederzeit unter Einstellungen → Agents trennen.</p>{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<button onClick={() => decide(true)} disabled={busy || expired || !scopes.length || !name.trim()} className={`${agentButton} w-full`}>{busy ? 'Du wirst zurückgeleitet …' : 'Zugriff erlauben'}</button><button onClick={() => decide(false)} disabled={busy || expired} className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-medium text-surface-500 hover:bg-surface-100 disabled:opacity-50 dark:hover:bg-surface-800">Ablehnen</button>{!scopes.length && <p role="status" className="mt-3 text-center text-xs text-surface-500">Wähle mindestens eine Berechtigung oder lehne die Anfrage ab.</p>}</div>
        </>}
      </section><p className="mt-6 text-center text-xs text-surface-400">Deine Entscheidung gilt nur für diese Verbindung.</p>
    </div>
  </main>;
};
export default AgentAuthorization;

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';
import { AccessMode, AgentAuthorization as Authorization, agentsAPI } from '../../services/api';
import LoginForm from '../auth/LoginForm';
import AppIcon from '../AppIcon';
import AccessPicker from './AccessPicker';
import { API_BASE_URL } from '../../services/api';
import { CUSTOM_BACKEND_STORAGE_KEY, normalizeBackendUrl } from '../../utils/backendConfig';
import { agentBackendSwitchPath, agentCallbackUrl } from '../../utils/agentBackend';

export default function AgentAuthorization() {
  const { isAuthenticated, token, user } = useAuth();
  const tokenRef = useRef(token);
  useLayoutEffect(() => { tokenRef.current = token; }, [token]);
  const account = user ? `${user.school_id}:${user.username}` : null;
  const [params] = useSearchParams();
  const request = params.get('request') || '';
  let issuer = API_BASE_URL;
  let invalidIssuer = false;
  try { if (params.has('issuer')) issuer = normalizeBackendUrl(params.get('issuer') || ''); }
  catch { invalidIssuer = true; }
  const backendMismatch = issuer !== API_BASE_URL;
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === CUSTOM_BACKEND_STORAGE_KEY) window.location.reload(); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  const [data, setData] = useState<Authorization | null>(null);
  const [mode, setMode] = useState<AccessMode>('restricted');
  const [scopes, setScopes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const currentToken = tokenRef.current;
    if (!isAuthenticated || !currentToken || !request || invalidIssuer || backendMismatch) return;
    let cancelled = false;
    setError(''); setData(null); setExpired(false); setBusy(false);
    agentsAPI.authorization(currentToken, request).then(result => {
      if (cancelled) return;
      setData(result); setMode(result.presets.restricted.length ? 'restricted' : 'custom'); setScopes(result.presets.restricted);
    }).catch(error => {
      if (cancelled) return;
      const gone = error?.response?.status === 410;
      setExpired(gone); setError(gone ? 'Anfrage abgelaufen. Im Agenten erneut verbinden.' : 'Anfrage konnte nicht geladen werden.');
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, account, request, retry, invalidIssuer, backendMismatch]);
  const selectMode = (next: AccessMode) => { setMode(next); if (next !== 'custom') setScopes(data?.presets[next] || []); };
  const decide = async (approve: boolean) => {
    if (!token || !data || busy || invalidIssuer || backendMismatch) return;
    setBusy(true); setError('');
    try {
      const result = await agentsAPI.decide(token, request, approve, scopes, data.client_name, mode);
      window.location.assign(agentCallbackUrl(result.redirect_url, data.redirect_origin));
    } catch (error: any) {
      const gone = error?.response?.status === 410;
      setExpired(gone); setError(gone ? 'Anfrage abgelaufen. Im Agenten erneut verbinden.' : 'Nicht gespeichert. Bitte erneut versuchen.'); setBusy(false);
    }
  };
  const meta = <Helmet><title>Agent verbinden | LANIS</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>;
  if (invalidIssuer || backendMismatch) return <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">{meta}<section className="card w-full max-w-md"><AppIcon alt="LANIS" className="mb-6 h-12 w-12 rounded-xl" /><h1 className="page-title">{invalidIssuer ? 'Ungültige Anfrage' : 'Anderes Backend'}</h1><p className="mt-3 text-sm text-surface-500">{invalidIssuer ? 'Starte die Verbindung im Agenten erneut.' : 'Diese Verbindung gehört zu einem anderen LANIS-Backend.'}</p>{!invalidIssuer && <><p className="mt-3 break-all text-sm font-medium">{issuer}</p><Link className="btn btn-primary mt-6" to={agentBackendSwitchPath(request, issuer)}>Backend prüfen</Link></>}<Link className="btn btn-ghost mt-6" to="/settings/agents">Abbrechen</Link></section></main>;
  if (!request) return <main className="mx-auto max-w-md px-5 py-16">{meta}<AppIcon alt="LANIS" className="mb-6 h-12 w-12 rounded-xl" /><h1 className="page-title">Keine Anfrage</h1><p className="page-subtitle">Starte die Verbindung in deinem Agenten.</p><Link className="btn btn-secondary mt-6" to="/settings/agents">Zu den Agenten</Link></main>;
  if (!isAuthenticated) return <>{meta}<p className="bg-primary-50 px-4 py-3 text-center text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200">Anmelden, um den Zugriff zu wählen.</p><LoginForm /></>;
  return <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">{meta}
    <section className="card w-full max-w-md sm:p-8">
      <AppIcon alt="LANIS" className="mb-6 h-12 w-12 rounded-xl" />
      {!data ? <><h1 className="page-title">{error ? 'Verbindung nicht verfügbar' : 'Agent verbinden'}</h1>{error ? <><p role="alert" className="mt-3 text-sm text-surface-500">{error}</p>{!expired && <button className="btn btn-secondary mt-5" onClick={() => setRetry(v => v + 1)}>Erneut versuchen</button>}<Link to="/settings/agents" className="btn btn-ghost mt-5">Zu den Agenten</Link></> : <p role="status" className="mt-3 text-sm text-surface-500">Laden …</p>}</> : <>
        <h1 className="page-title break-words">{data.client_name} verbinden</h1><p className="mt-2 text-sm text-surface-500">{data.username} · Schule {data.school_id}</p><p className="mt-3 break-all text-xs text-surface-600 dark:text-surface-300">Zurück zu {data.redirect_origin}</p>
        <div className="mt-6"><AccessPicker mode={mode} onMode={selectMode} scopes={scopes} onScopes={setScopes} presets={data.presets} available={data.scopes} disabled={busy || expired} /></div>
        <details className="mt-5 text-xs text-surface-500"><summary className="cursor-pointer">Verbindung prüfen</summary><p className="mt-2 break-all">Rückleitung: {data.redirect_origin}. {data.verified ? <>Anbieter von diesem LANIS-Backend bestätigt.</> : <>Der Name „{data.client_name}“ wurde bei der Registrierung angegeben. Prüfe die Rückleitungsadresse; der Name allein bestätigt den Anbieter nicht.</>}</p><Link to="/privacy-policy" target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-2">Datenschutz</Link><Link to="/terms-of-service" target="_blank" rel="noreferrer" className="mt-2 ml-4 inline-block underline underline-offset-2">Nutzungsbedingungen</Link></details>
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex gap-2"><button className="btn btn-secondary flex-1" onClick={() => decide(false)} disabled={busy || expired}>Ablehnen</button><button className="btn btn-primary flex-1" onClick={() => decide(true)} disabled={busy || expired || !scopes.length}>{busy ? 'Verbinden …' : 'Verbinden'}</button></div>
        {mode === 'custom' && !scopes.length && <p role="status" className="mt-3 text-xs text-surface-500">Mindestens eine Berechtigung wählen.</p>}
      </>}
    </section>
  </main>;
}

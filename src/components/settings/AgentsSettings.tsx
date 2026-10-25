import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';
import { normalizeBackendUrl } from '../../utils/backendConfig';
import { agentSettingsSwitchPath } from '../../utils/agentBackend';
import { ArrowPathIcon, CheckIcon, ClipboardDocumentIcon, SparklesIcon, PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { AccessMode, AccessPresets, AgentConnection, AgentsOverview, agentsAPI } from '../../services/api';
import HostedChannelSetup from '../agents/HostedChannelSetup';
import AgentSchedules from '../agents/AgentSchedules';
import AccessPicker, { accessLabels, describeAccess } from '../agents/AccessPicker';

const ProviderIcon: React.FC<{ name: string }> = ({ name }) => {
  const brand = /claude/i.test(name) ? 'claude' : /chatgpt|openai/i.test(name) ? 'openai' : /signal/i.test(name) ? 'signal' : /whatsapp/i.test(name) ? 'whatsapp' : null;
  return brand ? <img src={`/brands/${brand}.svg`} alt="" aria-hidden="true" className="h-6 w-6 shrink-0 dark:invert" /> : <SparklesIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-surface-500" />;
};

const Connection: React.FC<{ connection: AgentConnection; overview: AgentsOverview; reload: () => Promise<void>; onChanged: (id: string, changes: Partial<AgentConnection>) => void }> = ({ connection: c, overview, reload, onChanged }) => {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [scopes, setScopes] = useState(c.scopes);
  const ceiling = c.requested_scopes || c.scopes;
  const presets: AccessPresets = { restricted: overview.presets.restricted.filter(s => ceiling.includes(s)), full: overview.presets.full?.every(s => ceiling.includes(s)) ? overview.presets.full : null };
  const [mode, setMode] = useState<AccessMode>(() => describeAccess(c.scopes, presets));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectMode = (next: AccessMode) => { setMode(next); if (next !== 'custom') setScopes(presets[next] || []); };
  const save = async (revoke = false) => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      if (revoke) await agentsAPI.revoke(token, c.id);
      else await agentsAPI.update(token, c.id, name, scopes, mode);
      onChanged(c.id, revoke ? { revoked: true } : { name: name.trim(), scopes });
      setEditing(false); setConfirm(false);
      await reload();
    } catch { setError('Nicht gespeichert. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <article className="py-5 first:pt-0 last:pb-0">
    <div className="flex items-center gap-3">
      <ProviderIcon name={c.client_name} />
      <div className="min-w-0 flex-1"><h3 className="item-title break-words">{c.name}</h3><p className="mt-0.5 text-xs text-surface-500">{accessLabels[describeAccess(c.scopes, presets)]}{c.last_used_at ? ` · ${new Date(c.last_used_at * 1000).toLocaleDateString('de-DE')}` : ''}</p></div>
      <button className="btn btn-ghost shrink-0" aria-expanded={editing} onClick={() => { setEditing(!editing); setName(c.name); setScopes(c.scopes); setMode(describeAccess(c.scopes, presets)); }}>{editing ? 'Schließen' : 'Verwalten'}</button>
    </div>
    {editing && <div className="mt-5 space-y-5 sm:ml-8">
      <label className="block"><span className="label">Name</span><input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={100} disabled={busy} /></label>
      <AccessPicker mode={mode} onMode={selectMode} scopes={scopes} onScopes={setScopes} presets={presets} available={ceiling.map(id => ({ id, ...overview.scopes[id] }))} disabled={busy} />
      <p className="break-all text-xs text-surface-500">{c.redirect_origin}</p>
      <div className="flex flex-wrap items-center gap-2"><button className="btn btn-primary" disabled={busy || !name.trim() || !scopes.length} onClick={() => save()}>{busy ? 'Speichern …' : 'Speichern'}</button><button className="btn btn-ghost text-red-600 dark:text-red-400" disabled={busy} onClick={() => setConfirm(true)}>Verbindung trennen</button></div>
      {confirm && <div className="space-y-3 rounded-xl border border-red-200 p-4 dark:border-red-900"><p className="text-sm">Zugriff für {c.name} beenden?</p><div className="flex gap-2"><button className="btn btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>Abbrechen</button><button className="btn bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={() => save(true)}>Trennen</button></div></div>}
      {c.channel && <AgentSchedules id={c.id} />}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>}
  </article>;
};

export default function AgentsSettings() {
  const { token, isAuthenticated, user } = useAuth();
  const account = user ? `${user.school_id}:${user.username}` : null;
  const tokenRef = useRef(token);
  useLayoutEffect(() => { tokenRef.current = token; }, [token]);
  const [params] = useSearchParams();
  let issuer = API_BASE_URL;
  let invalidIssuer = false;
  try { if (params.has('issuer')) issuer = normalizeBackendUrl(params.get('issuer') || ''); }
  catch { invalidIssuer = true; }
  const backendMismatch = issuer !== API_BASE_URL;
  const [data, setData] = useState<AgentsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(false);
  const [provider, setProvider] = useState('Claude');
  const [copied, setCopied] = useState(false);
  const requestVersion = useRef(0);
  const owner = useRef(account);
  useLayoutEffect(() => { owner.current = account; }, [account]);
  const applyChange = (id: string, changes: Partial<AgentConnection>) => {
    if (owner.current !== account) return;
    requestVersion.current++;
    setData(current => current ? { ...current, connections: current.connections.map(c => c.id === id ? { ...c, ...changes } : c) } : current);
  };
  const load = async () => {
    const currentToken = tokenRef.current;
    if (!isAuthenticated || !currentToken || invalidIssuer || backendMismatch) return;
    const version = ++requestVersion.current;
    setError('');
    try { const result = await agentsAPI.list(currentToken); if (version === requestVersion.current) setData(result); }
    catch { if (version === requestVersion.current) setError('Agenten konnten nicht geladen werden.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  };
  useEffect(() => { setData(null); setLoading(true); void load(); return () => { requestVersion.current++; }; }, [isAuthenticated, account, invalidIssuer, backendMismatch]);
  const copy = async () => {
    if (!data) return;
    try { await navigator.clipboard.writeText(data.mcp_url); setCopied(true); }
    catch { setError('Bitte die Adresse manuell kopieren.'); }
  };
  const active = data?.connections.filter(c => !c.revoked) || [];
  if (invalidIssuer || backendMismatch) return <section className="card max-w-md"><h2 className="section-title">{invalidIssuer ? 'Ungültiger Link' : 'Anderes Backend'}</h2>{!invalidIssuer && <><p className="mt-3 break-all text-sm text-surface-500">{issuer}</p><Link className="btn btn-primary mt-4" to={agentSettingsSwitchPath(issuer)}>Backend prüfen</Link></>}</section>;
  return <div className="space-y-6">
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="item-title">Agent verbinden</h2><button className="btn btn-secondary" aria-expanded={setup} onClick={() => setSetup(!setup)}>{setup ? <XMarkIcon className="mr-1.5 h-4 w-4" /> : <PlusIcon className="mr-1.5 h-4 w-4" />}{setup ? 'Schließen' : 'Hinzufügen'}</button></div>
      {setup && <div className="mt-5 space-y-5" aria-label="Agent verbinden">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Agent auswählen">{['ChatGPT', 'Claude', 'Signal', 'WhatsApp', 'Andere'].map(p => <button key={p} onClick={() => { setProvider(p); setCopied(false); }} aria-pressed={provider === p} className={`flex min-w-0 flex-col items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors ${provider === p ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/15 dark:bg-primary-950/40' : 'border-surface-200 bg-white hover:border-primary-300 dark:border-surface-800 dark:bg-surface-900'}`}><ProviderIcon name={p} />{p}</button>)}</div>
        {(provider === 'Signal' || provider === 'WhatsApp') && data ? <HostedChannelSetup key={provider} channel={provider === 'Signal' ? 'signal' : 'whatsapp'} overview={data} onPaired={() => { setSetup(false); void load(); }} /> : provider === 'ChatGPT' ? <p role="status" className="text-sm text-surface-500">Coming Soon</p> : <>
          {provider === 'Claude' ? <a href="https://claude.ai/customize/connectors?modal=add-custom-connector" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Connector in Claude hinzufügen<ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" /></a> : <p className="text-sm text-surface-500">Füge diese Adresse als Remote-MCP-Server hinzu.</p>}
          <div><label className="label" htmlFor="mcp-url">MCP-Adresse</label><div className="flex gap-2"><input id="mcp-url" className="input min-w-0 font-mono text-xs" readOnly value={data?.mcp_url || ''} placeholder="MCP-Adresse" /><button className="btn btn-secondary shrink-0" disabled={!data} onClick={copy} aria-label="MCP-Adresse kopieren">{copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}</button></div></div>
          <p role="status" className="text-xs text-surface-500">{copied ? 'Kopiert.' : window.location.pathname.startsWith('/demo') ? 'Demo-Adresse. Echte Agenten verbindest du nach der Anmeldung.' : 'Adresse eintragen, dann bei LANIS anmelden und Zugriff wählen.'}</p>
        </>}
      </div>}
    </section>
    <button className="btn btn-ghost" onClick={load} disabled={loading}>Verbindungen aktualisieren</button>
    {error && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-600 dark:text-red-400">{error}<button onClick={load} className="btn btn-ghost" aria-label="Erneut versuchen"><ArrowPathIcon className="h-4 w-4" /></button></div>}
    {loading ? <p role="status" className="text-sm text-surface-500">Laden …</p> : data && <section className="card" aria-labelledby="connections-heading"><h2 id="connections-heading" className="item-title mb-5">Verbindungen{` (${active.length})`}</h2>{active.length ? <div className="divide-y divide-surface-100 dark:divide-surface-800">{active.map(c => <Connection key={c.id} connection={c} overview={data} reload={load} onChanged={applyChange} />)}</div> : <p className="text-sm text-surface-500">Noch keine Agenten verbunden.</p>}</section>}
  </div>;
}

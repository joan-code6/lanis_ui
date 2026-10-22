import React, { useEffect, useState } from 'react';
import { ArrowPathIcon, ArrowUpRightIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentIcon, LinkIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { AgentConnection, AgentsOverview, agentsAPI } from '../../services/api';

export const agentPanel = 'card';
export const agentButton = 'btn btn-primary gap-2 disabled:cursor-not-allowed disabled:opacity-50';
const field = 'input';

export const AgentMark: React.FC<{ name: string; large?: boolean }> = ({ name, large }) => (
  <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${large ? 'h-16 w-16' : 'h-12 w-12'} bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300`}>
    {name.toLowerCase().includes('claude') ? <span className={large ? 'text-4xl' : 'text-3xl'} aria-hidden="true">✳</span> : <SparklesIcon className={large ? 'h-8 w-8' : 'h-6 w-6'} />}
  </span>
);
const date = (value: number) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(value * 1000);

const ConnectionCard: React.FC<{ connection: AgentConnection; overview: AgentsOverview; reload: () => Promise<void> }> = ({ connection: c, overview, reload }) => {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [scopes, setScopes] = useState(c.scopes);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (revoke: boolean) => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      if (revoke) await agentsAPI.revoke(token, c.id);
      else await agentsAPI.update(token, c.id, name, scopes);
      await reload(); setEditing(false); setConfirm(false);
    } catch { setError('Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <article className={`${agentPanel}`}>
    <div className="flex items-start gap-4"><AgentMark name={c.client_name} /><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="item-title break-words">{c.name}</h3><span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">Verbunden</span></div>
      <p className="mt-1 break-all text-sm text-surface-500">{c.redirect_origin}</p>
      <p className="mt-2 text-xs text-surface-500">{c.last_used_at ? `Zuletzt genutzt: ${date(c.last_used_at)}` : 'Noch nicht genutzt'} · Seit {new Date(c.created_at * 1000).toLocaleDateString('de-DE')}</p>
    </div></div>
    <div className="mt-5 flex flex-wrap gap-2">{c.scopes.map(s => <span key={s} className="rounded-lg bg-surface-100 px-3 py-1.5 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300">{overview.scopes[s]?.title || s}</span>)}</div>
    {editing && <div className="mt-5 space-y-4 border-t border-surface-100 pt-5 dark:border-surface-800">
      <label className="block text-sm font-medium">Name der Verbindung<input value={name} onChange={e => setName(e.target.value)} maxLength={100} className={`${field} mt-2`} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Berechtigungen</legend>{c.scopes.map(s => <label key={s} className="flex cursor-pointer items-start gap-3 py-2 text-sm"><input type="checkbox" checked={scopes.includes(s)} onChange={e => setScopes(e.target.checked ? [...scopes, s] : scopes.filter(v => v !== s))} className="mt-0.5 h-4 w-4 accent-primary-600" /><span>{overview.scopes[s]?.title || s}</span></label>)}</fieldset>
      <p className="text-xs text-surface-500">Für zusätzliche Berechtigungen verbindest du den Agenten erneut und bestätigst den Zugriff.</p>
      <button onClick={() => act(false)} disabled={busy || !name.trim() || !scopes.length} className={agentButton}>{busy ? 'Wird gespeichert …' : 'Änderungen speichern'}</button>
    </div>}
    {confirm ? <div className="mt-5 rounded-2xl bg-red-50 p-4 dark:bg-red-950/30"><p className="text-sm">Verbindung zu <strong>{c.name}</strong> trennen? Dieser Agent verliert sofort den Zugriff auf LANIS.</p><div className="mt-3 flex gap-4"><button disabled={busy} onClick={() => act(true)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Wird getrennt …' : 'Verbindung trennen'}</button><button disabled={busy} onClick={() => setConfirm(false)} className="text-sm">Abbrechen</button></div></div> : <div className="mt-5 flex flex-wrap gap-5 border-t border-surface-100 pt-4 dark:border-surface-800"><button onClick={() => { setEditing(!editing); setName(c.name); setScopes(c.scopes); }} className="text-sm font-medium text-primary-600 dark:text-primary-400">{editing ? 'Bearbeitung schließen' : 'Verbindung verwalten'}</button><button onClick={() => setConfirm(true)} className="text-sm text-surface-500 hover:text-red-600">Trennen</button></div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
  </article>;
};

const AgentsSettings: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<AgentsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('ChatGPT');
  const [setup, setSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const load = async () => {
    if (!token) return;
    setError('');
    try { setData(await agentsAPI.list(token)); }
    catch { setError('Deine Agenten konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token]);
  const copy = async () => {
    if (!data) return;
    try { await navigator.clipboard.writeText(data.mcp_url); setCopied(true); }
    catch { setError('Kopieren ist in diesem Browser nicht möglich. Markiere und kopiere die Adresse im Feld.'); }
  };
  const active = data?.connections.filter(c => !c.revoked) || [];
  return <div className="space-y-7">
    <section className={`${agentPanel} !p-0 overflow-hidden`}>
      <div className="grid gap-7 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
        <div><div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400"><LinkIcon className="h-4 w-4" /> Dein LANIS. In deinem Agenten.</div><h2 className="max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">Dein Schultag, ein Gespräch entfernt.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-500 dark:text-surface-400">Verbinde ChatGPT, Claude oder einen anderen Agenten mit deinem Schulportal. Du entscheidest, welche Daten jeder Agent lesen darf.</p><button onClick={() => setSetup(!setup)} aria-expanded={setup} className={`${agentButton} mt-6`}>{setup ? 'Anleitung schließen' : 'Agent verbinden'}<ChevronDownIcon className={`h-4 w-4 transition ${setup ? 'rotate-180' : ''}`} /></button></div>
        <div aria-hidden="true" className="hidden items-center gap-3 md:flex"><AgentMark name="ChatGPT" /><span className="h-px w-6 bg-surface-300 dark:bg-surface-600" /><span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-600 text-lg font-bold tracking-tight text-white shadow-soft-md">LANIS</span><span className="h-px w-6 bg-surface-300 dark:bg-surface-600" /><AgentMark name="Claude" /></div>
      </div>
      <div className="flex items-start gap-3 border-t border-surface-100 bg-surface-50 px-6 py-4 text-xs leading-relaxed text-surface-500 dark:border-surface-800 dark:bg-surface-950/40 sm:px-8"><ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary-600" /><p>Jede Verbindung hat eigene Berechtigungen. Dein Schulportal-Passwort bleibt bei LANIS. Du kannst den Zugriff jederzeit beenden.</p></div>
    </section>
    {setup && <section className={`${agentPanel} p-6 sm:p-8`} aria-label="Agent verbinden">
      {window.location.pathname.startsWith('/demo') && <p className="mb-4 rounded-xl bg-primary-50 p-3 text-sm text-primary-700 dark:bg-primary-950 dark:text-primary-300">Demo: Diese Adresse ist ein Beispiel. Echte Agenten verbindest du nach der Anmeldung in deinem LANIS-Konto.</p>}
      <h3 className="section-title">Wo möchtest du LANIS nutzen?</h3><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Agent auswählen">{['ChatGPT', 'Claude', 'Anderer Agent'].map(p => <button key={p} aria-pressed={provider === p} onClick={() => setProvider(p)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${provider === p ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'border-surface-200 dark:border-surface-700'}`}>{p}</button>)}</div>
      <ol className="mt-6 space-y-5">{[
        provider === 'ChatGPT' ? 'Öffne in ChatGPT die Plugin-Einstellungen und füge LANIS als benutzerdefiniertes MCP-Plugin hinzu. Die Verfügbarkeit hängt von deinem Konto und Workspace ab.' : provider === 'Claude' ? 'Öffne in Claude Einstellungen → Connectors und füge einen benutzerdefinierten Connector hinzu.' : 'Füge in deinem Agenten einen Remote-MCP-Server hinzu. Wähle OAuth als Anmeldung.',
        'Trage die LANIS-Adresse unten ein. Starte die Verbindung in deinem Agenten.',
        'Melde dich bei LANIS an, prüfe die angefragten Berechtigungen und bestätige den Zugriff. Kehre danach zu deinem Agenten zurück.',
      ].map((s, i) => <li key={s} className="flex gap-3 text-sm leading-relaxed text-surface-600 dark:text-surface-300"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold dark:bg-surface-800">{i + 1}</span>{s}</li>)}</ol>
      <label className="mt-6 block text-xs font-semibold text-surface-500" htmlFor="mcp-url">LANIS MCP-Adresse</label><div className="mt-2 flex gap-2"><input id="mcp-url" readOnly value={data?.mcp_url || ''} placeholder="Adresse wird geladen …" className={`${field} min-w-0 font-mono text-xs`} /><button disabled={!data} onClick={copy} className="shrink-0 rounded-xl border border-surface-200 px-4 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800" aria-label="MCP-Adresse kopieren">{copied ? <CheckIcon className="h-5 w-5 text-primary-600" /> : <ClipboardDocumentIcon className="h-5 w-5" />}</button></div><p role="status" className="mt-2 text-xs text-primary-600">{copied ? 'Adresse kopiert.' : 'OAuth wird automatisch erkannt. Du brauchst keinen API-Schlüssel.'}</p>
      <a href={provider === 'Claude' ? 'https://claude.ai/settings/connectors' : provider === 'ChatGPT' ? 'https://chatgpt.com/' : 'https://modelcontextprotocol.io/docs/learn/client-concepts'} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">{provider === 'Anderer Agent' ? 'Mehr über MCP' : `${provider} öffnen`}<ArrowUpRightIcon className="h-4 w-4" /></a>
    </section>}
    <section aria-labelledby="connections-heading"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><h2 id="connections-heading" className="section-title">Verbundene Agenten</h2>{data && <span className="rounded-full bg-surface-200 px-2 py-0.5 text-xs dark:bg-surface-800">{active.length}</span>}</div><button onClick={load} aria-label="Verbindungen aktualisieren" className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"><ArrowPathIcon className="h-5 w-5" /></button></div>
      {error && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}<button onClick={load} className="ml-2 underline">Erneut versuchen</button></div>}
      {loading ? <div role="status" className={`${agentPanel} p-8 text-sm text-surface-500`}>Verbindungen werden geladen …</div> : data && active.length === 0 ? <div className={`${agentPanel} px-6 py-10 text-center`}><LinkIcon className="mx-auto h-8 w-8 text-surface-400" /><h3 className="empty-state-title mt-4">Hier beginnt deine erste Verbindung.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-surface-500">Verbinde einen Agenten, um nach Hausaufgaben zu fragen oder deinen nächsten Schultag zu planen.</p><button onClick={() => setSetup(true)} className="mt-5 text-sm font-semibold text-primary-600 dark:text-primary-400">Ersten Agenten verbinden →</button></div> : <div className="grid gap-4 xl:grid-cols-2">{data && active.map(c => <ConnectionCard key={c.id} connection={c} overview={data} reload={load} />)}</div>}
    </section>
    <div className="grid gap-4 sm:grid-cols-2"><div className={`${agentPanel}`}><h3 className="item-title">Ein Konto, mehrere Agenten</h3><p className="mt-2 text-sm leading-relaxed text-surface-500">Nutze verschiedene Agenten parallel. Gib ihnen eigene Namen und nur die Berechtigungen, die sie brauchen.</p></div><div className={`${agentPanel}`}><h3 className="item-title">Du behältst die Kontrolle</h3><p className="mt-2 text-sm leading-relaxed text-surface-500">Agenten können aktuell Daten lesen. Nachrichten versenden, Aufgaben ändern oder Dateien hochladen ist über diese Verbindung nicht möglich.</p></div></div>
  </div>;
};
export default AgentsSettings;

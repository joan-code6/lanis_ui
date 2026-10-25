import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { AccessMode, AgentsOverview, agentsAPI } from '../../services/api';
import AccessPicker from './AccessPicker';

type Pairing = { message: string; number: string; expires_at: number };

export default function HostedChannelSetup({ channel, overview, onPaired }: { channel: 'signal' | 'whatsapp'; overview: AgentsOverview; onPaired: () => void }) {
  const { token } = useAuth();
  const [mode, setMode] = useState<AccessMode>('restricted');
  const [scopes, setScopes] = useState(overview.presets.restricted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const label = channel === 'signal' ? 'Signal' : 'WhatsApp';
  const number = pairing?.number || '';
  const validNumber = /^\+?[1-9]\d{6,14}$/.test(number);
  const chatUrl = pairing && validNumber ? channel === 'whatsapp'
    ? `https://wa.me/${number.replace(/^\+/, '')}?text=${encodeURIComponent(pairing.message)}`
    : `https://signal.me/#p/+${number.replace(/^\+/, '')}` : null;
  useEffect(() => {
    setExpired(false);
    if (!pairing) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, pairing.expires_at * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pairing]);
  useEffect(() => {
    if (!pairing || expired || !token || !chatUrl) return;
    let active = true;
    let checking = false;
    const existing = new Set(overview.connections.map(connection => connection.id));
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const latest = await agentsAPI.list(token);
        if (active && latest.connections.some(connection => connection.channel === channel && !connection.revoked && !existing.has(connection.id))) onPaired();
      } catch { /* Keep the pairing controls available during connection failures. */ }
      finally { checking = false; }
    };
    const timer = window.setInterval(() => void check(), 3000);
    window.addEventListener('focus', check);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', check); };
  }, [pairing, expired, token, chatUrl, channel]);
  const reset = () => { setPairing(null); setCopied(false); setError(''); };
  const copy = async () => {
    if (!pairing) return;
    try { await navigator.clipboard.writeText(pairing.message); setCopied(true); }
    catch { setError('Bitte den Code manuell kopieren.'); }
  };
  return <div className="space-y-5">
    <AccessPicker mode={mode} onMode={next => { setMode(next); reset(); if (next !== 'custom') setScopes(overview.presets[next] || []); }} scopes={scopes} onScopes={next => { setScopes(next); reset(); }} presets={overview.presets} available={Object.entries(overview.scopes).map(([id, scope]) => ({ id, ...scope }))} disabled={busy} />
    <p className="text-xs text-surface-500">Freigegebene Daten werden vom KI-Dienst verarbeitet. <Link className="underline underline-offset-2" to="/privacy-policy" target="_blank" rel="noopener noreferrer">Datenschutz</Link></p>
    {!overview.channels?.[channel] ? <p role="status" className="text-sm text-surface-500">{label} ist noch nicht eingerichtet.</p> : <>
      {(!pairing || expired) ? <button className="btn btn-primary" disabled={busy || !scopes.length || !token} onClick={async () => {
        if (!token) return;
        setBusy(true); setError(''); setCopied(false);
        try { setPairing(await agentsAPI.pairChannel(token, channel, label, scopes, mode)); }
        catch { setError('Verbindung konnte nicht gestartet werden. Bitte erneut versuchen.'); }
        finally { setBusy(false); }
      }}><img src={`/brands/${channel}.svg`} alt="" aria-hidden="true" className="mr-2 h-5 w-5 invert" />{busy ? 'Verbinden …' : expired ? 'Neuen Code erstellen' : `Mit ${label} verbinden`}</button> : <div className="space-y-3">
        {chatUrl && <a className="btn btn-primary" href={chatUrl} target="_blank" rel="noopener noreferrer" onClick={() => { if (channel === 'signal') void copy(); }}><img src={`/brands/${channel}.svg`} alt="" aria-hidden="true" className="mr-2 h-5 w-5 invert" />{label} öffnen<ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" /></a>}
        <p className="text-sm text-surface-500">{chatUrl ? channel === 'signal' ? 'Code einfügen und senden.' : 'Nachricht im Chat senden.' : 'Demo: Es wird kein echter Chat geöffnet.'}</p>
        <div className="flex items-center gap-2"><code className="break-all text-sm">{pairing.message}</code><button className="btn btn-ghost shrink-0" onClick={copy} aria-label="Verbindungscode kopieren">{copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}</button><span role="status" className="text-xs text-surface-500">{copied ? 'Kopiert' : ''}</span></div>
      </div>}
      {expired && <p role="status" className="text-xs text-surface-500">Code abgelaufen.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

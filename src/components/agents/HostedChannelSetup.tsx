import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AccessMode, AgentsOverview, agentsAPI } from '../../services/api';
import AccessPicker from './AccessPicker';

export default function HostedChannelSetup({ channel, overview }: { channel: 'signal' | 'whatsapp'; overview: AgentsOverview }) {
  const { token } = useAuth();
  const [mode, setMode] = useState<AccessMode>('restricted');
  const [scopes, setScopes] = useState(overview.presets.restricted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pairing, setPairing] = useState<{ message: string; number: string; expires_at: number } | null>(null);
  const label = channel === 'signal' ? 'Signal' : 'WhatsApp';
  return <div className="space-y-5">
    <p className="text-sm text-surface-500">Dein Assistent läuft auf dem LANIS-Backend. Anfragen und freigegebene Schuldaten werden vom zentral eingerichteten KI-Dienst verarbeitet. Der verschlüsselte Chatverlauf wird nach 24 Stunden gelöscht. Geplante Aufgaben bleiben bis zum Löschen oder Trennen gespeichert.</p>
    <AccessPicker mode={mode} onMode={next => { setMode(next); setPairing(null); if (next !== 'custom') setScopes(overview.presets[next] || []); }} scopes={scopes} onScopes={next => { setScopes(next); setPairing(null); }} presets={overview.presets} available={Object.entries(overview.scopes).map(([id, scope]) => ({ id, ...scope }))} disabled={busy} />
    <p className="text-sm text-surface-500">Du kannst im Chat Aufgaben planen, zum Beispiel „Erinnere mich werktags um 7 Uhr an meine Hausaufgaben“. Geplante Aufgaben lesen Daten mit deinen aktuellen Berechtigungen. STOP trennt die Verbindung und löscht die Aufgaben.{channel === 'whatsapp' && ' WhatsApp kann geplante Antworten nur innerhalb von 24 Stunden nach deiner letzten Nachricht zustellen.'}</p>
    {!overview.channels?.[channel] ? <p role="status" className="text-sm text-surface-500">{label} ist auf diesem Backend noch nicht eingerichtet.</p> : <button className="btn btn-primary" disabled={busy || !scopes.length || !token} onClick={async () => {
      if (!token) return;
      setBusy(true); setError('');
      try { setPairing(await agentsAPI.pairChannel(token, channel, label, scopes, mode)); }
      catch { setError('Verbindungscode konnte nicht erstellt werden. Bitte erneut versuchen.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Code wird erstellt …' : 'Zugriff freigeben und Code erstellen'}</button>}
    {pairing && <div className="space-y-3 rounded-xl border border-surface-200 p-4 dark:border-surface-800"><p className="text-sm">Sende diese Nachricht in {label} an <strong>{pairing.number}</strong>:</p><p className="break-all font-mono text-lg">{pairing.message}</p><p className="text-xs text-surface-500">Gültig bis {new Date(pairing.expires_at * 1000).toLocaleTimeString('de-DE')}. Danach „Verbindungen aktualisieren“ wählen.</p></div>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

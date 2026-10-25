import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { agentsAPI, HostedSchedule } from '../../services/api';

const statuses: Record<string, string> = { delivered: 'Zugestellt', failed: 'Fehlgeschlagen', busy: 'Anfrage lief bereits', revoked: 'Verbindung getrennt', delivery_window_closed: 'WhatsApp: letzte Nachricht liegt über 24 Stunden zurück' };

export default function AgentSchedules({ id }: { id: string }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<HostedSchedule[] | null>(null);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [cron, setCron] = useState('0 7 * * 1-5');
  const [busy, setBusy] = useState(false);
  const load = async () => { if (token) setRows((await agentsAPI.schedules(token, id)).schedules); };
  useEffect(() => { let active = true; if (token) agentsAPI.schedules(token, id).then(data => { if (active) setRows(data.schedules); }).catch(() => { if (active) setError('Aufgaben konnten nicht geladen werden.'); }); return () => { active = false; }; }, [token, id]);
  return <div className="space-y-3">
    <h4 className="item-title">Geplante Aufgaben</h4>
    <p className="text-xs text-surface-500">Zeitzone: Europe/Berlin. Aufgaben kannst du auch im Chat erstellen und löschen.</p>
    {rows === null ? <p role="status" className="text-sm text-surface-500">Laden …</p> : rows.length ? rows.map(row => <div key={row.id} className="flex items-start justify-between gap-3 border-b border-surface-100 py-3 dark:border-surface-800"><div className="min-w-0"><p className="break-words text-sm">{row.prompt}</p><p className="mt-1 text-xs text-surface-500">{row.enabled ? new Date(row.next_run * 1000).toLocaleString('de-DE') : 'Beendet'}{row.cron ? ` · ${row.cron}` : ''}{row.last_status ? ` · ${statuses[row.last_status] || row.last_status}` : ''}</p></div><button className="btn btn-ghost shrink-0" disabled={busy} onClick={async () => { if (!token) return; setBusy(true); try { await agentsAPI.deleteSchedule(token, id, row.id); await load(); } catch { setError('Aufgabe konnte nicht gelöscht werden.'); } finally { setBusy(false); } }}>Löschen</button></div>) : <p className="text-sm text-surface-500">Keine geplanten Aufgaben.</p>}
    <label className="block"><span className="label">Aufgabe</span><textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={4000} placeholder="Meine Hausaufgaben für heute zusammenfassen" /></label>
    <label className="block"><span className="label">Zeitplan (Cron)</span><input className="input font-mono" value={cron} onChange={e => setCron(e.target.value)} maxLength={100} /><span className="text-xs text-surface-500">Minute, Stunde, Tag, Monat, Wochentag. Beispiel: 0 7 * * 1-5 = Mo–Fr um 7 Uhr.</span></label>
    <button className="btn btn-secondary" disabled={busy || !prompt.trim() || !cron.trim()} onClick={async () => { if (!token) return; setBusy(true); setError(''); try { await agentsAPI.createSchedule(token, id, { prompt, cron, timezone: 'Europe/Berlin' }); setPrompt(''); await load(); } catch { setError('Aufgabe nicht gespeichert. Prüfe den Zeitplan (mindestens 5 Minuten Abstand).'); } finally { setBusy(false); } }}>Aufgabe planen</button>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { agentsAPI, HostedSchedule } from '../../services/api';

const statuses: Record<string, string> = {
  delivered: 'Zuletzt gesendet',
  failed: 'Hat zuletzt nicht geklappt',
  busy: 'Letztes Mal übersprungen',
  revoked: 'Verbindung getrennt',
  delivery_window_closed: 'Schreibe kurz im WhatsApp-Chat, um wieder Erinnerungen zu erhalten.',
};

function nextTime(task: HostedSchedule) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  };
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat('de-DE', { ...options, timeZone: task.timezone || 'Europe/Berlin' }); }
  catch { formatter = new Intl.DateTimeFormat('de-DE', { ...options, timeZone: 'Europe/Berlin' }); }
  return formatter.format(new Date(task.next_run * 1000));
}

export default function AgentSchedules({ id }: { id: string }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<HostedSchedule[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setRows(null); setError('');
    if (token) agentsAPI.schedules(token, id)
      .then(data => { if (active) setRows(data.schedules); })
      .catch(() => { if (active) setError('Aufgaben konnten nicht geladen werden.'); });
    return () => { active = false; };
  }, [token, id]);
  const remove = async (task: HostedSchedule) => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      await agentsAPI.deleteSchedule(token, id, task.id);
      setRows(current => current?.filter(row => row.id !== task.id) ?? null);
    } catch { setError('Aufgabe konnte nicht beendet werden. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <h4 className="item-title">Geplante Aufgaben</h4>
    <p className="text-sm text-surface-500">Sag im Chat: „Erinnere mich morgen um 7 Uhr an meine Hausaufgaben.“</p>
    {rows === null ? !error && <p role="status" className="text-sm text-surface-500">Laden …</p> : rows.length ? rows.map(row => <div key={row.id} className="flex items-start justify-between gap-3 border-b border-surface-100 py-3 dark:border-surface-800">
      <div className="min-w-0">
        <p className="break-words text-sm">{row.prompt}</p>
        <p className="mt-1 text-xs text-surface-500">{row.enabled ? `Nächstes Mal: ${nextTime(row)} Uhr` : 'Beendet'}</p>
        {row.last_status && <p className="mt-1 text-xs text-surface-500">{statuses[row.last_status] || 'Noch keine Rückmeldung'}</p>}
      </div>
      <button className="btn btn-ghost shrink-0" disabled={busy} onClick={() => void remove(row)} aria-label={`${row.enabled ? 'Aufgabe beenden' : 'Aufgabe entfernen'}: ${row.prompt}`}>{row.enabled ? 'Beenden' : 'Entfernen'}</button>
    </div>) : <p className="text-sm text-surface-500">Noch nichts geplant.</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

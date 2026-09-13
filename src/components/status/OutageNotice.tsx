import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimestamp, usePublicStatus } from '../../services/publicStatus';
import { cacheStatusAPI } from '../../services/api';

export default function OutageNotice() {
  const { token } = useAuth();
  const { status } = usePublicStatus(!!token);
  const [snapshot, setSnapshot] = useState<{ token: string; timestamp: string | null; count: number } | null>(null);
  const outage = status === 'down' || status === 'degraded';
  useEffect(() => {
    if (!outage || !token) { setSnapshot(null); return; }
    let active = true;
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 8000);
      try {
        const value = await cacheStatusAPI.get(token, request.signal);
        if (active && controller === request) setSnapshot({
          token,
          timestamp: value.available ? value.last_successful_fetch_at : null,
          count: value.available ? value.snapshot_count : 0,
        });
      } catch {
        if (active && controller === request) setSnapshot(null);
      } finally { window.clearTimeout(timeout); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); };
  }, [outage, token]);
  if (!outage) return null;
  const current = snapshot?.token === token ? snapshot : null;
  return <aside role="status" className="mx-4 mb-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 sm:mx-6">
    <p className="font-semibold">{status === 'down' ? 'Das Schulportal ist aktuell nicht erreichbar.' : 'Das Schulportal ist aktuell eingeschränkt erreichbar.'}</p>
    <p className="mt-1">LANIS ist erreichbar. {current && current.count > 0 ? 'Du kannst bereits gespeicherte Inhalte weiterhin ansehen.' : 'Bereits gespeicherte Inhalte können weiterhin verfügbar sein. Neue Daten lassen sich möglicherweise nicht laden.'}</p>
    {current && current.count > 0 && current.timestamp && Number.isFinite(Date.parse(current.timestamp)) && <p className="mt-1">Letzter erfolgreicher Abruf: {formatTimestamp(current.timestamp)}</p>}
    <Link to="/status" className="mt-2 inline-block rounded font-medium underline underline-offset-2">Status ansehen →</Link>
  </aside>;
}

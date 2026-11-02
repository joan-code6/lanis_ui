import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../utils/backendConfig';
import { PublicIncident, formatIncidentRange, formatTimestamp, statusLabels } from '../../services/publicStatus';
export default function IncidentPage() {
 const { id } = useParams();
 const [data, setData] = useState<PublicIncident | null>(null);
 const [error, setError] = useState(false);
 useEffect(() => { const controller = new AbortController(); setData(null); setError(false);
 fetch(`${getApiBaseUrl()}/status/incident/${encodeURIComponent(id || '')}`, {signal: controller.signal, credentials: 'omit'})
 .then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setData).catch(() => { if (!controller.signal.aborted) setError(true); });
 return () => controller.abort(); }, [id]);
 return <main className="mx-auto max-w-3xl px-6 py-16"><Link to="/status">← Status</Link><h1 className="mt-8 text-3xl font-semibold">Störungsdetails</h1><p className="mt-4 break-all">{id}</p>{error ? <p>Störung nicht gefunden oder derzeit nicht verfügbar.</p> : !data ? <p>Wird geladen…</p> : <><p className="mt-6">{formatIncidentRange(data)} · {statusLabels[data.status]}</p><p className="mt-4">Bestätigte Checks: {data.checks} · Dauer: {data.duration_seconds === null ? "Noch aktiv" : `${Math.round(data.duration_seconds / 60)} Minuten`}</p><h2 className="mt-8 text-xl">Ergebnisse der Prüfung</h2><ul>{(data.observations?.[data.observations.length - 1]?.features || []).map(f => <li className="mt-3" key={f.name}>{f.name === 'login' ? 'Anmeldung' : 'Module'}: {statusLabels[f.status]}</li>)}</ul><h2 className="mt-8 text-xl">Verlauf</h2><ul>{data.observations?.map(o => <li key={o.checked_at}>{formatTimestamp(o.checked_at)} · {statusLabels[o.status]}</li>)}</ul><p className="mt-8">Diese Beobachtung fasst beobachtete Beeinträchtigungen zusammen. Messlücken bestätigen keine durchgehende Ausfallzeit und gilt nicht für alle Schulen oder Konten.</p></>}</main>;
}

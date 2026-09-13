import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import SEO from '../seo/SEO';
import { formatPercent, formatTimestamp, statusColors, statusLabels, usePublicStatus } from '../../services/publicStatus';
import { getCustomBackendUrl } from '../../utils/backendConfig';

export default function StatusPage() {
  const { data, loading, error, status, refresh } = usePublicStatus();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selected = data?.daily.find(day => day.day === selectedDay);
  const customBackend = getCustomBackendUrl();
  return (
    <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950">
      <SEO title="Status – LANIS & Schulportal Hessen" description="Öffentliche Erreichbarkeit des Schulportals Hessen: aktuelle Messungen, Verlauf und transparente Verfügbarkeit." path="/status" />
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        <nav aria-label="Status-Navigation" className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-semibold"><AppIcon alt="" className="h-7 w-7 rounded-lg" />Lanis <span className="ml-2 border-l pl-4 text-sm font-normal text-surface-500">Status</span></Link>
          <Link to="/dashboard" className="btn btn-secondary text-sm">Zur App →</Link>
        </nav>
        <main className="pb-16 pt-16 sm:pt-24">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Ein offener Blick auf die Erreichbarkeit</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Wie läuft’s,<br />Schulportal?</h1>
          <p className="mt-5 max-w-xl leading-relaxed text-surface-600 dark:text-surface-400">Hier siehst du, ob das Schulportal erreichbar ist – und was unsere regelmäßigen Prüfungen in den letzten 90 Tagen ergeben haben.</p>
          {customBackend && <p className="mt-4 break-all text-sm text-surface-500">Messungen deines eigenen Backends: {customBackend}</p>}
          <section aria-label="Aktueller Status" className="mt-10 overflow-hidden rounded-2xl border bg-white shadow-soft dark:bg-surface-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 text-sm sm:px-7">
              <span className="text-surface-500">{loading ? 'Status wird abgerufen …' : `Letzte Schulportal-Prüfung: ${formatTimestamp(data?.current.checked_at ?? null)}`}</span>
              <button onClick={refresh} className="rounded-md font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 dark:text-primary-400">Aktualisieren</button>
            </div>
            <div className="divide-y px-5 sm:px-7">
              {[{ name: 'Schulportal Hessen', detail: 'Anmeldung und Module', state: status, label: statusLabels[status] }, { name: 'LANIS', detail: 'Von deinem Browser aus geprüft', state: data ? 'up' as const : 'unknown' as const, label: data ? 'Erreichbar' : 'Nicht bestätigt' }].map(service => (
                <div key={service.name} className="flex flex-wrap items-center justify-between gap-4 py-6">
                  <div><h2 className="font-semibold">{service.name}</h2><p className="mt-1 text-sm text-surface-500">{service.detail}</p></div>
                  <span className="flex items-center gap-2 text-sm font-medium"><span className={`h-2.5 w-2.5 rounded-full ${statusColors[service.state]}`} />{service.label}</span>
                </div>
              ))}
            </div>
          </section>
          {error && <p role="status" className="mt-4 text-sm text-surface-600 dark:text-surface-400">Die Statusdaten sind gerade nicht verfügbar. Daraus lässt sich kein Schulportal-Ausfall ableiten. Versuche es später erneut.</p>}
          {data && status === 'unknown' && <p className="mt-4 text-sm text-surface-500">Es liegt keine ausreichend aktuelle Schulportal-Messung vor.</p>}
          <section className="mt-12" aria-labelledby="history-title">
            <div className="flex flex-wrap items-end justify-between gap-5"><div><h2 id="history-title" className="text-xl font-semibold">Schulportal im Verlauf</h2><p className="mt-1 text-sm text-surface-500">Letzte 90 Tage · ein Balken pro Tag</p></div><div className="text-right"><p className="font-mono text-3xl tracking-tight">{formatPercent(data?.summary.uptime_percent ?? null)}</p><p className="mt-1 text-xs text-surface-500">erfolgreiche auswertbare Prüfungen</p></div></div>
            <div className="mt-6 flex h-16 gap-px sm:gap-[3px]" aria-label="Tägliche Messungen">
              {(data?.daily ?? Array.from({ length: 90 }, (_, index) => ({ day: String(index), status: 'unknown' as const }))).map(day => (
                <span key={day.day} aria-hidden="true" title={`${day.day}: ${statusLabels[day.status]}`} className={`min-w-0 flex-1 rounded-sm ${statusColors[day.status]} ${selectedDay === day.day ? 'ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-surface-950' : ''}`} />
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm">Tag ansehen<select aria-label="Tag im Verlauf auswählen" value={selectedDay ?? ""} onChange={event => setSelectedDay(event.target.value)} className="min-w-0 rounded-lg border bg-white px-3 py-2 dark:bg-surface-900"><option value="">Datum auswählen</option>{data?.daily.map(day => <option key={day.day} value={day.day}>{day.day}: {statusLabels[day.status]}</option>)}</select></label>
            <div className="mt-3 flex justify-between text-xs text-surface-500"><span>{data?.daily[0]?.day ?? 'Vor 90 Tagen'}</span><span>Heute</span></div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-surface-500">{Object.entries(statusLabels).map(([key, label]) => <span key={key} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${statusColors[key as keyof typeof statusColors]}`} />{label}</span>)}</div>
            {selected && <p role="status" className="mt-4 rounded-lg bg-surface-100 p-4 text-sm dark:bg-surface-900">{selected.day}: {statusLabels[selected.status]} · {formatPercent(selected.uptime_percent)} erfolgreiche Prüfungen · {formatPercent(selected.coverage_percent)} Messabdeckung</p>}
            <p className="mt-5 text-sm leading-relaxed text-surface-500">Messabdeckung: {formatPercent(data?.summary.coverage_percent ?? null)}. Zeiten ohne Messung zählen nicht als erreichbar. Die Prozentzahl beschreibt die auswertbaren Prüfungen, nicht eine lückenlos gemessene Betriebszeit.</p>
          </section>
          <section className="mt-12 border-t pt-8" aria-labelledby="incidents-title">
            <h2 id="incidents-title" className="text-xl font-semibold">Beobachtete Störungen</h2>
            <p className="mt-2 text-sm text-surface-500">Die letzten fehlgeschlagenen Prüfungen.</p>
            {!data ? <p className="mt-5 text-sm text-surface-500">Noch keine Daten verfügbar.</p> : data.incidents.length === 0 ? <p className="mt-5 text-sm">Keine Störungen in den vorhandenen Messungen.</p> : <ul className="mt-5 divide-y">{data.incidents.slice(0, 10).map((incident, index) => <li key={`${incident.checked_at}-${index}`} className="flex flex-wrap justify-between gap-2 py-4 text-sm"><time>{formatTimestamp(incident.checked_at)}</time><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${statusColors[incident.status]}`} />{statusLabels[incident.status]}</span></li>)}</ul>}
            {!!data && data.incidents.length > 10 && <p className="mt-3 text-xs text-surface-500">Die letzten 10 von {data.incidents.length} beobachteten Störungen.</p>}
          </section>
          <section className="mt-10 rounded-2xl bg-surface-100 p-6 dark:bg-surface-900" aria-labelledby="method-title">
            <h2 id="method-title" className="font-semibold">Was wir messen</h2>
            <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-400">{data?.measurement.description ?? 'Das Monitoring prüft die Anmeldung und das Laden der Module im Schulportal. Fehlende oder veraltete Prüfungen werden als unbekannt angezeigt.'}</p>
            {data && <p className="mt-3 text-sm text-surface-500">Prüfintervall: {Math.round(data.measurement.interval_seconds / 60)} Minuten. Nach {Math.round(data.measurement.stale_after_seconds / 60)} Minuten gilt eine Prüfung als veraltet.</p>}
            <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-400">Die LANIS-Anzeige beruht auf dem letzten Abruf der Statusdaten. Eine unabhängig gemessene LANIS-Verfügbarkeit weisen wir noch nicht aus. Ergebnisse können je nach Schule oder Verbindung abweichen.</p>
          </section>
        </main>
        <footer className="flex flex-wrap gap-6 border-t py-6 text-sm text-surface-500"><Link to="/">Startseite</Link><Link to="/impressum">Impressum</Link><Link to="/privacy-policy">Datenschutz</Link></footer>
      </div>
    </div>
  );
}

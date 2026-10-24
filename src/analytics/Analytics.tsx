import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { analyticsConfigured, capture, capturePage, CONSENT_EVENT, CONSENT_KEY, getConsent, setConsent, stopAnalytics } from './client';

export function AnalyticsControls() {
  const [consent, update] = useState(getConsent);
  useEffect(() => {
    const sync = () => update(getConsent());
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  if (!analyticsConfigured()) return null;
  return <section className="card space-y-3" aria-label="Nutzungsanalyse">
    <h2 className="item-title">Optionale Nutzungsanalyse</h2>
    <p className="text-sm text-surface-600 dark:text-surface-400">Mit deiner Einwilligung hilft uns PostHog (EU), die Nutzung von Funktionen zu verstehen. Wir senden keine Namen, Schulportal-Zugangsdaten, Nachrichten, Noten oder Suchtexte. Es gibt keine Sitzungsaufzeichnungen. Eine zufällige Kennung wird lokal gespeichert und nicht mit deinem LANIS-Konto verknüpft.</p>
    <p className="text-sm" role="status">{consent === 'granted' ? 'Nutzungsanalyse ist aktiviert.' : 'Nutzungsanalyse ist deaktiviert.'}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('denied')}>Deaktivieren</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('granted')}>Aktivieren</button>
    </div>
  </section>;
}

export default function Analytics() {
  const location = useLocation();
  const [consent, update] = useState(getConsent);
  useEffect(() => {
    const sync = () => {
      const value = getConsent();
      if (value !== 'granted') stopAnalytics();
      update(value);
      void capturePage();
    };
    const storage = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) sync(); };
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', storage);
    const installed = () => { void capture('app_installed'); };
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', storage);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  useEffect(() => { void capturePage(); }, [location.pathname, consent]);
  if (!analyticsConfigured() || consent !== null || location.pathname.startsWith('/demo')) return null;
  return <aside aria-label="Optionale Nutzungsanalyse" className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-xl rounded-2xl border border-surface-200 bg-white p-5 text-surface-900 shadow-soft-lg dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100">
    <h2 className="font-semibold">Hilf uns, Lanis zu verbessern</h2>
    <p className="mt-2 text-sm">Dürfen wir mit PostHog (EU) erfassen, welche Funktionen du nutzt? Eine zufällige Kennung wird lokal gespeichert. Keine Schulportal-Inhalte, Suchtexte oder Sitzungsaufzeichnungen. Freiwillig und jederzeit hier unter <Link className="underline" to="/privacy-policy">Datenschutz</Link> widerrufbar.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('denied')}>Ablehnen</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('granted')}>Zustimmen</button>
    </div>
  </aside>;
}

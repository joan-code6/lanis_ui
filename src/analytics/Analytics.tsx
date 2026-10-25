import React, { useEffect, useState } from 'react';
import { startWebVitals } from './experience';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/backendConfig';
import { startErrorTracking } from './errors';
import { Link, useLocation } from 'react-router-dom';
import { analyticsConfigured, configureAccountAnalytics, capture, capturePage, CONSENT_EVENT, CONSENT_KEY, getConsent, setConsent, stopAnalytics } from './client';

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
    <p className="text-sm text-surface-600 dark:text-surface-400">Mit deiner Einwilligung hilft uns PostHog (EU), die Nutzung von Funktionen zu verstehen. Wir senden keine Namen, Schulportal-Zugangsdaten, Nachrichten, Noten oder Suchtexte. Es gibt keine Sitzungsaufzeichnungen. Eine zufällige Kontokennung verknüpft deine Nutzung und technische Fehler über mehrere Sitzungen hinweg. Nur unser Backend kann sie deinem Konto zuordnen. Fehlerdetails werden dort verschlüsselt für bis zu sieben Tage gespeichert; PostHog erhält nur eine Referenz.</p>
    <p className="text-sm" role="status">{consent === 'granted' ? 'Nutzungsanalyse ist aktiviert.' : 'Nutzungsanalyse ist deaktiviert.'}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('denied')}>Deaktivieren</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('granted')}>Aktivieren</button>
    </div>
  </section>;
}

export default function Analytics() {
  const location = useLocation();
  const { token, user } = useAuth();
  useEffect(() => {
    configureAccountAnalytics(token, getApiBaseUrl(), `${user?.school_id || ''}:${user?.username?.toLowerCase() || ''}`, authAPI.getValidSessionToken);
  }, [token, user?.school_id, user?.username]);
  useEffect(() => startErrorTracking(), []);
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
  useEffect(() => { void capturePage(); startWebVitals(); }, [location.pathname, consent]);
  useEffect(() => {
    if (consent !== 'granted') return;
    let started = performance.now();
    let active = 0;
    let visible = document.visibilityState === 'visible';
    let depth = 0;
    const scroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      depth = Math.max(depth, total <= 0 ? 100 : Math.min(100, Math.floor(window.scrollY / total * 4) * 25));
    };
    const flush = () => {
      const now = performance.now();
      if (visible) active += now - started;
      started = now;
      if (active > 0) void capture('page_engagement', { active_ms: active, scroll_depth: depth }, location.pathname);
      active = 0;
    };
    const visibility = () => { flush(); visible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pagehide', flush);
    };
  }, [location.pathname, consent]);

  if (!analyticsConfigured() || consent !== null || location.pathname.startsWith('/demo')) return null;
  return <aside aria-label="Optionale Nutzungsanalyse" className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-sm rounded-2xl border border-surface-200 bg-white p-5 text-surface-900 shadow-soft-lg dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0">
    <h2 className="font-semibold">Hilf uns, Lanis zu verbessern</h2>
    <p className="mt-2 text-sm">Mit deiner Zustimmung analysieren wir mit PostHog (EU) deine Nutzung und technische Fehler. Eine zufällige Kontokennung verbindet deine Sitzungen. Fehlerdetails speichern wir verschlüsselt in unserem Backend; Zugangsdaten und Schulportal-Inhalte senden wir nicht an PostHog. Du kannst deine Zustimmung jederzeit widerrufen. <Link className="underline" to="/privacy-policy">Datenschutz</Link></p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className="btn btn-primary" onClick={() => setConsent('granted')}>Zustimmen</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent('denied')}>Ablehnen</button>
    </div>
  </aside>;
}

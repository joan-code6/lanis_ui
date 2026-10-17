import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_API_BASE_URL } from '../../utils/backendConfig';
import { THEME_COLOR_HEX, getThemeIconUrl } from '../../utils/themeAssets';
import type { ThemeColor } from '../../types';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import './school-page.css';

import SEO from '../seo/SEO';
import { loadSchool, readSchoolBootstrap, schoolPath, type SchoolProfile } from './schoolData';

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
// Pick the existing Lanis theme closest to the school's primary colour.
export function themeForColor(hex: string | null): ThemeColor {
  if (!hex) return 'cyan';
  const c = hexToRgb(hex);
  let best: ThemeColor = 'cyan';
  let bestD = Infinity;
  (Object.keys(THEME_COLOR_HEX) as ThemeColor[]).filter((k) => k !== 'moss').forEach((k) => {
    const t = hexToRgb(THEME_COLOR_HEX[k]);
    const d = c.reduce((acc, v, i) => acc + (v - t[i]) ** 2, 0);
    if (d < bestD) { bestD = d; best = k; }
  });
  return best;
}

const LanisBrand = () => {
  const { themeColor } = useTheme();
  return (
    <a className="lanis-brand" href="/" aria-label="Lanis Startseite">
      <img src={getThemeIconUrl(themeColor)} alt="" /><strong>Lanis</strong>
    </a>
  );
};

const SchoolBrand: React.FC<{ school: SchoolProfile }> = ({ school }) => (
  <div className="school-brand is-compact">
    {school.assets.logo && <img src={school.assets.logo} alt={`Schulportal ${school.name} Logo`} />}
    <div><strong>{school.name}</strong><span>{school.city}</span></div>
  </div>
);

// First-time visitors use the nearest Lanis theme to the school colour. Saved preferences take precedence.
const THEME_COLOR_KEY = 'lanis_theme_color';

// Shared school hero and login card; the rest of the page uses the Lanis homepage.
const Hero: React.FC<{ school: SchoolProfile }> = ({ school }) => {
  const c = school.assets.campus;
  const srcSet = ([['xs', 768], ['sm', 990], ['md', 1200], ['lg', 1600]] as const)
    .filter(([k]) => c[k]).map(([k, w]) => `${c[k]} ${w}w`).join(', ');
  return (
  <div className="school-page school-v2 school-hero-only">
    <header className="v2-top"><LanisBrand /><SchoolBrand school={school} /></header>
    <section className="v2-campus">
      {(c.lg || c.md || c.sm || c.xs) && <img
        src={c.lg || c.md || c.sm || c.xs || undefined}
        srcSet={srcSet || undefined}
        sizes="(min-width: 1440px) 1404px, (max-width: 680px) calc(100vw - 20px), calc(100vw - 36px)"
        alt={`Schulportal ${school.name} in ${school.city}`}
      />}
      <div className="v2-overlay" />
      <div className="v2-school">
        <h1><span className="sr-only">Schulportal {school.name} in {school.city}: </span>Deine Schule.<br />Dein Tag.<br /><span>Neu gedacht.</span></h1>
        <p>Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.</p>
      </div>
      <aside className="v2-login-card dark:!bg-surface-900">
        <LoginForm fixedSchool={{ id: school.school_id, name: school.name, location: school.city }} />
      </aside>
    </section>
  </div>
  );
};

// Shared by the browser and build-time renderer: data is loaded before render.
export const SchoolLandingPage: React.FC<{ school: SchoolProfile }> = ({ school }) => {
  return (
    <Landingpage
      hero={<Hero school={school} />}
      seo={{
        // Target query: "schulportal <school name>"
        title: `Schulportal ${school.name} ${school.city} – Login, Vertretungsplan & Stundenplan`,
        description: `Das Schulportal vom ${school.name} in ${school.city}: Login mit deinen Schulportal-Hessen-Daten, Vertretungsplan, Stundenplan und Nachrichten - schneller, klarer und angenehmer in Lanis.`,
        path: schoolPath(school.school_id),
        noindex: false,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          url: `https://lanis.arg-server.de${schoolPath(school.school_id)}`,
          name: `Schulportal ${school.name} ${school.city}`,
          about: { '@type': 'School', name: school.name, address: { '@type': 'PostalAddress', addressLocality: school.city, addressRegion: 'Hessen', addressCountry: 'DE' } },
          inLanguage: 'de',
        },
      }}
    />
  );
};

const SchoolPage: React.FC = () => {
  const { schoolId = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const { setThemeColor } = useTheme();
  const [loaded, setLoaded] = useState(() => ({ route: schoolId, school: readSchoolBootstrap(schoolId, DEFAULT_API_BASE_URL) }));
  const school = loaded.route === schoolId ? loaded.school : null;
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let active = true;
    const initial = readSchoolBootstrap(schoolId, DEFAULT_API_BASE_URL);
    setLoaded({ route: schoolId, school: initial });
    setState(initial ? 'ready' : 'loading');
    const timeout = window.setTimeout(() => {
      ctrl.abort();
      if (active && !initial) setState('error');
    }, 20000);
    loadSchool(schoolId, DEFAULT_API_BASE_URL, ctrl.signal)
      .then((value) => {
        if (!active || ctrl.signal.aborted) return;
        if (value) { setLoaded({ route: schoolId, school: value }); setState('ready'); }
        else if (!initial) setState('missing');
      })
      .catch(() => { if (active && !initial) setState('error'); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; ctrl.abort(); window.clearTimeout(timeout); };
  }, [schoolId, revision]);

  useEffect(() => {
    if (school && !localStorage.getItem(THEME_COLOR_KEY)) setThemeColor(themeForColor(school.palette.primary));
  }, [school, setThemeColor]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (school) {
    if (schoolId !== school.school_id) return <Navigate to={schoolPath(school.school_id)} replace />;
    return <SchoolLandingPage key={school.school_id} school={school} />;
  }
  return <main className="min-h-screen p-8 text-center">
    <SEO title="Schulseite" description="Schulseite von Lanis" path={schoolPath(schoolId)} noindex />
    {state === 'missing' ? <><h1>Schule nicht gefunden</h1><a href="/schulen">Alle Schulen ansehen</a></>
      : state === 'error' ? <><h1>Die Schulseite ist gerade nicht erreichbar.</h1><button className="btn btn-primary mt-4" onClick={() => setRevision((value) => value + 1)}>Erneut versuchen</button></>
      : <span role="status">Schulseite wird geladen…</span>}
  </main>;
};

export default SchoolPage;

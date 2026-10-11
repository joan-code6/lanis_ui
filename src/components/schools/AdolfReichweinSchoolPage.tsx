import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_API_BASE_URL } from '../../utils/backendConfig';
import { THEME_COLOR_HEX } from '../../utils/themeAssets';
import type { ThemeColor } from '../../types';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import './adolf-reichwein-school.css';

interface SchoolProfile {
  school_id: string;
  name: string;
  city: string;
  palette: { primary: string | null };
  assets: { logo: string | null; campus: { xs: string | null; sm: string | null; md: string | null; lg: string | null } };
}
interface SchoolListItem { school_id: string; name: string; city: string }

const slugify = (value: string) =>
  value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// /schule/<slug>: look the slug up in the school list, then load the details by ID.
async function loadSchool(slug: string, signal: AbortSignal): Promise<SchoolProfile | null> {
  const { data: list } = await axios.get<{ success: boolean; schools: SchoolListItem[] }>(
    `${DEFAULT_API_BASE_URL}/schools`, { timeout: 15000, signal },
  );
  const s = slug.toLowerCase();
  const matches = list.schools.filter((x) => x.school_id === s || slugify(x.name) === s || slugify(`${x.name} ${x.city}`) === s);
  if (matches.length !== 1) return null;
  const { data } = await axios.get<{ success: boolean; school: SchoolProfile }>(
    `${DEFAULT_API_BASE_URL}/schools/${encodeURIComponent(matches[0].school_id)}/data`, { timeout: 15000, signal },
  );
  return data.success ? data.school : null;
}

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
// Pick the existing Lanis theme closest to the school's primary colour.
function themeForColor(hex: string | null): ThemeColor {
  if (!hex) return 'cyan';
  const c = hexToRgb(hex);
  let best: ThemeColor = 'cyan';
  let bestD = Infinity;
  (Object.keys(THEME_COLOR_HEX) as ThemeColor[]).forEach((k) => {
    const t = hexToRgb(THEME_COLOR_HEX[k]);
    const d = c.reduce((acc, v, i) => acc + (v - t[i]) ** 2, 0);
    if (d < bestD) { bestD = d; best = k; }
  });
  return best;
}

const LanisBrand = () => (
  <a className="lanis-brand" href="/" aria-label="Lanis Startseite">
    <img src="/favicon/themes/cyan/android-chrome-192x192.png" alt="" /><strong>Lanis</strong>
  </a>
);

const SchoolBrand: React.FC<{ school: SchoolProfile }> = ({ school }) => (
  <div className="school-brand is-compact">
    {school.assets.logo && <img src={school.assets.logo} alt={`Schulportal ${school.name} Logo`} />}
    <div><strong>{school.name}</strong><span>{school.city}</span></div>
  </div>
);

// First-time visitors get the Lanis theme closest to the school's Schulportal Hessen colour (ARG: cyan). Anyone who already has a saved theme keeps it.
const THEME_COLOR_KEY = 'lanis_theme_color';

// Navbar + hero: the "Willkommen am ARG" design (version 2) of the concept page, with the
// requested copy and the real login card. Everything below is the homepage.
const Hero: React.FC<{ school: SchoolProfile }> = ({ school }) => {
  const c = school.assets.campus;
  const srcSet = ([['xs', 768], ['sm', 990], ['md', 1200], ['lg', 1600]] as const)
    .filter(([k]) => c[k]).map(([k, w]) => `${c[k]} ${w}w`).join(', ');
  return (
  <div className="school-page school-v2 school-hero-only">
    <header className="v2-top"><LanisBrand /><SchoolBrand school={school} /></header>
    <section className="v2-campus">
      <img
        src={c.lg || c.md || c.sm || c.xs || undefined}
        srcSet={srcSet || undefined}
        sizes="100vw"
        alt={`Schulportal ${school.name} in ${school.city}`}
      />
      <div className="v2-overlay" />
      <div className="v2-school">
        <h1>Deine Schule.<br />Dein Tag.<br /><span>Modern</span></h1>
        <p>Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.</p>
      </div>
      <aside className="v2-login-card dark:!bg-surface-900">
        <LoginForm fixedSchool={{ id: school.school_id, name: school.name, location: school.city }} />
      </aside>
    </section>
  </div>
  );
};

const AdolfReichweinSchoolPage: React.FC = () => {
  const { schoolId = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const { setThemeColor } = useTheme();
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setSchool(null);
    setNotFound(false);
    loadSchool(schoolId, ctrl.signal)
      .then((r) => { if (r) setSchool(r); else setNotFound(true); })
      .catch(() => { if (!ctrl.signal.aborted) setNotFound(true); });
    return () => ctrl.abort();
  }, [schoolId]);

  useEffect(() => {
    if (school && !localStorage.getItem(THEME_COLOR_KEY)) setThemeColor(themeForColor(school.palette.primary));
  }, [school, setThemeColor]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (notFound) return <main className="min-h-screen p-8 text-center">Für diese Schule gibt es keine Seite.</main>;
  if (!school) return <main className="flex min-h-screen items-center justify-center" aria-label="Schulseite wird geladen"><span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600" /></main>;
  return (
    <Landingpage
      hero={<Hero school={school} />}
      seo={{
        // Target query: "schulportal <school name>"
        title: `Schulportal ${school.name} ${school.city} – Login, Vertretungsplan & Stundenplan`,
        description: `Das Schulportal vom ${school.name} in ${school.city}: Login mit deinen Schulportal-Hessen-Daten, Vertretungsplan, Stundenplan und Nachrichten - schneller, klarer und angenehmer in Lanis.`,
        path: `/schule/${schoolId}`,
        noindex: true, // POC: set to false to make the page indexable
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `Schulportal ${school.name} ${school.city}`,
          about: { '@type': 'School', name: school.name, address: { '@type': 'PostalAddress', addressLocality: school.city, addressRegion: 'Hessen', addressCountry: 'DE' } },
          inLanguage: 'de',
        },
      }}
    />
  );
};

export default AdolfReichweinSchoolPage;

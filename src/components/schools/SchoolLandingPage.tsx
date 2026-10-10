import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_API_BASE_URL } from '../../utils/backendConfig';
import { ThemeColor } from '../../types';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import './school-landing-page.css';

interface SchoolLandingProfile {
  school_id: string;
  name: string;
  city: string;
  short_name: string;
  login_url: string;
  theme_color: ThemeColor;
  palette: { primary: string; primary_dark: string; accent: string };
  assets: { logo: string; campus: { xs: string; sm: string; md: string; lg: string } };
}

const LanisBrand = () => (
  <a className="lanis-brand" href="/" aria-label="Lanis Startseite">
    <img src="/favicon/themes/cyan/android-chrome-192x192.png" alt="" /><strong>Lanis</strong>
  </a>
);

const SchoolBrand: React.FC<{ school: SchoolLandingProfile }> = ({ school }) => (
  <div className="school-brand is-compact">
    <img src={school.assets.logo} alt={`Schulportal ${school.name} Logo`} />
    <div><strong>{school.name}</strong><span>{school.city}</span></div>
  </div>
);

const THEME_COLOR_KEY = 'lanis_theme_color';

// Navbar + hero: the "Willkommen am ARG" design (version 2) of the concept page, with the
// requested copy and the real login card. Everything below is the homepage.
const Hero: React.FC<{ school: SchoolLandingProfile }> = ({ school }) => {
  const schoolStyle: React.CSSProperties & {
    '--school-primary': string;
    '--school-primary-dark': string;
    '--school-accent': string;
  } = {
    '--school-primary': school.palette.primary,
    '--school-primary-dark': school.palette.primary_dark,
    '--school-accent': school.palette.accent,
  };
  return (
  <div className="school-page school-v2 school-hero-only" style={schoolStyle}>
    <header className="v2-top"><LanisBrand /><SchoolBrand school={school} /></header>
    <section className="v2-campus">
      <img
        src={school.assets.campus.lg}
        srcSet={`${school.assets.campus.xs} 768w, ${school.assets.campus.sm} 990w, ${school.assets.campus.md} 1200w, ${school.assets.campus.lg} 1600w`}
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
  const normalizedId = schoolId === 'adolf-reichwein-gymnasium' ? '5201' : schoolId;
  const [school, setSchool] = useState<SchoolLandingProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { isAuthenticated } = useAuth();
  const { setThemeColor } = useTheme();

  useEffect(() => {
    let active = true;
    setSchool(null);
    setNotFound(false);
    axios.get<{ success: boolean; school: SchoolLandingProfile }>(
      `${DEFAULT_API_BASE_URL}/schools/${encodeURIComponent(normalizedId)}/landing-page`,
      { timeout: 10000 },
    ).then(({ data }) => {
      if (active && data.success) setSchool(data.school);
      else if (active) setNotFound(true);
    }).catch(() => {
      if (active) setNotFound(true);
    });
    return () => { active = false; };
  }, [normalizedId]);

  useEffect(() => {
    if (school && !localStorage.getItem(THEME_COLOR_KEY)) setThemeColor(school.theme_color);
  }, [school, setThemeColor]);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (notFound) return <main className="min-h-screen p-8 text-center">Für diese Schule gibt es noch keine Schul-Seite.</main>;
  if (!school) return <main className="flex min-h-screen items-center justify-center" aria-label="Schulseite wird geladen"><span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600" /></main>;
  return (
    <Landingpage
      hero={<Hero school={school} />}
      seo={{
        title: `Schulportal ${school.name} ${school.city} – Login, Vertretungsplan & Stundenplan`,
        description: `Das Schulportal vom ${school.name} in ${school.city}: Login mit deinen Schulportal-Hessen-Daten, Vertretungsplan, Stundenplan und Nachrichten - schneller, klarer und angenehmer in Lanis.`,
        path: `/schule/${school.school_id}`,
        noindex: false,
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

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import './adolf-reichwein-school.css';

const BASE_PATH = '/schule/adolf-reichwein-gymnasium';
const SCHOOL_ID = '5201';
const SCHOOL_NAME = 'Adolf-Reichwein-Gymnasium';
const SCHOOL_CITY = 'Heusenstamm';
const LOGO = '/schools/5201/logo.png';
const CAMPUS = '/schools/5201/background-lg.jpg';

const LanisBrand = () => (
  <a className="lanis-brand" href="/" aria-label="Lanis Startseite">
    <img src="/favicon/themes/cyan/android-chrome-192x192.png" alt="" /><strong>Lanis</strong>
  </a>
);

const SchoolBrand = () => (
  <div className="school-brand is-compact">
    <img src={LOGO} alt={`Schulportal ${SCHOOL_NAME} Logo`} />
    <div><strong>{SCHOOL_NAME}</strong><span>{SCHOOL_CITY}</span></div>
  </div>
);

// Navbar + hero: the "Willkommen am ARG" design (version 2) of the concept page, with the
// requested copy and the real login card. Everything below is the homepage.
const Hero: React.FC = () => (
  <div className="school-page school-v2 school-hero-only">
    <header className="v2-top"><LanisBrand /><SchoolBrand /></header>
    <section className="v2-campus">
      <img
        src={CAMPUS}
        srcSet="/schools/5201/background-xs.jpg 768w, /schools/5201/background-sm.jpg 990w, /schools/5201/background-md.jpg 1200w, /schools/5201/background-lg.jpg 1600w"
        sizes="100vw"
        alt={`Schulportal ${SCHOOL_NAME} in ${SCHOOL_CITY}`}
      />
      <div className="v2-overlay" />
      <div className="v2-school">
        <h1>Deine Schule.<br />Dein Tag.<br /><span>Modern</span></h1>
        <p>Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.</p>
      </div>
      <aside className="v2-login-card dark:!bg-surface-900">
        <LoginForm fixedSchool={{ id: SCHOOL_ID, name: SCHOOL_NAME, location: SCHOOL_CITY }} />
      </aside>
    </section>
  </div>
);

const AdolfReichweinSchoolPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return (
    <Landingpage
      hero={<Hero />}
      seo={{
        // Target query: "schulportal <school name>"
        title: `Schulportal ${SCHOOL_NAME} ${SCHOOL_CITY} – Login, Vertretungsplan & Stundenplan`,
        description: `Das Schulportal vom ${SCHOOL_NAME} in ${SCHOOL_CITY}: Login mit deinen Schulportal-Hessen-Daten, Vertretungsplan, Stundenplan und Nachrichten - schneller, klarer und angenehmer in Lanis.`,
        path: BASE_PATH,
        noindex: true, // POC: set to false to make the page indexable
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `Schulportal ${SCHOOL_NAME} ${SCHOOL_CITY}`,
          about: { '@type': 'School', name: SCHOOL_NAME, address: { '@type': 'PostalAddress', addressLocality: SCHOOL_CITY, addressRegion: 'Hessen', addressCountry: 'DE' } },
          inLanguage: 'de',
        },
      }}
    />
  );
};

export default AdolfReichweinSchoolPage;

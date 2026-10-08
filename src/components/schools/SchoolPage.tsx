import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import SEO from '../seo/SEO';
import { ARG, SCHOOL_VARIANTS } from './schoolData';
import SchoolV1 from './SchoolV1';
import SchoolV2 from './SchoolV2';
import SchoolV3 from './SchoolV3';
import SchoolV4 from './SchoolV4';

const VARIANTS: Record<string, React.FC> = { '1': SchoolV1, '2': SchoolV2, '3': SchoolV3, '4': SchoolV4 };

// POC: only school 5201 exists. A real version resolves :slug from the generated school list.
const SchoolPage: React.FC = () => {
  const { slug = '', variant } = useParams();
  const normalized = slug.toLowerCase().replace('reichein', 'reichwein');
  if (normalized !== ARG.slug && normalized !== ARG.id) return <Navigate to="/" replace />;
  if (!variant || !VARIANTS[variant]) return <Navigate to={`/schulen/${ARG.slug}/1`} replace />;
  const V = VARIANTS[variant];
  return (
    <>
      <SEO
        title={`Lanis Login – ${ARG.name}, ${ARG.city}`}
        description={`Schulportal Hessen Login für das ${ARG.name} in ${ARG.city}: Vertretungsplan, Stundenplan und Nachrichten in Lanis.`}
        path={`/schulen/${ARG.slug}/${variant}`}
        noindex
      />
      <V />
      <nav className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/70 p-1 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
        <span className="px-3 text-white/50">Design</span>
        {SCHOOL_VARIANTS.map((v) => (
          <a
            key={v.id}
            href={`/schulen/${ARG.slug}/${v.id}`}
            className={`rounded-full px-3 py-1.5 transition ${v.id === variant ? 'bg-white text-black' : 'hover:bg-white/15'}`}
          >
            {v.id} · {v.label}
          </a>
        ))}
      </nav>
    </>
  );
};

export default SchoolPage;

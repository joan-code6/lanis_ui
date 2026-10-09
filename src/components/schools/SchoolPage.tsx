import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import { ARG } from './schoolData';

const SchoolHero: React.FC = () => {
  const c = ARG.colors;
  return (
    <section className="max-w-6xl mx-auto px-6 pt-6 md:pt-10 pb-16">
      <div className="relative isolate overflow-hidden rounded-3xl bg-[#07090c] text-white">
        <img
          src={ARG.bg.lg}
          srcSet={`${ARG.bg.xs} 768w, ${ARG.bg.sm} 990w, ${ARG.bg.md} 1200w, ${ARG.bg.lg} 1600w`}
          sizes="(min-width: 1152px) 1152px, 100vw"
          alt={`Schulgebäude ${ARG.name}`}
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-70"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(to top, #07090c 5%, transparent 65%), linear-gradient(90deg, ${c.bg}66, #07090ccc)` }}
        />
        <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <div className="rounded-xl bg-white p-2 shadow-lg">
                <img src={ARG.logo} alt={`Logo ${ARG.name}`} className="h-12 w-auto" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{ARG.name}</div>
                <div className="text-xs text-white/70">{ARG.city}</div>
              </div>
            </div>
            <h1 className="text-[clamp(2.25rem,5vw,4.25rem)] font-bold leading-[0.97] tracking-tighter">
              Dein Schulportal am ARG.
              <span className="block" style={{ color: c.bg }}>Sofort da, auch bei Störung.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.
            </p>
          </div>
          <div className="rounded-3xl bg-[#fcfcf9] p-6 text-[#1a1a1a] shadow-2xl dark:bg-surface-900 dark:text-surface-100 sm:p-8">
            <LoginForm fixedSchool={{ id: ARG.id, name: ARG.name, location: ARG.city }} />
          </div>
        </div>
      </div>
    </section>
  );
};

// POC: only school 5201 exists. A real version resolves :slug from the generated school list.
const SchoolPage: React.FC = () => {
  const { slug = '' } = useParams();
  const normalized = slug.toLowerCase().replace('reichein', 'reichwein');
  if (normalized !== ARG.slug && normalized !== ARG.id) return <Navigate to="/" replace />;
  return (
    <Landingpage
      hero={<SchoolHero />}
      seo={{
        title: `Lanis Login – ${ARG.name}, ${ARG.city}`,
        description: `Schulportal Hessen Login für das ${ARG.name} in ${ARG.city}: Vertretungsplan, Stundenplan und Nachrichten in Lanis.`,
        path: `/schule/${ARG.slug}`,
        noindex: true,
      }}
    />
  );
};

export default SchoolPage;

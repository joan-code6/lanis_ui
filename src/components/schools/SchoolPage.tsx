import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Landingpage from '../landing/Landingpage';
import LoginForm from '../auth/LoginForm';
import { ARG } from './schoolData';

const card = 'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur';

// Navbar + hero: the original "Bento" design (direction 2) from the POC, with the login card
// in the top-right tile. Everything below this band is the real homepage.
const SchoolHero: React.FC = () => {
  const c = ARG.colors;
  return (
    <div
      className="bg-[#07090c] pb-10 font-sans text-white"
      style={{ backgroundImage: `radial-gradient(60rem 30rem at 85% -10%, ${c.bg}40, transparent), radial-gradient(40rem 30rem at -10% 40%, ${c.border}26, transparent)` }}
    >
      <style>{`
        @keyframes v2-pulse { 0%,100% { opacity:.4; transform:scale(1);} 50% { opacity:1; transform:scale(1.4);} }
        @keyframes v2-in { from { transform: translateY(16px) scale(.98);} to { transform:none;} }
        .v2-in { animation: v2-in .7s cubic-bezier(.2,.8,.2,1); }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-black" style={{ background: c.bg, color: '#04161a' }}>L</span>
            Lanis <span className="text-white/30">/</span> <span className="text-white/60">Schulen</span>
          </div>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">POC · Demo-Daten</span>
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className={`${card} v2-in lg:col-span-7 !p-0`}>
            <img
              src={ARG.bg.lg}
              srcSet={`${ARG.bg.xs} 768w, ${ARG.bg.sm} 990w, ${ARG.bg.md} 1200w, ${ARG.bg.lg} 1600w`}
              sizes="(min-width: 1024px) 58vw, 100vw"
              alt={ARG.name}
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #07090c 5%, transparent 60%), linear-gradient(90deg, ${c.bg}55, transparent)` }} />
            <div className="relative flex h-full min-h-[26rem] flex-col justify-end p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="w-fit rounded-xl bg-white p-2"><img src={ARG.logo} alt="" className="h-10" /></div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/80">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.bg, animation: 'v2-pulse 2s infinite' }} />
                  <span className="hidden sm:inline">{ARG.name} · </span>{ARG.city}
                </div>
              </div>
              <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                Dein Schulportal am ARG.
                <span className="block" style={{ color: c.bg }}>Sofort da, auch bei Störung.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.
              </p>
            </div>
          </div>

          <div className={`${card} v2-in lg:col-span-5 flex items-center justify-center !bg-[#fcfcf9] p-6 text-[#1a1a1a] dark:!bg-surface-900 dark:text-surface-100 sm:p-8`} style={{ animationDelay: '.08s' }}>
            <LoginForm fixedSchool={{ id: ARG.id, name: ARG.name, location: ARG.city }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// POC: only school 5201 exists. A real version resolves :slug from the generated school list.
const SchoolPage: React.FC = () => {
  const { slug = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const normalized = slug.toLowerCase().replace('reichein', 'reichwein');
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
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

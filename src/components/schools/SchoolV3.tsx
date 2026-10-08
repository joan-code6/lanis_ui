import React from 'react';
import { ARG, DEMO_BADGE, MOCK } from './schoolData';

// Direction 3 - "Poster": loud neo-brutalist. Solid brand colour, thick ink borders, hard shadows, marquee.
const INK = '#0b0b0b';
const SchoolV3: React.FC = () => {
  const c = ARG.colors;
  const box = { border: `3px solid ${INK}`, boxShadow: `7px 7px 0 ${INK}` } as const;
  const marquee = Array.from({ length: 8 }, () => `${ARG.name.toUpperCase()} ★ ${ARG.city.toUpperCase()} ★ SCHULE ${ARG.id} ★`).join(' ');
  return (
    <div className="min-h-screen pb-28 font-sans" style={{ background: c.bg, color: INK, backgroundImage: `radial-gradient(${INK}22 1.5px, transparent 1.5px)`, backgroundSize: '18px 18px' }}>
      <style>{`
        @keyframes v3-marquee { from { transform: translateX(0);} to { transform: translateX(-50%);} }
        @keyframes v3-wobble { 0%,100% { transform: rotate(-6deg);} 50% { transform: rotate(4deg);} }
        .v3-btn { transition: transform .12s, box-shadow .12s; }
        .v3-btn:hover { transform: translate(4px,4px); box-shadow: 0 0 0 ${INK} !important; }
      `}</style>

      <div className="overflow-hidden whitespace-nowrap py-2 text-sm font-black tracking-widest text-white" style={{ background: INK }}>
        <div className="inline-block" style={{ animation: 'v3-marquee 30s linear infinite' }}>{marquee} {marquee}</div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-10 flex items-center justify-between">
          <span className="px-3 py-1 text-xl font-black" style={{ background: '#fff', ...box, boxShadow: `4px 4px 0 ${INK}` }}>LANIS</span>
          <span className="bg-yellow-300 px-3 py-1 text-xs font-black" style={{ border: `3px solid ${INK}` }}>{DEMO_BADGE}</span>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="relative">
              <h1 className="text-[clamp(2.8rem,9vw,7.5rem)] font-black uppercase leading-[0.85] tracking-tighter" style={{ color: '#fff', WebkitTextStroke: `3px ${INK}`, paintOrder: 'stroke fill', textShadow: `7px 7px 0 ${INK}` }}>
                Adolf<br />Reichwein<br />Gymnasium
              </h1>
              <span className="absolute -right-2 top-0 hidden rotate-6 bg-yellow-300 px-4 py-2 text-lg font-black sm:block" style={{ border: `3px solid ${INK}`, animation: 'v3-wobble 3s ease-in-out infinite' }}>
                {ARG.city}!
              </span>
            </div>
            <p className="mt-8 max-w-lg text-xl font-bold">Das Schulportal für Schule {ARG.id}. Ohne Gewürge. Einmal einloggen, alles da.</p>
            <a href={ARG.loginUrl} className="v3-btn mt-8 inline-block bg-white px-8 py-4 text-2xl font-black uppercase" style={box}>Login starten →</a>
            <a href="/demo" className="v3-btn ml-4 mt-8 inline-block bg-yellow-300 px-6 py-4 text-lg font-black uppercase" style={box}>Demo</a>
          </div>

          <div className="relative">
            <div className="rotate-2 bg-white p-3" style={box}>
              <img src={ARG.bg.sm} alt={ARG.name} className="w-full" style={{ border: `3px solid ${INK}`, filter: 'contrast(1.1) saturate(1.2)' }} />
              <div className="mt-3 flex items-center justify-between">
                <img src={ARG.logo} alt="" className="h-12" />
                <span className="text-sm font-black uppercase">Foto: Schulportal Hessen</span>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 -rotate-6 bg-white px-3 py-2 text-sm font-black" style={{ border: `3px solid ${INK}` }}>
              <div className="flex gap-1">{Object.values(c).map((v, i) => <i key={i} className="h-5 w-5" style={{ background: v, border: `2px solid ${INK}` }} />)}</div>
              eure 7 farben
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK.stats.map((s, i) => (
            <div key={s.label} className="bg-white p-5" style={{ ...box, transform: `rotate(${[-1.5, 1, -0.5, 1.5][i]}deg)` }}>
              <div className="text-5xl font-black">{s.value}</div>
              <div className="text-sm font-black uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <section className="bg-white p-6" style={box}>
            <h2 className="mb-4 text-3xl font-black uppercase">Heute fällt aus ✂</h2>
            {MOCK.substitutions.map((s) => (
              <div key={s.period + s.subject} className="flex items-center gap-3 border-t-[3px] py-3" style={{ borderColor: INK }}>
                <span className="grid h-10 w-12 place-items-center text-sm font-black text-white" style={{ background: INK }}>{s.period}</span>
                <span className="flex-1 text-lg font-black">{s.subject}<span className="block text-xs font-bold opacity-60">{s.note}</span></span>
                <span className="px-2 py-1 text-xs font-black uppercase" style={{ background: s.status === 'Entfall' ? '#ff6b6b' : s.status === 'Raum' ? '#ffd93d' : c.bg, border: `2px solid ${INK}` }}>{s.status}</span>
              </div>
            ))}
          </section>
          <section className="p-6 text-white" style={{ ...box, background: INK, boxShadow: `7px 7px 0 #fff` }}>
            <h2 className="mb-4 text-3xl font-black uppercase">Das kann Lanis</h2>
            <ul className="space-y-3">
              {MOCK.features.map((f, i) => (
                <li key={f.title} className="flex gap-3"><span className="font-black" style={{ color: c.bg }}>{String(i + 1).padStart(2, '0')}</span><span><b>{f.title}.</b> <span className="opacity-70">{f.text}</span></span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SchoolV3;

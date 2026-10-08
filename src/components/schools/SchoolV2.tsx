import React from 'react';
import { ARG, DEMO_BADGE, MOCK } from './schoolData';

const statusColor: Record<string, string> = { Entfall: '#ff5d6c', Raum: '#ffb547', Vertretung: '#4cc9f0' };

// Direction 2 - "Bento": dark, dense product-style bento grid with live-looking widgets.
const SchoolV2: React.FC = () => {
  const c = ARG.colors;
  const card = 'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur';
  return (
    <div className="min-h-screen bg-[#07090c] pb-28 font-sans text-white" style={{ backgroundImage: `radial-gradient(60rem 30rem at 85% -10%, ${c.bg}40, transparent), radial-gradient(40rem 30rem at -10% 40%, ${c.border}26, transparent)` }}>
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
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">{DEMO_BADGE}</span>
        </header>

        <div className="grid auto-rows-[minmax(9rem,auto)] gap-4 md:grid-cols-6 lg:grid-cols-12">
          <div className={`${card} v2-in md:col-span-6 lg:col-span-7 lg:row-span-2 !p-0`}>
            <img src={ARG.bg.md} alt={ARG.name} className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #07090c 5%, transparent 60%), linear-gradient(90deg, ${c.bg}55, transparent)` }} />
            <div className="relative flex h-full min-h-[26rem] flex-col justify-end p-8">
              <div className="mb-5 w-fit rounded-xl bg-white p-2"><img src={ARG.logo} alt="" className="h-10" /></div>
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: c.bg, animation: 'v2-pulse 2s infinite' }} /> {ARG.city} · Hessen
              </div>
              <h1 className="text-4xl font-black leading-none tracking-tight sm:text-6xl">{ARG.name}</h1>
            </div>
          </div>

          <div className={`${card} v2-in md:col-span-3 lg:col-span-5`} style={{ animationDelay: '.08s', background: `linear-gradient(135deg, ${c.bg}, ${c.border})`, color: '#04161a' }}>
            <div className="text-xs font-bold uppercase tracking-widest opacity-70">Schule {ARG.id}</div>
            <div className="mt-2 text-3xl font-black leading-tight">Dein Portal. Deine Schule. Deine Farben.</div>
            <a href={ARG.loginUrl} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#04161a] px-5 py-3 font-bold text-white transition hover:gap-4">
              Einloggen <span>→</span>
            </a>
          </div>

          <div className={`${card} v2-in md:col-span-3 lg:col-span-5`} style={{ animationDelay: '.14s' }}>
            <div className="mb-3 flex items-center justify-between text-sm text-white/60"><span>Farbpalette der Schule</span><span>7 Tokens</span></div>
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(c).map(([k, v]) => (
                <div key={k} className="group">
                  <div className="aspect-square rounded-xl ring-1 ring-white/20 transition group-hover:scale-110" style={{ background: v }} />
                  <div className="mt-1 truncate text-[9px] text-white/50">{k}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-xs text-white/40">{c.bg} · {c.border} · {c.footer}</div>
          </div>

          <div className={`${card} v2-in md:col-span-6 lg:col-span-5 lg:row-span-2`} style={{ animationDelay: '.2s' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Vertretungsplan <span className="text-white/40">· 10b</span></h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-300"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: 'v2-pulse 1.6s infinite' }} />live</span>
            </div>
            <ul className="space-y-2">
              {MOCK.substitutions.map((s) => (
                <li key={s.period + s.subject} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3">
                  <span className="w-10 text-sm font-black text-white/50">{s.period}</span>
                  <span className="flex-1 font-semibold">{s.subject}<span className="block text-xs font-normal text-white/40">{s.note || '-'}</span></span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `${statusColor[s.status]}22`, color: statusColor[s.status] }}>{s.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${card} v2-in md:col-span-3 lg:col-span-4 lg:row-span-2`} style={{ animationDelay: '.26s' }}>
            <div className="mb-3 text-sm text-white/60">Stundenplan</div>
            <div className="grid grid-cols-5 gap-1.5">
              {MOCK.timetable.flat().map((s, i) => (
                <div key={i} className="grid aspect-[4/3] place-items-center rounded-lg text-xs font-bold" style={{ background: `${c.bg}${['22', '33', '44', '28', '3a'][i % 5]}`, color: c.bg }}>{s}</div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:col-span-3 lg:col-span-3 lg:row-span-2">
            {MOCK.stats.slice(0, 2).map((s, i) => (
              <div key={s.label} className={`${card} v2-in flex flex-col justify-end`} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                <div className="text-5xl font-black" style={{ color: c.bg }}>{s.value}</div>
                <div className="text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>

          <div className={`${card} v2-in md:col-span-6 lg:col-span-6`} style={{ animationDelay: '.4s' }}>
            <h3 className="mb-3 font-bold">Nachrichten zum Tag</h3>
            {MOCK.news.map((n) => (
              <div key={n.title} className="flex items-center gap-4 border-t border-white/10 py-3 first:border-0">
                <span className="w-14 text-sm font-black" style={{ color: c.bg }}>{n.date}</span>
                <span className="flex-1">{n.title}</span>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/50">{n.tag}</span>
              </div>
            ))}
          </div>

          <div className={`${card} v2-in md:col-span-6 lg:col-span-6`} style={{ animationDelay: '.46s' }}>
            <h3 className="mb-3 font-bold">Was Lanis kann</h3>
            <div className="flex flex-wrap gap-2">
              {MOCK.features.map((f) => <span key={f.title} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm">{f.title}</span>)}
              <span className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: c.bg, color: '#04161a' }}>+ PWA & Push</span>
            </div>
            <p className="mt-4 text-xs text-white/40">Zuletzt geändert bei Schulportal Hessen: {new Date(ARG.lastChange * 1000).toLocaleDateString('de-DE')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolV2;

import React from 'react';
import { ARG, DEMO_BADGE, MOCK } from './schoolData';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// Direction 4 - "Portal": calm light editorial page, centred on a floating browser mock of the school-themed app.
const SchoolV4: React.FC = () => {
  const c = ARG.colors;
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f8f9] pb-28 font-sans text-neutral-900">
      <style>{`
        @keyframes v4-float { 0%,100% { transform: perspective(1600px) rotateY(-9deg) rotateX(4deg) translateY(0);} 50% { transform: perspective(1600px) rotateY(-7deg) rotateX(3deg) translateY(-12px);} }
        @keyframes v4-chip { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-8px);} }
      `}</style>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: c.border }}>L</span> Lanis</div>
        <nav className="hidden gap-8 text-sm text-neutral-500 sm:flex"><a href="#features">Funktionen</a><a href="#schritte">So geht&apos;s</a><a href="/demo">Demo</a></nav>
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-white">{DEMO_BADGE}</span>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <img src={ARG.logo} alt={`Logo ${ARG.name}`} className="h-12 w-auto" />
            <span className="h-8 w-px bg-neutral-300" />
            <span className="text-sm text-neutral-500">{ARG.city}</span>
          </div>
          <h1 className="mt-8 font-serif text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            Das Schulportal <em className="not-italic" style={{ color: c.border }}>vom {ARG.name}</em>, neu gedacht.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-neutral-600">Gleiche Daten wie im offiziellen Portal, aber mit Stundenplan, Vertretung und Nachrichten so, wie man sie 2026 erwartet.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={ARG.loginUrl} className="rounded-2xl px-7 py-4 text-lg font-bold shadow-xl transition hover:-translate-y-0.5" style={{ background: c.bg, color: '#04161a', boxShadow: `0 18px 40px -12px ${c.bg}` }}>Mit Schule {ARG.id} anmelden</a>
            <span className="text-sm text-neutral-500">Schule ist schon vorausgewählt</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 -z-10 rounded-[3rem] opacity-30 blur-3xl" style={{ background: `linear-gradient(135deg, ${c.bg}, #7c9cff)` }} />
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_50px_100px_-30px_rgba(0,30,40,.5)] ring-1 ring-black/10" style={{ animation: 'v4-float 9s ease-in-out infinite' }}>
            <div className="flex items-center gap-1.5 bg-neutral-100 px-4 py-2.5">
              <i className="h-2.5 w-2.5 rounded-full bg-red-400" /><i className="h-2.5 w-2.5 rounded-full bg-yellow-400" /><i className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-xs text-neutral-400">lanis.arg-server.de/schulen/{ARG.slug}</span>
            </div>
            <div className="flex items-center gap-3 px-5 py-3" style={{ background: c.bg, color: c.text }}>
              <img src={ARG.logo} alt="" className="h-7 rounded bg-white p-0.5" />
              <b className="text-sm">{ARG.name}</b>
              <span className="ml-auto text-xs opacity-80">10b · Dashboard</span>
            </div>
            <div className="grid grid-cols-[1fr_0.9fr] gap-4 p-5">
              <div>
                <div className="mb-2 text-xs font-bold text-neutral-400">STUNDENPLAN</div>
                <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                  {DAYS.map((d) => <div key={d} className="font-bold text-neutral-400">{d}</div>)}
                  {MOCK.timetable.flat().map((s, i) => <div key={i} className="rounded py-1.5 font-bold" style={{ background: `${c.bg}${i % 7 === 0 ? '55' : '22'}`, color: c.footer }}>{s}</div>)}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold text-neutral-400">VERTRETUNG</div>
                {MOCK.substitutions.slice(0, 3).map((s) => (
                  <div key={s.period + s.subject} className="mb-1.5 rounded-lg border-l-4 bg-neutral-50 px-2.5 py-1.5 text-[11px]" style={{ borderColor: c.bg }}>
                    <b>{s.period}. {s.subject}</b><div className="text-neutral-500">{s.status} {s.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -left-6 top-16 hidden rounded-2xl bg-white px-4 py-3 text-sm shadow-xl sm:block" style={{ animation: 'v4-chip 4s ease-in-out infinite' }}>
            <div className="text-xs text-neutral-400">Push</div><b>Französisch entfällt</b>
          </div>
          <div className="absolute -bottom-5 right-4 hidden items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl sm:flex" style={{ animation: 'v4-chip 5s ease-in-out infinite .8s' }}>
            {Object.values(c).map((v, i) => <i key={i} className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: v }} />)}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: c.border }}>Funktionen</p>
            <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Weniger Klicks. Mehr Schule.</h2>
            <div className="mt-8 grid grid-cols-2 gap-6">
              {MOCK.stats.map((s) => <div key={s.label}><div className="font-serif text-4xl">{s.value}</div><div className="text-sm text-neutral-500">{s.label}</div></div>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {MOCK.features.map((f) => (
              <div key={f.title} className="rounded-3xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-4 h-10 w-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${c.bg}, ${c.border})` }} />
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="schritte" className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 rounded-[2rem] p-8 sm:grid-cols-3" style={{ background: c.footer, color: c.text }}>
          {['Schule ist schon gewählt', 'Mit Portal-Daten anmelden', 'Plan, Vertretung, Nachrichten'].map((t, i) => (
            <div key={t}><div className="font-serif text-6xl opacity-40">{i + 1}</div><div className="mt-1 text-lg font-bold">{t}</div></div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SchoolV4;

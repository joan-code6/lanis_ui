import React from 'react';
import { ARG, DEMO_BADGE, MOCK } from './schoolData';

// Direction 1 - "Hero": full-bleed school photo, tinted in the school's brand colour, glass login card.
const SchoolV1: React.FC = () => {
  const c = ARG.colors;
  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-white">
      <style>{`
        @keyframes v1-kenburns { from { transform: scale(1.02) translate3d(0,0,0);} to { transform: scale(1.14) translate3d(-1.5%,-1%,0);} }
        @keyframes v1-rise { from { opacity:0; transform: translateY(24px);} to { opacity:1; transform:none;} }
        .v1-rise { animation: v1-rise .9s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>

      <section className="relative isolate flex min-h-screen flex-col overflow-hidden">
        <img
          src={ARG.bg.lg}
          srcSet={`${ARG.bg.xs} 768w, ${ARG.bg.sm} 990w, ${ARG.bg.md} 1200w, ${ARG.bg.lg} 1600w`}
          sizes="100vw"
          alt={`Schulgebäude ${ARG.name}`}
          className="absolute inset-0 -z-30 h-full w-full object-cover"
          style={{ animation: 'v1-kenburns 28s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-20" style={{ background: `linear-gradient(115deg, ${c.bg}e6 0%, ${c.bg}99 45%, #04161a99 100%)`, mixBlendMode: "normal" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
        <div className="absolute -right-40 -top-40 -z-10 h-[40rem] w-[40rem] rounded-full blur-3xl" style={{ background: `${c.bg}66` }} />

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <a href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-black" style={{ color: c.border }}>L</span>
            Lanis
          </a>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs backdrop-blur">{DEMO_BADGE}</span>
        </header>

        <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-6 pb-24 pt-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="v1-rise">
            <div className="mb-8 inline-flex items-center gap-3 rounded-2xl bg-white p-3 shadow-2xl">
              <img src={ARG.logo} alt={`Logo ${ARG.name}`} className="h-14 w-auto" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Schulportal Hessen · Schule {ARG.id}</p>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl xl:text-8xl">
              {ARG.name.split('-').map((p, i) => (
                <span key={p} className="block">{p}{i < 2 ? '-' : ''}</span>
              ))}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">
              Dein Schulportal in {ARG.city}, nur schneller und schöner. Vertretungsplan, Stundenplan und Nachrichten in den Farben deiner Schule.
            </p>
            <div className="mt-10 flex flex-wrap gap-6">
              {MOCK.stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-black">{s.value}</div>
                  <div className="text-xs uppercase tracking-widest text-white/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="v1-rise rounded-3xl border border-white/30 bg-white/15 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop-blur-2xl" style={{ animationDelay: '.2s' }}>
            <h2 className="text-2xl font-bold">Anmelden</h2>
            <p className="mt-1 text-sm text-white/80">Mit deinen Schulportal-Daten. Wir speichern kein Passwort.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 text-neutral-800">
                <img src={ARG.logo} alt="" className="h-7 w-auto" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-semibold">{ARG.name}</div>
                  <div className="text-xs text-neutral-500">{ARG.city} · ID {ARG.id}</div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>vorausgewählt</span>
              </div>
              <div className="rounded-xl bg-white/20 px-4 py-3 text-sm text-white/70">Benutzername</div>
              <div className="rounded-xl bg-white/20 px-4 py-3 text-sm text-white/70">Passwort</div>
            </div>
            <a href={ARG.loginUrl} className="mt-5 block rounded-xl bg-white py-3.5 text-center text-base font-bold shadow-lg transition hover:scale-[1.02]" style={{ color: c.border }}>
              Weiter zum Login →
            </a>
            <a href="/demo" className="mt-3 block text-center text-sm text-white/80 underline-offset-4 hover:underline">Erst die Demo ansehen</a>
          </aside>
        </div>

        <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-white/20 bg-black/40 py-3 text-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6">
            <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs font-black" style={{ color: c.border }}>HEUTE</span>
            <div className="flex gap-8 overflow-hidden whitespace-nowrap text-white/90">
              {MOCK.substitutions.map((s) => (
                <span key={s.period + s.subject}><b>{s.period}. Std {s.subject}</b> · {s.status}{s.note ? ` (${s.note})` : ''}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Alles, was dein Schulalltag braucht.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK.features.map((f, i) => (
            <div key={f.title} className="bg-neutral-950 p-8 transition hover:bg-neutral-900">
              <div className="mb-6 text-sm font-black" style={{ color: c.bg }}>0{i + 1}</div>
              <h3 className="text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-neutral-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 pb-28 pt-10 text-center text-sm" style={{ background: c.footer, color: c.text }}>
        Inoffizielle Oberfläche für das Schulportal Hessen · {ARG.name}, {ARG.city} · <a href="/impressum" className="underline">Impressum</a>
      </footer>
    </div>
  );
};

export default SchoolV1;

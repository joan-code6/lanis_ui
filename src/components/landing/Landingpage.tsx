import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../seo/SEO';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

/* ─── Scroll-Reveal Helper ─── */

const Reveal: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({ delay = 0, children, className = '' }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ─── Feature Row ─── */

const FeatureRow: React.FC<{
  label: string; title: string; desc: string; reversed?: boolean; delay?: number; imagePath?: string; children?: React.ReactNode;
}> = ({ label, title, desc, reversed, delay = 0, imagePath, children }) => (
  <Reveal delay={delay}>
    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
      <div className="flex-1">
        <div className="text-[10px] text-primary-600 dark:text-primary-400 tracking-[0.2em] uppercase mb-3 font-medium">{label}</div>
        <h3 className="text-2xl md:text-3xl font-bold text-[#111] dark:text-surface-100 tracking-tight mb-3">{title}</h3>
        <p className="text-[15px] text-[#666] dark:text-surface-400 leading-relaxed max-w-md">{desc}</p>
      </div>
      <div className="flex-1 w-full">
        <div className="w-full aspect-[4/3] rounded-3xl bg-[#f5f5f2] dark:bg-surface-900 border border-black/[0.03] dark:border-white/[0.07] flex items-center justify-center overflow-hidden">
          {imagePath ? (
            <div className="w-full h-full select-none"><img src={imagePath} alt={title} className="w-full h-full object-cover" /></div>
          ) : children}
        </div>
      </div>
    </div>
  </Reveal>
);

/* ─── Stat Tile ─── */

const Stat: React.FC<{ value: string; label: string; delay?: number }> = ({ value, label, delay = 0 }) => (
  <Reveal delay={delay}>
    <div className="p-6 rounded-2xl bg-white dark:bg-surface-900 border border-black/[0.04] dark:border-white/[0.07] text-center shadow-sm dark:shadow-none">
      <div className="text-3xl font-bold text-[#111] dark:text-surface-100 tracking-tight mb-1">{value}</div>
      <div className="text-[12px] text-[#999] dark:text-surface-500">{label}</div>
    </div>
  </Reveal>
);

/* ─── Mockup: Stundenplan mit Hausaufgaben (Design aus Timetable.tsx) ─── */

const TimetableMock: React.FC = () => (
  <div className="w-full h-full p-4 sm:p-8 flex items-center justify-center">
    <section className="card !p-0 overflow-hidden w-full max-w-sm ring-2 ring-primary-500/10 !border-primary-300 dark:!border-primary-700">
      <div className="border-b px-4 py-3 bg-primary-50 dark:bg-primary-950/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-surface-900 dark:text-white">Montag</h2>
          <span className="badge badge-primary">Heute</span>
        </div>
        <p className="mt-0.5 text-xs text-surface-500">24. August</p>
      </div>
      <div className="space-y-2 p-3">
        <article className="rounded-xl border p-3 bg-white dark:bg-surface-900">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-surface-900 dark:text-white">Mathematik</p>
              <p className="text-xs text-surface-500">GK</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="badge badge-surface">1–2 Std.</span>
            </div>
          </div>
          <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
            <p className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" />08:00 – 09:30</p>
            <p className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />Wb</p>
            <p className="flex items-center gap-1.5"><MapPinIcon className="h-3.5 w-3.5" />A12</p>
          </div>
          <div className="mt-3 p-2.5 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/35">
            <div className="flex items-center justify-between gap-1 font-semibold uppercase tracking-wide text-[10px] text-amber-800 dark:text-amber-200">
              <span className="flex items-center gap-1"><BookOpenIcon className="h-3.5 w-3.5" />Hausaufgabe · nächste Stunde</span>
              <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-300">Offen</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-amber-950 dark:text-amber-100">S. 34, Nr. 3–5</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
);

/* ─── Mockup: Push-Benachrichtigungen ─── */

const NotificationsMock: React.FC = () => (
  <div className="w-full h-full p-4 sm:p-8 flex flex-col items-center justify-center gap-2.5">
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-surface-900 border border-black/[0.05] dark:border-white/[0.08] shadow-soft-md p-3.5 flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
        <ChatBubbleLeftRightIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#111] dark:text-surface-100">Lanis</span>
          <span className="text-[10px] text-[#999] dark:text-surface-500">jetzt</span>
        </div>
        <div className="text-xs font-medium text-[#333] dark:text-surface-200 mt-0.5">Neue Nachricht von Frau Weber</div>
        <div className="text-[11px] text-[#888] dark:text-surface-500 truncate">Elternabend morgen, 19 Uhr, Aula …</div>
      </div>
    </div>
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-surface-900 border border-black/[0.05] dark:border-white/[0.08] shadow-soft-md p-3.5 flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
        <ArrowPathIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#111] dark:text-surface-100">Lanis</span>
          <span className="text-[10px] text-[#999] dark:text-surface-500">vor 12 Min.</span>
        </div>
        <div className="text-xs font-medium text-[#333] dark:text-surface-200 mt-0.5">Vertretungsplan geändert</div>
        <div className="text-[11px] text-[#888] dark:text-surface-500 truncate">5. Stunde: Mathe entfällt · Hr. Müller</div>
      </div>
    </div>
    <div className="text-[10px] text-[#aaa] dark:text-surface-500 mt-1">Web-Push · auch ohne offenen Tab</div>
  </div>
);

/* ─── Landingpage ─── */

const Landingpage: React.FC = () => {
  const navigate = useNavigate();
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => { setHeroVisible(true); }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouch = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onEnd = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="min-h-screen bg-[#fcfcf9] dark:bg-surface-950 text-[#1a1a1a] dark:text-surface-100 overflow-x-hidden transition-colors duration-300">
      <SEO
        title="Lanis | Das Schulportal Hessen, neu gedacht"
        description="Lanis ist die modernere, inoffizielle Oberfläche für das Schulportal Hessen: Hausaufgaben direkt im Stundenplan, Push-Benachrichtigungen und Ladezeiten unter 50 Millisekunden."
        path="/"
      />

      <div className="relative z-10">
        {/* ═══ Navigation ═══ */}
        <nav className="flex items-center justify-between px-6 py-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img src="/favicon/android-chrome-192x192.png" alt="Lanis" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-semibold text-[#555] dark:text-surface-300 tracking-tight">Lanis</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] dark:bg-surface-100 hover:bg-[#333] dark:hover:bg-white text-white dark:text-surface-900 text-xs font-semibold transition-all duration-300 active:scale-[0.97]"
          >
            Login
          </button>
        </nav>

        {/* ═══ Hero ═══ */}
        <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-16">
          <h1 className={`text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tighter leading-[0.95] max-w-4xl transition-all duration-1000 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Schulportal 2.0
            <span className="text-primary-500 block">modern und verlässlich</span>
          </h1>
          <p className={`mt-6 text-[#666] dark:text-surface-400 text-lg max-w-xl leading-relaxed transition-all duration-1000 delay-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.
          </p>
          <div className={`flex gap-3 mt-8 transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={() => navigate('/login')}
              className="px-7 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] shadow-[0_4px_16px_rgb(var(--color-primary-500)/0.25)]"
            >
              Jetzt nutzen
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="px-7 py-3.5 rounded-xl bg-white dark:bg-surface-900 hover:bg-[#f5f5f5] dark:hover:bg-surface-800 text-[#555] dark:text-surface-300 font-medium text-sm transition-all duration-300 border border-black/[0.06] dark:border-white/[0.08] shadow-sm dark:shadow-none"
            >
              Demo ansehen
            </button>
          </div>
        </section>

        {/* ═══ Comparison Slider ═══ */}
        <section id="compare" className="max-w-6xl mx-auto px-6 pb-10">
          <Reveal delay={150}>
            <div
              ref={containerRef}
              className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-[#f5f5f2] dark:bg-surface-900 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_50px_-16px_rgba(0,0,0,0.65)]"
            >
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img
                  src="/landing/lanis-dashboard.png"
                  alt="Lanis UI Dashboard"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                <img
                  src="/landing/sph-dashboard.png"
                  alt="Schulportal Hessen Dashboard"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#1a1a1a] dark:bg-white/80 shadow-[0_0_16px_rgba(0,0,0,0.1)] cursor-ew-resize z-20"
                style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 z-30 cursor-ew-resize group"
                style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)' }}
                onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
              >
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                    <rect x="7.5" y="2" width="1" height="12" rx="0.5" fill="currentColor" fillOpacity="0.5" />
                    <path d="M5 8L7.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M11 8L8.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 5.5L4 8L6 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 5.5L12 8L10 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══ Stats bar ═══ */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat value="47 ms" label="Ladezeit aus dem Cache" delay={100} />
            <Stat value="6" label="Farbthemen" delay={200} />
            <Stat value="3" label="Klicks bis zu jedem Modul" delay={300} />
          </div>
        </section>

        {/* ═══ Feature Rows ═══ */}
        <section className="max-w-6xl mx-auto px-6 pb-32 space-y-32">
          <FeatureRow
            label="Hausaufgaben"
            title="Steht direkt im Stundenplan"
            desc="An jeder Stunde siehst du auf einen Blick, welche Aufgaben anstehen. Erledigtes häkst du direkt ab, ein umständlicher Blick in „Mein Unterricht“ ist nicht mehr nötig."
            delay={200}
          >
            <TimetableMock />
          </FeatureRow>
          <FeatureRow
            label="Benachrichtigungen"
            title="Nichts mehr verpassen"
            desc="Neue Nachricht oder geänderter Vertretungsplan? Lanis schickt dir eine Web-Push-Benachrichtigung, sobald etwas Wichtiges passiert, auch wenn du die Seite gerade nicht offen hast. Einmal in den Einstellungen aktivieren, fertig."
            reversed
            delay={300}
          >
            <NotificationsMock />
          </FeatureRow>
          <FeatureRow
            imagePath="/landing/loading-screen.png"
            label="Tempo"
            title="Sofort da"
            desc="Besuchte Seiten sind dank intelligentem Caching in unter 50 Millisekunden wieder da. Kein Warten, keine Ladeanzeigen. Einfach weitermachen."
            delay={400}
          />
          <FeatureRow
            imagePath="/landing/themes.png"
            label="Design"
            title="Modern statt Behörde"
            desc="Dark Mode, sechs sorgfältig abgestimmte Farbthemen und klare Typografie: Lanis fühlt sich an wie moderne Software und nicht wie ein Formular der Verwaltung."
            reversed
            delay={500}
          />
          <FeatureRow
            imagePath="/landing/navigation.png"
            label="Navigation"
            title="Alles griffbereit"
            desc="Direkte Sidebar statt verschachtelter Menüs, globale Suche und anpinnbare Module: Du kommst in höchstens drei Klicks zu jedem Modul, ganz ohne Suchen."
            delay={600}
          />
        </section>

        {/* ═══ Bottom CTA ═══ */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <Reveal>
            <div className="rounded-3xl bg-[#f5f5f2] dark:bg-surface-900 border border-black/[0.04] dark:border-white/[0.07] p-10 md:p-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#111] dark:text-surface-100 tracking-tight mb-3">
                Überzeug dich selbst
              </h2>
              <p className="text-[#888] dark:text-surface-500 text-sm max-w-md mx-auto mb-8">
                Melde dich einfach mit deinem bestehenden Schulportal-Account an.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-9 py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] shadow-[0_4px_20px_rgb(var(--color-primary-500)/0.25)]"
              >
                Jetzt einloggen
              </button>
            </div>
          </Reveal>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="max-w-6xl mx-auto px-6 pb-12 text-center flex items-center justify-center gap-4">
          <Link to="/impressum" className="text-[11px] text-[#bbb] dark:text-surface-500 hover:text-[#888] dark:hover:text-surface-300 transition-colors">
            Impressum
          </Link>
          <Link to="/privacy-policy" className="text-[11px] text-[#bbb] dark:text-surface-500 hover:text-[#888] dark:hover:text-surface-300 transition-colors">
            Datenschutz
          </Link>
          <Link to="/set-custom-backend" className="text-[11px] text-[#bbb] dark:text-surface-500 hover:text-[#888] dark:hover:text-surface-300 transition-colors">
            Eigenes Backend
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Landingpage;

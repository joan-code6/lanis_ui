import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../seo/SEO';

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
  label: string; title: string; desc: string; reversed?: boolean; delay?: number; imagePath: string;
}> = ({ label, title, desc, reversed, delay = 0, imagePath }) => (
  <Reveal delay={delay}>
    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
      <div className="flex-1">
        <div className="text-[10px] text-[#00a0c0]/50 tracking-[0.2em] uppercase mb-3 font-medium">{label}</div>
        <h3 className="text-2xl md:text-3xl font-bold text-[#111] tracking-tight mb-3">{title}</h3>
        <p className="text-[15px] text-[#666] leading-relaxed max-w-md">{desc}</p>
      </div>
      <div className="flex-1 w-full">
        <div className="w-full aspect-[4/3] rounded-3xl bg-[#f5f5f2] border border-black/[0.03] flex items-center justify-center overflow-hidden">
          <div className="text-6xl select-none"><img src={imagePath} alt={title} /></div>
        </div>
      </div>
    </div>
  </Reveal>
);

/* ─── Stat Tile ─── */

const Stat: React.FC<{ value: string; label: string; delay?: number }> = ({ value, label, delay = 0 }) => (
  <Reveal delay={delay}>
    <div className="p-6 rounded-2xl bg-white border border-black/[0.04] text-center shadow-sm">
      <div className="text-3xl font-bold text-[#111] tracking-tight mb-1">{value}</div>
      <div className="text-[12px] text-[#999]">{label}</div>
    </div>
  </Reveal>
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
    <div className="min-h-screen bg-[#fcfcf9] text-[#1a1a1a] font-['Outfit',sans-serif] overflow-x-hidden">
      <SEO
        title="Lanis | Moderne Benutzeroberfläche für das Schulportal Hessen"
        description="Lanis ist eine moderne, inoffizielle Benutzeroberfläche für das Schulportal Hessen. Übersichtlich, schnell und zuverlässig — für den hessischen Schulalltag."
        path="/"
      />
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vh] bg-gradient-to-bl from-[#00c0e0]/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-0 w-[45vw] h-[45vh] bg-gradient-to-tr from-[#00c0e0]/[0.02] to-transparent" />
        <div className="absolute top-1/2 left-1/2 w-[30vw] h-[30vw] bg-gradient-to-tl from-blue-500/[0.015] to-transparent -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10">
        {/* ═══ Navigation ═══ */}
        <nav className="flex items-center justify-between px-6 py-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img src="/favicon/android-chrome-192x192.png" alt="Lanis" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-semibold text-[#555] tracking-tight">Lanis</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#333] text-white text-xs font-semibold transition-all duration-300 active:scale-[0.97]"
          >
            Login
          </button>
        </nav>

        {/* ═══ Hero ═══ */}
        <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-16">
          <h1 className={`text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tighter leading-[0.95] max-w-4xl transition-all duration-1000 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Schulportal 2.0
            <span className="text-[#00c0e0] block">modern und verlässlich</span>
          </h1>
          <p className={`mt-6 text-[#666] text-lg max-w-xl leading-relaxed transition-all duration-1000 delay-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.
          </p>
          <div className={`flex gap-3 mt-8 transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={() => navigate('/login')}
              className="px-7 py-3.5 rounded-xl bg-[#00c0e0] hover:bg-[#00d8f8] text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] shadow-[0_4px_16px_rgba(0,192,224,0.2)]"
            >
              Jetzt nutzen
            </button>
            <button
              onClick={() => navigate('/demo')} 
              className="px-7 py-3.5 rounded-xl bg-white hover:bg-[#f5f5f5] text-[#555] font-medium text-sm transition-all duration-300 border border-black/[0.06] shadow-sm"
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
              className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-black/[0.06] bg-[#f5f5f2] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]"
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
                className="absolute top-0 bottom-0 w-0.5 bg-[#1a1a1a] shadow-[0_0_16px_rgba(0,0,0,0.1)] cursor-ew-resize z-20"
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
            <Stat value="47ms" label="Ladezeit (Cache)" delay={100} />
            <Stat value="6" label="Farbthemen" delay={200} />
            <Stat value="3 Klick" label="zu jedem Modul" delay={300} />
          </div>
        </section>

        {/* ═══ Feature Rows ═══ */}
        <section className="max-w-6xl mx-auto px-6 pb-32 space-y-32">
          <FeatureRow
            imagePath="/landing/loading-screen.png"
            label="Performance"
            title="Sofort da"
            desc="Dank intelligentem Caching laden bereits besuchte Seiten in unter 50 Millisekunden. Kein Warten, kein Spinner - einfach weitermachen."
            delay={200}
          />
          <FeatureRow
            imagePath="/landing/themes.png"
            label="Design"
            title="Für Menschen gemacht"
            desc="Dark Mode, sechs sorgfältig abgestimmte Farbthemen, klare Typografie und ein Interface, das sich wie moderne Software anfühlt - nicht wie ein Behördenformular."
            reversed
            delay={300}
          />
          <FeatureRow
            imagePath="/landing/navigation.png"
            label="Navigation"
            title="Ohne Suchen finden"
            desc="Statt durch verschachtelte Menüs zu klicken: Sidebar mit direktem Zugriff, globale Suche und anheftbare Module. Alles ist maximal drei Klicke entfernt."
            delay={400} 
          />
        </section>

        {/* ═══ Bottom CTA ═══ */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <Reveal>
            <div className="rounded-3xl bg-[#f5f5f2] border border-black/[0.04] p-10 md:p-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#111] tracking-tight mb-3">
                Bereit für ein besseres Schulportal-Erlebnis?
              </h2>
              <p className="text-[#888] text-sm max-w-md mx-auto mb-8">
                Einfach mit deinem bestehenden Account einloggen.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-9 py-4 rounded-xl bg-[#00c0e0] hover:bg-[#00d8f8] text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] shadow-[0_4px_20px_rgba(0,192,224,0.2)]"
              >
                Jetzt einloggen
              </button>
            </div>
          </Reveal>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="max-w-6xl mx-auto px-6 pb-12 text-center flex items-center justify-center gap-4">
          <Link to="/impressum" className="text-[11px] text-[#bbb] hover:text-[#888] transition-colors">
            Impressum
          </Link>
          <Link to="/privacy-policy" className="text-[11px] text-[#bbb] hover:text-[#888] transition-colors">
            Datenschutz
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Landingpage;

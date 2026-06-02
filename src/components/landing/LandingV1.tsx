import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OldPortalMockup: React.FC = () => (
  <div className="h-full w-full bg-[#e8ecf1] font-sans text-[13px] text-[#333] overflow-hidden select-none">
    <div className="bg-[#1a3a5c] h-14 flex items-center px-4 gap-4">
      <div className="bg-white/20 rounded w-32 h-7 flex items-center justify-center text-white text-[11px] font-bold tracking-wide">Schulportal</div>
      <div className="flex-1" />
      <div className="flex gap-2">
        <div className="bg-white/15 rounded px-3 py-1 text-white text-[10px]">Hilfe</div>
        <div className="bg-white/15 rounded px-3 py-1 text-white text-[10px]">Logout</div>
      </div>
    </div>
    <div className="flex h-[calc(100%-3.5rem)]">
      <div className="w-40 bg-[#f0f2f5] border-r border-[#d5d8dc] p-3 space-y-1">
        {['Startseite', 'Nachrichten', 'Unterricht', 'Kalender', 'Vertretung', 'Dateien', 'Einstellungen'].map((item, i) => (
          <div key={item} className={`px-2 py-1.5 rounded text-[11px] cursor-pointer ${i === 0 ? 'bg-[#1a3a5c] text-white' : 'text-[#555] hover:bg-[#e0e3e8]'}`}>
            {item}
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white border border-[#d5d8dc] rounded p-3 mb-3">
          <div className="text-[11px] font-bold text-[#1a3a5c] mb-2">Willkommen, Max Mustermann</div>
          <div className="text-[11px] text-[#777]">Klasse 10b — Goethe-Gymnasium Frankfurt</div>
        </div>
        <div className="text-[11px] font-bold text-[#555] mb-2">Ungelesene Nachrichten (3)</div>
        <div className="bg-white border border-[#d5d8dc] rounded overflow-hidden mb-3">
          {[
            ['Hr. Schneider', 'Klausurverschiebung Mathematik', 'gestern'],
            ['Fr. Weber', 'Elternabend 10b', 'vor 3 Tagen'],
            ['Sekretariat', 'Krankmeldung für morgen', 'vor 5 Tagen'],
          ].map(([from, subj, date], i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 text-[11px] ${i < 2 ? 'border-b border-[#eee]' : ''} ${i === 0 ? 'bg-[#f8f9fa] font-medium' : ''}`}>
              <div className="w-5 h-5 rounded-full bg-[#1a3a5c] text-white text-[9px] flex items-center justify-center font-bold shrink-0">{from[0]}{from.split(' ')[1]?.[0] || ''}</div>
              <span className="flex-1 truncate">{subj}</span>
              <span className="text-[#aaa] text-[10px] shrink-0">{date}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] font-bold text-[#555] mb-2">Heutiger Vertretungsplan</div>
        <div className="bg-white border border-[#d5d8dc] rounded overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr] text-[10px] font-bold text-[#777] bg-[#f8f9fa] border-b border-[#ddd]">
            <div className="px-2 py-1.5">Std.</div>
            <div className="px-2 py-1.5">Fach</div>
            <div className="px-2 py-1.5">Vertretung</div>
          </div>
          {[
            ['3-4', 'Mathe', 'Hr. Müller (E24)'],
            ['5-6', 'Englisch', 'entfällt'],
          ].map(([std, fach, vertr], i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr] text-[10px] border-b border-[#f0f0f0] last:border-0">
              <div className="px-2 py-1.5 text-[#555]">{std}</div>
              <div className="px-2 py-1.5">{fach}</div>
              <div className="px-2 py-1.5 text-[#c00]">{vertr}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="absolute bottom-3 right-4 text-[9px] text-[#aaa] bg-white/60 px-2 py-0.5 rounded">Schulportal Hessen v2.1.4</div>
  </div>
);

const NewPortalMockup: React.FC = () => (
  <div className="h-full w-full bg-[#0a0a0a] font-['Outfit',sans-serif] text-[13px] text-[#e5e5e5] overflow-hidden select-none">
    <div className="flex h-full">
      <div className="w-44 bg-[#121212] border-r border-white/[0.06] flex flex-col p-3 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[15px] font-bold">L</div>
          <span className="text-sm font-semibold tracking-tight text-white">Lanis UI</span>
        </div>
        {[
          ['grid', 'Dashboard'],
          ['message', 'Nachrichten'],
          ['book', 'Unterricht'],
          ['calendar', 'Kalender'],
          ['refresh', 'Vertretung'],
        ].map(([icon, label], i) => (
          <div key={label} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${i === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'text-[#888] hover:text-white hover:bg-white/[0.04]'}`}>
            <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${i === 0 ? 'text-emerald-400' : 'opacity-50'}`}>
              {icon === 'grid' && '⊞'}
              {icon === 'message' && '✉'}
              {icon === 'book' && '◈'}
              {icon === 'calendar' && '◷'}
              {icon === 'refresh' && '↻'}
            </div>
            <span>{label}</span>
            {label === 'Nachrichten' && <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full">3</span>}
          </div>
        ))}
        <div className="mt-auto pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-[#666] hover:text-white hover:bg-white/[0.04] cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] flex items-center justify-center font-bold">MM</div>
            <span>Max Mustermann</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-5 overflow-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[#666]">
            <span>⌕</span>
            <span>Module durchsuchen...</span>
            <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>
        <div className="text-xs font-medium text-[#666] mb-3">Angeheftete Module</div>
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            ['Nachrichten', '#4ade80', '✉'],
            ['Mein Unterricht', '#60a5fa', '◈'],
            ['Kalender', '#f472b6', '◷'],
          ].map(([name, color, icon], i) => (
            <div key={name} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:bg-white/[0.05] cursor-pointer transition-colors">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] mb-2" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
              <div className="text-[11px] font-medium text-[#ddd]">{name}</div>
            </div>
          ))}
        </div>
        <div className="text-xs font-medium text-[#666] mb-3">Alle Module</div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            ['Vertretungsplan', '#fbbf24'],
            ['Dateiablage', '#a78bfa'],
            ['Stundenplan', '#fb923c'],
            ['Lernplattform', '#38bdf8'],
            ['Schulessen', '#f87171'],
            ['Zeugnisse', '#34d399'],
          ].map(([name, color], i) => (
            <div key={name} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 hover:bg-white/[0.04] cursor-pointer transition-colors">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] mb-2" style={{ backgroundColor: `${color}10`, color }}>◉</div>
              <div className="text-[11px] font-medium text-[#aaa]">{name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="absolute bottom-3 right-4 text-[9px] text-[#333] bg-[#121212]/80 backdrop-blur px-2 py-0.5 rounded border border-white/[0.04]">Lanis UI v0.1.0</div>
  </div>
);

const LandingV1: React.FC = () => {
  const navigate = useNavigate();
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => { setIsVisible(true); }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
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
    <div className="min-h-screen bg-[#050510] text-white overflow-x-hidden font-['Outfit',sans-serif] selection:bg-emerald-500/40 selection:text-white">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(59,130,246,0.05),transparent)]" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="min-h-[60dvh] flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">

          <h1 className={`text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tighter leading-[0.95] max-w-3xl transition-all duration-1000 delay-100 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Schulportal Hessen.<br />
            <span className="text-[#555]">Einfach besser.</span>
          </h1>
          <p className={`mt-6 text-[#666] text-lg max-w-xl transition-all duration-1000 delay-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Die gleichen Daten, die gleichen Funktionen - nur schneller, klarer und angenehmer zu bedienen.
          </p>
          <button
            onClick={() => navigate('/login')}
            className={`mt-8 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#050510] font-semibold text-sm transition-all duration-300 active:scale-[0.97] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '300ms' }}
          >
            Jetzt ausprobieren
          </button>
        </section>

        {/* Comparison Slider */}
        <section className="px-6 max-w-6xl mx-auto pb-24">
          <div className={`text-center mb-10 transition-all duration-1000 delay-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-[#555] text-sm tracking-wider uppercase">Vergleich</p>
            <p className="text-[#888] text-xs mt-1">Ziehe den Regler um den Unterschied zu sehen</p>
          </div>
          <div
            ref={containerRef}
            className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0a0f] shadow-2xl shadow-black/40 transition-all duration-1000 delay-400 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
          >
            {/* Left - Old Portal */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
              <OldPortalMockup />
            </div>
            {/* Right - New Portal */}
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
              <NewPortalMockup />
            </div>
            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-ew-resize z-20"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            />
            {/* Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 z-30 cursor-ew-resize group"
              style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)' }}
              onMouseDown={handleMouseDown}
              onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#050510]">
                  <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {/* Labels */}
            <div className="absolute bottom-3 left-4 text-[10px] text-white/40 font-medium tracking-wider pointer-events-none z-10">ORIGINAL SCHULPORTAL</div>
            <div className="absolute bottom-3 right-4 text-[10px] text-white/40 font-medium tracking-wider pointer-events-none z-10">LANIS UI</div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="px-6 max-w-5xl mx-auto pb-32">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                label: 'Performance',
                title: 'Sofort geladen',
                desc: 'Aggressive Caching-Strategien sorgen dafur, dass Seiten beim zweiten Besuch in Millisekunden erscheinen. Kein langes Warten mehr.',
                stat: '< 50ms',
                statLabel: 'Ladezeit (Cache)',
                delay: 500,
              },
              {
                label: 'Design',
                title: 'Dunkel & klar',
                desc: 'Dark Mode, sechs Farbthemen, klare Typografie. Kein augenbelastendes Grau-in-Grau von vorgestern.',
                stat: '6',
                statLabel: 'Farbthemen',
                delay: 600,
              },
              {
                label: 'Navigation',
                title: 'Alles ein Klick',
                desc: 'Kein tiefes Menugeklicke. Module per Suche finden, anpinnen, sortieren. Sidebar mit direktem Zugriff auf alles.',
                stat: '3 Klick',
                statLabel: 'zu jedem Modul',
                delay: 700,
              },
            ].map(({ label, title, desc, stat, statLabel, delay }) => (
              <div
                key={label}
                className="group bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${delay}ms`,
                  transitionProperty: 'opacity, transform, background-color, border-color',
                  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <div className="text-[10px] text-emerald-400/60 tracking-widest uppercase mb-3">{label}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-[#666] leading-relaxed mb-6">{desc}</p>
                <div className="pt-4 border-t border-white/[0.04]">
                  <div className="text-2xl font-bold text-white tracking-tight">{stat}</div>
                  <div className="text-[11px] text-[#555] mt-0.5">{statLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 pb-24 text-center">
          <div className={`max-w-lg mx-auto transition-all duration-1000 delay-800 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Keine Installation nötig.</h2>
            <p className="text-[#666] text-sm mb-8">Einfach einloggen. Gleicher Account wie im Schulportal.</p>
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#050510] font-semibold text-sm transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]"
            >
              Los geht&apos;s
            </button>
            <p className="mt-4 text-[11px] text-[#444]">Inoffizielle Benutzeroberfläche.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingV1;

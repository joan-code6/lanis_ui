import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CursorArrowRaysIcon } from '@heroicons/react/24/outline';

type Phase = 'idle' | 'start' | 'grow';

/**
 * Inline live demo: the real /demo app in an iframe. The first tap or click anywhere on it grows
 * the card to fill the screen and then opens /demo, so it feels like the page is taken over.
 * An overlay catches the tap, so the page still scrolls normally over the preview.
 */
const DemoPreview: React.FC = () => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rect, setRect] = useState<DOMRect | null>(null);

  const open = () => {
    if (phase !== 'idle' || !cardRef.current) return;
    setRect(cardRef.current.getBoundingClientRect());
    setPhase('start');
  };

  useEffect(() => {
    if (phase !== 'start') return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('grow')));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'grow') return;
    const t = window.setTimeout(() => navigate('/demo/dashboard'), 480);
    return () => window.clearTimeout(t);
  }, [phase, navigate]);

  const expanding = phase !== 'idle' && rect;
  const style: React.CSSProperties = expanding
    ? phase === 'start'
      ? { position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 60 }
      : { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 60, borderRadius: 0 }
    : {};

  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#111] dark:text-surface-100 tracking-tight mb-2">
          Erst reinschauen?
        </h2>
        <p className="text-[#888] dark:text-surface-500 text-sm">
          Das ist die echte Demo mit Beispieldaten. Tipp einfach rein.
        </p>
      </div>
      {/* Placeholder keeps the layout stable while the card is fixed to the viewport */}
      <div className="h-[520px] md:h-[600px]">
        <div
          ref={cardRef}
          style={style}
          className={`relative overflow-hidden rounded-3xl bg-[#f5f5f2] dark:bg-surface-900 border border-black/[0.06] dark:border-white/[0.08] shadow-xl ${expanding ? 'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]' : 'h-full w-full'}`}
        >
          <iframe
            src="/demo/dashboard"
            title="Lanis Demo"
            tabIndex={-1}
            loading="lazy"
            className="h-full w-full border-0 bg-white dark:bg-surface-950"
          />
          <button
            type="button"
            onClick={open}
            aria-label="Demo öffnen"
            className="group absolute inset-0 cursor-pointer bg-transparent"
          >
            <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgb(var(--color-primary-500)/0.35)] transition-opacity duration-300 ${expanding ? 'opacity-0' : 'opacity-100'}`}>
              <CursorArrowRaysIcon className="h-4 w-4" />
              Ausprobieren
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default DemoPreview;

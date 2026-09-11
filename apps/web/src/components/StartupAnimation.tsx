import React, { useEffect, useState } from 'react';

/**
 * Polished, restrained application startup animation.
 * Target duration: ~1.2s. Respects prefers-reduced-motion and session state.
 */
export const StartupAnimation: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    try {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const alreadyShown = typeof window !== 'undefined' && sessionStorage.getItem('supplyguard_init_shown');
      return !prefersReducedMotion && !alreadyShown;
    } catch {
      return false;
    }
  });
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible) return;

    try {
      sessionStorage.setItem('supplyguard_init_shown', 'true');
    } catch {
      // ignore
    }

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 1300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-surface transition-opacity duration-300 pointer-events-none ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Constellation Nodes */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Center Hub */}
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse shadow-[0_0_16px_rgba(111,238,201,0.6)]" />
          </div>
          {/* Orbital Nodes */}
          <div className="absolute top-1 left-4 w-2.5 h-2.5 rounded-full bg-primary/70 animate-ping" />
          <div className="absolute bottom-2 right-4 w-2.5 h-2.5 rounded-full bg-warning/80" />
          <div className="absolute top-8 right-1 w-2 h-2 rounded-full bg-critical/80" />
          <div className="absolute bottom-6 left-1 w-2 h-2 rounded-full bg-primary/60" />

          {/* Connected Threads SVG */}
          <svg className="absolute inset-0 w-full h-full stroke-primary/30" strokeWidth="1">
            <line x1="48" y1="48" x2="24" y2="10" />
            <line x1="48" y1="48" x2="76" y2="80" />
            <line x1="48" y1="48" x2="88" y2="36" />
            <line x1="48" y1="48" x2="10" y2="64" />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.5c2.48 0 4.5 2.02 4.5 4.5s-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5 2.02-4.5 4.5-4.5z" />
          </svg>
          <span className="font-headline-md font-bold text-xl tracking-tight text-on-surface">
            Supply<span className="text-primary">Guard</span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="font-code-sm text-[11px] text-outline uppercase tracking-widest">
            Initializing Dependency Engine
          </span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DependencyConstellation3D } from '../components/DependencyConstellation3D';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 h-16 border-b border-outline-variant/30 bg-surface/85 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/40 flex items-center justify-center text-primary">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.5c2.48 0 4.5 2.02 4.5 4.5s-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5 2.02-4.5 4.5-4.5z" />
            </svg>
          </div>
          <div>
            <span className="font-headline-md font-bold text-lg tracking-tight text-on-surface">
              Supply<span className="text-primary">Guard</span>
            </span>
            <span className="ml-2.5 px-2 py-0.5 rounded text-[10px] font-code-sm uppercase bg-surface-container-high border border-outline-variant text-on-surface-variant">
              Enterprise Platform
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {user ? (
            <button
              onClick={() => navigate('/app')}
              className="px-4 py-1.5 rounded bg-primary text-on-primary font-headline-sm text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Open SupplyGuard</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/signin"
                className="px-3.5 py-1.5 rounded text-sm font-medium text-on-surface hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 rounded bg-primary text-on-primary font-headline-sm text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative px-6 pt-16 pb-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12">
        {/* Left Column: Value Proposition */}
        <div className="flex-1 text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-[12px] font-code-sm text-on-surface">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Enterprise Software Supply Chain Security</span>
          </div>

          <h1 className="font-headline-md font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-on-surface leading-[1.1]">
            See the risks hidden in your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-fixed to-secondary">
              software supply chain.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            SupplyGuard analyzes software dependencies, security signals, and package relationships
            to help engineering and security teams identify and prioritize supply-chain risk.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-3 rounded-lg bg-primary text-on-primary font-headline-sm text-base font-semibold hover:bg-primary-container transition-all shadow-[0_0_24px_rgba(111,238,201,0.25)] flex items-center gap-2.5"
              >
                <span>Open Dashboard</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <Link
                to="/signup"
                className="px-6 py-3 rounded-lg bg-primary text-on-primary font-headline-sm text-base font-semibold hover:bg-primary-container transition-all shadow-[0_0_24px_rgba(111,238,201,0.25)] flex items-center gap-2.5"
              >
                <span>Get Started</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            <a
              href="#platform-overview"
              className="px-5 py-3 rounded-lg bg-surface-container border border-outline-variant hover:border-primary/50 text-on-surface font-headline-sm text-base font-medium transition-all"
            >
              Explore Platform
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 grid grid-cols-3 gap-6 border-t border-outline-variant/30 text-left">
            <div>
              <div className="font-headline-md font-bold text-2xl text-on-surface">100%</div>
              <div className="text-[12px] text-on-surface-variant font-code-sm uppercase tracking-wider">
                Full-Tree Traversal
              </div>
            </div>
            <div>
              <div className="font-headline-md font-bold text-2xl text-primary">CycloneDX</div>
              <div className="text-[12px] text-on-surface-variant font-code-sm uppercase tracking-wider">
                v1.5 JSON SBOM
              </div>
            </div>
            <div>
              <div className="font-headline-md font-bold text-2xl text-tertiary">0-100</div>
              <div className="text-[12px] text-on-surface-variant font-code-sm uppercase tracking-wider">
                Contextual Scoring
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Dependency Constellation Visual */}
        <div className="flex-1 w-full max-w-xl lg:max-w-none">
          <DependencyConstellation3D />
        </div>
      </section>

      {/* ── Platform Architecture & Capabilities ── */}
      <section id="platform-overview" className="py-20 px-6 bg-surface-container-lowest/50 border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="font-headline-md font-bold text-3xl text-on-surface">
              Engineered for Comprehensive Supply Chain Defense
            </h2>
            <p className="text-on-surface-variant text-sm sm:text-base">
              SupplyGuard transforms deep lockfile trees into actionable threat intelligence, prioritizing
              vulnerabilities by topological blast radius and downstream impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Bento Card 1 */}
            <div className="p-6 rounded-xl bg-surface border border-outline-variant/40 hover:border-primary/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-on-surface">
                Topological Blast Radius
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Calculates true downstream dependent fan-out and depth reachability across nested lockfiles,
                identifying critical hub dependencies.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="p-6 rounded-xl bg-surface border border-outline-variant/40 hover:border-primary/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-on-surface">
                Vulnerability Intelligence
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Real-time correlation against authoritative open vulnerability databases, enriching findings
                with CVSS vectors and verified patched releases.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="p-6 rounded-xl bg-surface border border-outline-variant/40 hover:border-primary/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-on-surface">
                Typosquatting & Signals
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Evaluates Levenshtein distance metrics against standard ecosystem catalogs and detects
                internal namespace collision heuristics.
              </p>
            </div>

            {/* Bento Card 4 */}
            <div className="p-6 rounded-xl bg-surface border border-outline-variant/40 hover:border-primary/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-on-surface">
                CycloneDX v1.5 SBOM
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Cryptographically checksummed software bills of materials with standardized purls, package
                hashes, and embedded vulnerability ratings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Call to Action Banner ── */}
      <section className="py-16 px-6 max-w-5xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-surface-container to-surface border border-outline-variant/50 space-y-6">
          <h2 className="font-headline-md font-bold text-2xl sm:text-3xl text-on-surface">
            Ready to secure your software supply chain?
          </h2>
          <p className="text-on-surface-variant max-w-lg mx-auto text-sm sm:text-base">
            Gain immediate visibility into your dependency posture with automated topology mapping and prioritized remediation.
          </p>
          <div className="pt-2 flex justify-center">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-3 rounded-lg bg-primary text-on-primary font-headline-sm text-base font-semibold hover:bg-primary-container transition-all shadow-[0_0_24px_rgba(111,238,201,0.25)]"
              >
                Open SupplyGuard Workspace
              </button>
            ) : (
              <Link
                to="/signup"
                className="px-6 py-3 rounded-lg bg-primary text-on-primary font-headline-sm text-base font-semibold hover:bg-primary-container transition-all shadow-[0_0_24px_rgba(111,238,201,0.25)]"
              >
                Create Account & Get Started
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-outline-variant/30 py-8 px-6 bg-surface-container-lowest/80 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm font-semibold text-on-surface">SupplyGuard</span>
            <span>•</span>
            <span>Enterprise Software Supply Chain Security Platform</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} SupplyGuard. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quickRepo, setQuickRepo] = useState('https://github.com/acme/store-api');

  const handleLaunchApp = (prefillRepo?: string) => {
    if (user) {
      if (prefillRepo) {
        navigate('/app', { state: { prefillRepo } });
      } else {
        navigate('/app');
      }
    } else {
      navigate('/signin', { state: { returnTo: '/app', prefillRepo } });
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary">
      {/* Universal Top Navigation */}
      <header className="sticky top-0 z-50 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-variant flex items-center justify-between px-margin-md lg:px-margin-lg">
        <div className="flex items-center gap-space-lg">
          <Link to="/" className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg bg-surface-container border border-primary-container/40 flex items-center justify-center text-primary-container group-hover:border-primary-container transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              Supply<span className="text-primary-container font-bold">Guard</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-code-sm uppercase tracking-wider bg-surface-container-high border border-surface-variant text-outline">
              PS14 • Kurukshetra 2.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-space-md text-body-sm font-medium text-on-surface-variant">
            <a href="#how-it-works" className="hover:text-primary-container transition-colors">How It Works</a>
            <a href="#capabilities" className="hover:text-primary-container transition-colors">Capabilities</a>
            <a href="#preview" className="hover:text-primary-container transition-colors">Product Preview</a>
          </nav>
        </div>

        <div className="flex items-center gap-space-sm">
          {user ? (
            <div className="flex items-center gap-space-sm">
              <span className="text-body-sm text-outline hidden sm:inline">
                {user.user_metadata?.full_name || user.email}
              </span>
              <button
                onClick={() => handleLaunchApp()}
                className="flex items-center gap-space-xs px-space-md py-1.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-[13px] rounded-lg transition-all shadow-sm font-bold cursor-pointer"
              >
                <span>Launch SupplyGuard</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-space-sm">
              <Link
                to="/signin"
                className="px-space-md py-1.5 text-on-surface-variant hover:text-on-surface font-headline-sm text-[13px] rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-space-md py-1.5 bg-surface-container border border-surface-variant hover:border-primary-container/50 text-on-surface font-headline-sm text-[13px] rounded-lg transition-colors hidden sm:inline-block"
              >
                Sign Up
              </Link>
              <button
                onClick={() => handleLaunchApp()}
                className="flex items-center gap-space-xs px-space-md py-1.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-[13px] rounded-lg transition-all shadow-sm font-bold cursor-pointer"
              >
                <span>Launch SupplyGuard</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* Dynamic Atmospheric Glows */}
        <div className="relative w-full overflow-hidden px-margin-md lg:px-margin-lg pt-space-2xl pb-space-2xl">
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 right-0 w-[32rem] h-[32rem] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none"></div>

          {/* Hero Split Grid */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-center relative z-10">
            {/* Left Column: Mission Narrative & Direct Action */}
            <div className="lg:col-span-6 flex flex-col gap-space-lg">
              <div className="inline-flex items-center gap-space-xs self-start px-space-sm py-1 bg-surface-container-high border border-surface-variant rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping"></span>
                <span className="font-label-caps text-label-caps uppercase text-primary-container tracking-wider">
                  PS14 Supply Chain Defense • Kurukshetra 2.0
                </span>
              </div>

              <h1 className="font-display-lg text-3xl sm:text-4xl lg:text-5xl text-on-surface font-bold tracking-tight leading-tight">
                Know what's <span className="text-primary-container">really inside</span> your dependencies.
              </h1>

              <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
                Map your software supply chain, uncover known vulnerabilities and suspicious dependency signals, and fix the risks that matter most.
              </p>

              {/* Direct Scan Input Bar */}
              <div className="flex flex-col gap-space-xs p-space-sm bg-surface-container-low border border-surface-variant rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row gap-space-xs items-stretch sm:items-center">
                  <div className="relative flex-1 flex items-center bg-surface-dim border border-surface-variant/70 rounded-lg px-space-sm py-2">
                    <span className="material-symbols-outlined text-outline text-[20px] mr-2 shrink-0">account_tree</span>
                    <input
                      className="w-full bg-transparent font-code-md text-code-md text-on-surface focus:outline-none placeholder:text-outline"
                      value={quickRepo}
                      onChange={(e) => setQuickRepo(e.target.value)}
                      placeholder="https://github.com/org/repo"
                    />
                    <button
                      onClick={() => setQuickRepo('https://github.com/torvalds/linux')}
                      className="font-code-sm text-[11px] text-outline hover:text-primary-container transition-colors ml-1 px-1.5 py-0.5 bg-surface-container-highest rounded border border-surface-variant"
                      title="Use demo target"
                      type="button"
                    >
                      DEMO
                    </button>
                  </div>
                  <button
                    onClick={() => handleLaunchApp(quickRepo)}
                    className="flex items-center justify-center gap-space-xs px-space-lg py-2.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-sm rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] font-bold shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">radar</span>
                    <span>Start Scanning</span>
                  </button>
                </div>

                <div className="flex items-center justify-between px-space-xs pt-1 text-on-surface-variant text-[12px] font-code-sm">
                  <span className="flex items-center gap-1 text-outline">
                    <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                    Zero-token ingestion via GitHub REST API
                  </span>
                  <span className="text-primary-container">Supported: npm v7+ package-lock.json</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-space-md pt-space-xs">
                <button
                  onClick={() => handleLaunchApp()}
                  className="flex items-center gap-space-xs px-space-xl py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-base rounded-lg font-bold shadow-md transition-all hover:scale-[1.01]"
                >
                  <span>Launch SupplyGuard</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
                <a
                  href="#capabilities"
                  className="flex items-center gap-space-xs px-space-lg py-3 bg-surface-container border border-surface-variant hover:border-outline text-on-surface font-headline-sm text-base rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">explore</span>
                  <span>Explore Capabilities</span>
                </a>
              </div>
            </div>

            {/* Right Column: Risk Constellation Visual Preview */}
            <div className="lg:col-span-6 relative">
              <div className="relative p-space-md bg-surface-container-low border border-surface-variant rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-variant text-outline font-code-sm text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-critical animate-ping"></span>
                    <span className="text-on-surface font-semibold">Risk Constellation Topology Preview</span>
                  </div>
                  <span className="text-primary-container font-mono">DIRECTED GRAPH CLUSTER</span>
                </div>

                {/* SVG Visual Constellation */}
                <div className="relative h-72 sm:h-80 w-full bg-surface-dim rounded-lg border border-surface-variant/60 flex items-center justify-center p-4">
                  <svg className="w-full h-full" viewBox="0 0 500 300">
                    <defs>
                      <filter id="glow-teal" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-crimson" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Dependency Edges */}
                    <line x1="120" y1="150" x2="250" y2="70" stroke="#2a3550" strokeWidth="2" strokeDasharray="3,3" />
                    <line x1="120" y1="150" x2="250" y2="150" stroke="#ff4d6a" strokeWidth="2" strokeOpacity="0.8" />
                    <line x1="120" y1="150" x2="250" y2="230" stroke="#2a3550" strokeWidth="2" />
                    <line x1="250" y1="150" x2="380" y2="110" stroke="#ff4d6a" strokeWidth="2.5" />
                    <line x1="250" y1="150" x2="380" y2="190" stroke="#ffd184" strokeWidth="2" />
                    <line x1="250" y1="70" x2="380" y2="50" stroke="#2a3550" strokeWidth="1.5" />

                    {/* Nodes */}
                    {/* Root Application Node */}
                    <circle cx="120" cy="150" r="16" fill="#151b2a" stroke="#6feec9" strokeWidth="3" filter="url(#glow-teal)" />
                    <text x="120" y="154" fill="#6feec9" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">ROOT</text>

                    {/* Direct Deps */}
                    <circle cx="250" cy="70" r="12" fill="#151b2a" stroke="#60a5fa" strokeWidth="2" />
                    <text x="250" y="96" fill="#dde2f6" fontSize="11" fontFamily="Inter" textAnchor="middle">express@4.18.2</text>

                    <circle cx="250" cy="150" r="14" fill="#151b2a" stroke="#ff4d6a" strokeWidth="3" filter="url(#glow-crimson)" />
                    <text x="250" y="178" fill="#ff4d6a" fontSize="11" fontFamily="Inter" textAnchor="middle" fontWeight="bold">lodash@4.17.20</text>

                    <circle cx="250" cy="230" r="10" fill="#151b2a" stroke="#6feec9" strokeWidth="2" />
                    <text x="250" y="254" fill="#dde2f6" fontSize="11" fontFamily="Inter" textAnchor="middle">dotenv@16.4.5</text>

                    {/* Transitive & Flags */}
                    <circle cx="380" cy="110" r="14" fill="#ff4d6a" stroke="#ff4d6a" strokeWidth="2" />
                    <text x="380" y="136" fill="#ff4d6a" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">CVE-2021-23337</text>

                    <circle cx="380" cy="190" r="11" fill="#151b2a" stroke="#ffd184" strokeWidth="2" />
                    <text x="380" y="214" fill="#ffd184" fontSize="11" fontFamily="Inter" textAnchor="middle">reqeusts (Typosquat)</text>

                    <circle cx="380" cy="50" r="8" fill="#151b2a" stroke="#6feec9" strokeWidth="1.5" />
                  </svg>

                  {/* Telemetry Badge Overlay */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-surface-container-high/90 border border-surface-variant rounded-lg backdrop-blur-sm text-xs font-code-sm flex items-center gap-3">
                    <span className="text-outline">Risk Score:</span>
                    <span className="text-risk-critical font-bold">86/100 (CRITICAL)</span>
                    <span className="text-outline">|</span>
                    <span className="text-primary-container">OSV.dev & Typosquat Verified</span>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="mt-space-sm grid grid-cols-3 gap-space-xs text-center">
                  <div className="p-space-xs bg-surface-dim rounded border border-surface-variant">
                    <div className="text-[10px] text-outline font-label-caps uppercase">Vulnerabilities</div>
                    <div className="text-sm font-bold text-risk-critical font-mono">1 Critical • 2 High</div>
                  </div>
                  <div className="p-space-xs bg-surface-dim rounded border border-surface-variant">
                    <div className="text-[10px] text-outline font-label-caps uppercase">Supply Chain</div>
                    <div className="text-sm font-bold text-risk-medium font-mono">1 Typosquat Flag</div>
                  </div>
                  <div className="p-space-xs bg-surface-dim rounded border border-surface-variant">
                    <div className="text-[10px] text-outline font-label-caps uppercase">Dependency Depth</div>
                    <div className="text-sm font-bold text-primary-container font-mono">Level 3 Resolved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: How It Works */}
        <section id="how-it-works" className="py-space-2xl bg-surface-container-lowest border-t border-b border-surface-variant px-margin-md lg:px-margin-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-space-2xl">
              <span className="px-3 py-1 bg-surface-container rounded-full text-primary-container font-label-caps text-xs uppercase tracking-wider border border-surface-variant mb-space-xs">
                Deterministic Pipeline
              </span>
              <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold tracking-tight">
                How SupplyGuard Works
              </h2>
              <p className="text-on-surface-variant max-w-2xl mt-2 text-sm sm:text-base">
                Five-stage automated security analysis pipeline executed securely without running untrusted scripts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-space-md relative">
              {[
                {
                  step: '01',
                  title: 'Connect Repository',
                  desc: 'Specify any public GitHub repository URL, target branch, and manifest subpath.',
                  icon: 'link',
                },
                {
                  step: '02',
                  title: 'Build Dependency Graph',
                  desc: 'Parse package-lock.json into unique dependency instances with exact versions and depth.',
                  icon: 'hub',
                },
                {
                  step: '03',
                  title: 'Analyze Security Signals',
                  desc: 'Cross-reference OSV.dev advisories, Levenshtein typosquatting, and npm reputation signals.',
                  icon: 'security',
                },
                {
                  step: '04',
                  title: 'Calculate Explainable Risk',
                  desc: 'Synthesize a calibrated 0-100 SupplyGuard Risk Score with an itemized factor breakdown.',
                  icon: 'analytics',
                },
                {
                  step: '05',
                  title: 'Prioritize Remediation',
                  desc: 'Generate surgical non-breaking upgrade commands and export standard CycloneDX SBOMs.',
                  icon: 'build_circle',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-space-md bg-surface-container-low border border-surface-variant rounded-xl flex flex-col justify-between hover:border-primary-container/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="font-code-sm text-xs font-bold text-primary-container font-mono">{item.step}</span>
                      <span className="material-symbols-outlined text-outline text-[22px]">{item.icon}</span>
                    </div>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">{item.title}</h3>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Core Capabilities */}
        <section id="capabilities" className="py-space-2xl px-margin-md lg:px-margin-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-space-2xl">
              <span className="px-3 py-1 bg-surface-container rounded-full text-primary-container font-label-caps text-xs uppercase tracking-wider border border-surface-variant mb-space-xs">
                Comprehensive Defense
              </span>
              <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold tracking-tight">
                Core Capabilities
              </h2>
              <p className="text-on-surface-variant max-w-2xl mt-2 text-sm sm:text-base">
                Engineering-grade security insights designed specifically for PS14 Software Supply Chain Security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              <div className="p-space-lg bg-surface-container-low border border-surface-variant rounded-xl flex gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-risk-critical/10 border border-risk-critical/30 flex items-center justify-center text-risk-critical shrink-0">
                  <span className="material-symbols-outlined text-[28px]">bug_report</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-1">Vulnerability Intelligence</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                    Batch queries upstream OSV.dev and GitHub Advisory Database feeds to identify exact CVE IDs, affected version ranges, CVSS scores, and fixed patch releases.
                  </p>
                  <span className="font-code-sm text-xs text-primary-container font-mono">Enriched with fixedIn & CVSS v3 telemetry</span>
                </div>
              </div>

              <div className="p-space-lg bg-surface-container-low border border-surface-variant rounded-xl flex gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-risk-high/10 border border-risk-high/30 flex items-center justify-center text-risk-high shrink-0">
                  <span className="material-symbols-outlined text-[28px]">spellcheck</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-1">Supply-Chain Threat Signals</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                    Levenshtein-distance typosquatting detection against popular packages and heuristics for potential dependency-confusion risks on internal naming conventions.
                  </p>
                  <span className="font-code-sm text-xs text-risk-high font-mono">Similarity scoring & namespace auditing</span>
                </div>
              </div>

              <div className="p-space-lg bg-surface-container-low border border-surface-variant rounded-xl flex gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[28px]">tune</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-1">Explainable Risk Scoring</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                    Transparent prioritization score separating CVE advisory severity from contextual exposure (transitive depth, downstream fan-out reachability, and outdated releases).
                  </p>
                  <span className="font-code-sm text-xs text-primary-container font-mono">Itemized 0-100 rubric with factor breakdown</span>
                </div>
              </div>

              <div className="p-space-lg bg-surface-container-low border border-surface-variant rounded-xl flex gap-space-md">
                <div className="w-12 h-12 rounded-lg bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                  <span className="material-symbols-outlined text-[28px]">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-1">AI-Assisted Remediation</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                    Contextual plain-language explanations of why a dependency is risky, paired with surgical, non-destructive upgrade commands rather than blunt force fixes.
                  </p>
                  <span className="font-code-sm text-xs text-brand-accent font-mono">Safe upgrade commands & fix plans</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Product Preview */}
        <section id="preview" className="py-space-2xl bg-surface-container-lowest border-t border-surface-variant px-margin-md lg:px-margin-lg">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="text-center mb-space-xl">
              <span className="px-3 py-1 bg-surface-container rounded-full text-primary-container font-label-caps text-xs uppercase tracking-wider border border-surface-variant mb-space-xs">
                Mission Control
              </span>
              <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold tracking-tight">
                The SupplyGuard Workspace
              </h2>
              <p className="text-on-surface-variant max-w-xl mt-2 text-sm">
                Interactive graph visualizer, finding detail inspector drawer, and remediation report.
              </p>
            </div>

            <div className="w-full max-w-5xl p-space-md bg-surface-container-low border border-surface-variant rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-variant font-code-sm text-xs text-outline">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
                  <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
                  <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
                  <span className="ml-2 text-on-surface font-mono">SupplyGuard Mission Control — Live Dashboard</span>
                </div>
                <button
                  onClick={() => handleLaunchApp()}
                  className="px-2.5 py-1 bg-primary-container text-on-primary rounded font-bold hover:bg-primary transition-colors text-[11px]"
                >
                  Open Live Dashboard →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
                <div className="md:col-span-8 bg-surface-dim rounded-xl p-4 border border-surface-variant/70 h-64 flex flex-col justify-between">
                  <div className="flex justify-between text-xs text-outline font-code-sm">
                    <span>TOPOLOGY VIEW: FORCE-DIRECTED 2D GRAPH</span>
                    <span className="text-primary-container">143 Nodes • 198 Edges</span>
                  </div>
                  <div className="flex items-center justify-center text-outline text-sm">
                    <span className="material-symbols-outlined text-4xl text-primary-container/40 animate-pulse mr-2">hub</span>
                    <span>Interactive 2D graph with severity filtering and node clustering</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-risk-critical/20 text-risk-critical border border-risk-critical/40">Critical (3)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-risk-high/20 text-risk-high border border-risk-high/40">High (7)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary-container/20 text-primary-container border border-primary-container/40">Safe (128)</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-surface-dim rounded-xl p-4 border border-surface-variant/70 h-64 flex flex-col justify-between">
                  <div className="text-xs text-outline font-code-sm">FINDING INSPECTOR</div>
                  <div>
                    <div className="text-sm font-bold text-on-surface font-mono">lodash@4.17.20</div>
                    <div className="text-xs text-risk-critical font-bold mt-0.5">SupplyGuard Risk: 83/100</div>
                    <div className="text-xs text-on-surface-variant mt-2 line-clamp-3">
                      Regular Expression Denial of Service (ReDoS) and Command Injection vulnerabilities detected in transitive resolution path.
                    </div>
                  </div>
                  <div className="bg-surface-container p-2 rounded text-[11px] font-mono text-primary-container truncate">
                    $ npm install lodash@4.17.21
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Conversion Banner */}
        <section className="py-space-2xl px-margin-md lg:px-margin-lg">
          <div className="max-w-5xl mx-auto p-space-xl bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-low border border-primary-container/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
            <div>
              <h2 className="font-display-lg text-2xl sm:text-3xl font-bold text-on-surface">
                Ready to audit your repository?
              </h2>
              <p className="text-on-surface-variant text-sm mt-1 max-w-lg">
                Enter any public GitHub repo and generate complete supply chain security telemetry in seconds.
              </p>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <button
                onClick={() => handleLaunchApp()}
                className="px-space-xl py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-base rounded-lg font-bold shadow-md transition-all cursor-pointer"
              >
                Scan Your First Project
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-surface-variant py-space-xl px-margin-md lg:px-margin-lg text-xs text-outline">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-col sm:flex-row items-center gap-space-sm">
            <span className="font-bold text-on-surface">SupplyGuard</span>
            <span>•</span>
            <span>PS14 Software Supply Chain Security</span>
            <span>•</span>
            <span className="text-primary-container">Kurukshetra 2.0 National Hackathon</span>
          </div>

          <div className="flex items-center gap-space-md">
            <Link to="/signin" className="hover:text-on-surface transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-on-surface transition-colors">Sign Up</Link>
            <button onClick={() => handleLaunchApp()} className="hover:text-primary-container transition-colors">
              Launch Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

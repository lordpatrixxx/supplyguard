import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getScanHistory } from '../lib/api';
import type { ScanResult } from '../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recent scans for authenticated user
  const { data: scans } = useQuery<ScanResult[]>({
    queryKey: ['scans', user?.id],
    queryFn: async () => {
      try {
        return await getScanHistory();
      } catch (err) {
        console.warn('[AppLayout] Could not load scans:', err);
        return [];
      }
    },
  });

  // Extract scan ID from path if present (e.g. /app/scans/:id/...)
  const scanMatch = location.pathname.match(/\/scans\/([a-zA-Z0-9_-]+)/);
  const currentScanId = scanMatch ? scanMatch[1] : scans && scans.length > 0 ? scans[0].scanId : null;
  const currentScan = scans?.find((s) => s.scanId === currentScanId) || scans?.[0];

  const activeRepoName = currentScan
    ? currentScan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
    : 'SupplyGuard Engine';

  const navItems = [
    {
      label: 'Overview & Scans',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      path: '/app',
      active: location.pathname === '/app',
    },
    {
      label: 'Dependency Graph',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      path: currentScanId ? `/app/scans/${currentScanId}/dashboard` : '/app',
      active: location.pathname.includes('/dashboard'),
    },
    {
      label: 'Findings & Remediation',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      path: currentScanId ? `/app/scans/${currentScanId}/report` : '/app',
      active: location.pathname.includes('/report'),
    },
    {
      label: 'Scan History',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      path: '/app/history',
      active: location.pathname === '/app/history',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (currentScanId) {
      navigate(`/app/scans/${currentScanId}/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/app/history?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* ── Fixed Universal Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-6">
        {/* Left: Brand + Active Repo + Security Intel */}
        <div className="flex items-center gap-4">
          <Link to="/app" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/40 flex items-center justify-center text-primary shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.5c2.48 0 4.5 2.02 4.5 4.5s-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5 2.02-4.5 4.5-4.5z" />
              </svg>
            </div>
            <span className="font-headline-sm text-lg text-on-surface tracking-tight">
              Supply<span className="text-primary font-bold">Guard</span>
            </span>
          </Link>

          <div className="h-5 w-[1px] bg-outline-variant/30"></div>

          {/* Active Context Repo Chip */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-outline-variant/40 rounded-lg">
            <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="font-code-sm text-xs text-on-surface font-medium max-w-[180px] truncate" title={activeRepoName}>
              {activeRepoName}
            </span>
            <span className="font-code-sm text-[11px] text-on-surface-variant">
              (main)
            </span>
          </div>

          {/* Security Intelligence Status Badge */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 bg-surface-container border border-primary/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-code-sm text-[11px] uppercase text-primary font-semibold tracking-wider">
              Security Intelligence: Active
            </span>
          </div>
        </div>

        {/* Middle: Universal Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages, CVEs, or dependencies..."
              className="w-full h-9 bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-9 pr-3 text-on-surface placeholder:text-outline font-code-sm text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </form>
        </div>

        {/* Right: Actions + Theme + User Profile */}
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg transition-colors shadow-sm font-semibold no-underline"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Scan</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
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

          <button
            onClick={() => setShowPolicyModal(true)}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Scoring Policy & Rubric"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </button>

          <div className="h-5 w-[1px] bg-outline-variant/30"></div>

          {/* User Account Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-container rounded-lg border border-outline-variant/40" title={user?.email || 'Engineer'}>
            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-code-sm text-[11px] text-primary font-bold">
              {userInitial}
            </div>
            <span className="font-code-sm text-xs text-on-surface font-medium max-w-[120px] truncate">
              {user?.email ? user.email.split('@')[0] : 'Engineer'}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="p-1.5 text-outline hover:text-critical hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Sign Out"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Fixed Left Sidebar ── */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-low border-r border-outline-variant/30 z-40 flex flex-col justify-between overflow-y-auto">
        <div className="p-4">
          <div className="px-2 pb-2 text-outline font-code-sm text-[10px] uppercase tracking-wider">
            Telemetry &amp; Audit
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors no-underline font-body-md text-sm ${
                  item.active
                    ? 'bg-surface-container-high text-primary border-l-2 border-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => setShowPolicyModal(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-md text-sm transition-colors w-full text-left bg-transparent border-none cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Policy &amp; Rubric</span>
            </button>
          </nav>

          {/* Manifest Integrity Box */}
          <div className="mt-8 px-2 pb-2 text-outline font-code-sm text-[10px] uppercase tracking-wider">
            Manifest Integrity
          </div>
          <div className="flex flex-col gap-1">
            <div className="p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg">
              <div className="flex items-center justify-between text-outline font-code-sm text-xs mb-1.5">
                <span>SBOM Standard</span>
                <span className="text-primary font-code-sm font-semibold">CycloneDX 1.5</span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-full"></div>
              </div>
              <div className="mt-2 font-code-sm text-[11px] text-on-surface-variant truncate">
                SHA-512 Hash Verified
              </div>
            </div>
          </div>
        </div>

        {/* Engine Version Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-lowest">
          <div className="flex items-center justify-between text-outline font-code-sm text-xs">
            <span>Engine: v4.12-sec</span>
            <span className="text-primary font-mono text-[11px]">ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Offset ── */}
      <div className="pl-64">
        <main className="w-full pt-16 min-h-screen bg-background text-on-surface">
          {children}
        </main>
      </div>

      {/* ── Policy & Rules Modal ── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                  Supply-Chain Scoring Rubric
                </h2>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-outline hover:text-on-surface bg-transparent border-none cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm text-on-surface-variant">
              <p>
                SupplyGuard calculates an itemized 0–100 contextual risk score combining advisory severity and topological supply-chain exposure:
              </p>

              <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/30 flex flex-col gap-2 font-code-sm text-xs">
                <div className="flex justify-between text-on-surface">
                  <span>Known vulnerability match:</span>
                  <span className="text-secondary font-bold">+40 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Advisory CVSS weight (scaled):</span>
                  <span className="text-secondary font-bold">up to +15 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Outdated package (&gt;2 yrs stale):</span>
                  <span className="text-tertiary font-bold">+10 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Downstream blast radius (&ge;3 dependents):</span>
                  <span className="text-tertiary font-bold">+8 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Typosquatting indicator (edit dist &le;2):</span>
                  <span className="text-secondary font-bold">+15 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Dependency confusion namespace heuristic:</span>
                  <span className="text-secondary font-bold">+15 pts</span>
                </div>
              </div>

              <div className="p-3 bg-surface-container-high rounded-lg flex items-center justify-between text-xs font-code-sm">
                <span className="text-outline">Score Range</span>
                <span className="text-primary font-semibold">0 (Clean) to 100 (Critical Blast Radius)</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 rounded bg-primary text-on-primary font-headline-sm text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Close Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

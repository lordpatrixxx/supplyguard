import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getScanHistory } from '../lib/api';
import type { ScanResult } from '../types';
import {
  LayoutGrid, Share2, Shield, Clock, Search, Plus, Sun, Moon,
  LogOut, FolderOpen, X, Settings, ShieldCheck, Zap, ShieldAlert, Menu
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      label: 'Repository Intake',
      icon: <LayoutGrid className="w-4 h-4" />,
      path: '/app',
      active: location.pathname === '/app',
    },
    {
      label: 'Dependency Graph',
      icon: <Share2 className="w-4 h-4" />,
      path: currentScanId ? `/app/scans/${currentScanId}/dashboard` : '/app',
      active: location.pathname.includes('/dashboard'),
    },
    {
      label: 'Findings & Remediation',
      icon: <ShieldAlert className="w-4 h-4" />,
      path: currentScanId ? `/app/scans/${currentScanId}/report` : '/app',
      active: location.pathname.includes('/report'),
    },
    {
      label: 'Behavioral Signals',
      icon: <Zap className="w-4 h-4" />,
      path: currentScanId ? `/app/scans/${currentScanId}/behavioral` : '/app/behavioral',
      active: location.pathname.includes('/behavioral'),
    },
    {
      label: 'Scan History',
      icon: <Clock className="w-4 h-4" />,
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

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* ── Fixed Universal Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200">
        {/* Left: Mobile Menu Toggle + Brand + Active Repo Context */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg cursor-pointer bg-transparent border-none"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/app" className="flex items-center gap-2.5 no-underline group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              Supply<span className="text-primary font-bold">Guard</span>
            </span>
          </Link>

          <div className="h-5 w-[1px] bg-outline-variant/30 hidden sm:block" />

          {/* Active Context Repo Chip */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-surface-container border border-outline-variant/40 rounded-lg hover:border-outline-variant transition-colors">
            <FolderOpen className="w-3.5 h-3.5 text-outline" />
            <span
              className="font-mono text-xs text-on-surface font-medium max-w-[160px] lg:max-w-[220px] truncate"
              title={activeRepoName}
            >
              {activeRepoName}
            </span>
            <span className="font-mono text-[11px] text-outline">
              (main)
            </span>
          </div>
        </div>

        {/* Middle: Universal Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              id="universal-search-input"
              name="universalSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages, CVEs, dependencies..."
              className="w-full h-9 bg-surface-container-low border border-outline-variant/40 rounded-lg pl-9 pr-8 text-on-surface placeholder:text-outline font-body-sm text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-outline px-1 rounded bg-surface-container border border-outline-variant/30">
              /
            </span>
          </form>
        </div>

        {/* Right: Actions + Theme + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/app"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-body-sm text-xs rounded-lg transition-all shadow-xs hover:shadow-sm font-semibold no-underline active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Risk Scoring Methodology Trigger */}
          <button
            onClick={() => setShowPolicyModal(true)}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Risk Scoring Methodology"
          >
            <Shield className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-outline-variant/30 hidden sm:block" />

          {/* User Account Pill — links to Profile */}
          <Link
            to="/app/profile"
            className="flex items-center gap-2 px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded-lg border border-outline-variant/40 no-underline transition-colors"
            title={user?.email || 'Profile'}
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-mono text-xs text-primary font-bold">
              {userInitial}
            </div>
            <span className="hidden sm:inline-block font-body-sm text-xs text-on-surface font-medium max-w-[120px] truncate">
              {displayName}
            </span>
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="p-2 text-outline hover:text-critical hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Fixed Left Sidebar (Desktop: 1024px+) ── */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-surface-container-low border-r border-outline-variant/30 z-40 flex-col justify-between overflow-y-auto transition-colors duration-200">
        <div className="p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-2 pb-2 text-outline font-body-sm text-[11px] font-semibold uppercase tracking-wider">
              Workspace
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline font-body-sm text-xs sm:text-sm ${item.active
                      ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:translate-x-0.5'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}

              <button
                onClick={() => setShowPolicyModal(true)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-sm text-xs sm:text-sm transition-all w-full text-left bg-transparent border-none cursor-pointer hover:translate-x-0.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Risk Scoring Methodology</span>
              </button>
            </nav>
          </div>

          {/* System Settings Section */}
          <div>
            <div className="px-2 pb-2 text-outline font-body-sm text-[11px] font-semibold uppercase tracking-wider">
              Settings
            </div>

            <nav className="flex flex-col gap-1">
              <Link
                to="/app/profile"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline font-body-sm text-xs sm:text-sm ${location.pathname === '/app/profile'
                    ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:translate-x-0.5'
                  }`}
              >
                <Settings className="w-4 h-4" />
                <span>Profile &amp; Identity</span>
              </Link>
            </nav>
          </div>

          {/* Dependency Integrity & SBOM Standard Card */}
          <div className="p-3.5 bg-surface-container-lowest/80 border border-outline-variant/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between font-body-sm text-xs">
              <span className="text-outline font-medium">SBOM Standard</span>
              <span className="text-primary font-mono text-[11px] font-semibold">CycloneDX 1.5</span>
            </div>
            <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-full" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Integrity Hash</span>
              <span className="text-primary">SHA-512</span>
            </div>
          </div>
        </div>

        {/* Engine Version Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-lowest/60">
          <div className="flex items-center justify-between font-body-sm text-xs">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Engine Status</span>
            </div>
            <span className="text-primary font-mono text-[11px] font-semibold">ONLINE</span>
          </div>
        </div>
      </aside>

      {/* ── Responsive Mobile Slide-Over Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-surface-container-low border-r border-outline-variant/30 flex flex-col justify-between overflow-y-auto p-4 z-10 animate-fade-in shadow-2xl">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-headline-sm text-base font-bold text-on-surface">
                    Supply<span className="text-primary">Guard</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div>
                <div className="px-2 pb-2 text-outline font-body-sm text-[11px] font-semibold uppercase tracking-wider">
                  Workspace
                </div>
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline font-body-sm text-sm ${item.active
                          ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold shadow-xs'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                        }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowPolicyModal(true);
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-sm text-sm transition-all w-full text-left bg-transparent border-none cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Risk Scoring Methodology</span>
                  </button>
                </nav>
              </div>

              {/* Settings */}
              <div>
                <div className="px-2 pb-2 text-outline font-body-sm text-[11px] font-semibold uppercase tracking-wider">
                  Settings
                </div>
                <nav className="flex flex-col gap-1">
                  <Link
                    to="/app/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline font-body-sm text-sm ${location.pathname === '/app/profile'
                        ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Profile &amp; Identity</span>
                  </Link>
                </nav>
              </div>
            </div>

            {/* Bottom Engine Status */}
            <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between text-xs font-body-sm text-outline">
              <span>Engine Status</span>
              <span className="text-primary font-mono text-[11px] font-semibold">ONLINE</span>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content Offset ── */}
      <div className="pl-0 lg:pl-64">
        <main className="w-full pt-16 min-h-screen bg-background text-on-surface transition-colors duration-200">
          {children}
        </main>
      </div>

      {/* ── Risk Scoring Modal ── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Shield className="w-4 h-4" />
                </div>
                <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                  Risk Scoring Methodology
                </h2>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-outline hover:text-on-surface bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs sm:text-sm text-on-surface-variant font-body-sm">
              <p>
                SupplyGuard calculates an itemized 0–100 contextual risk score combining advisory severity and topological supply-chain exposure:
              </p>

              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col gap-2 font-mono text-xs">
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

              <div className="p-3 bg-surface-container-high rounded-xl flex items-center justify-between text-xs font-body-sm">
                <span className="text-outline">Score Range</span>
                <span className="text-primary font-semibold font-mono">0 (Clean) to 100 (Critical Blast Radius)</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-headline-sm text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CommandPalette } from './CommandPalette';
import {
  ShieldCheck,
  Search,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';

interface AppHeaderProps {
  currentScanId?: string | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentScanId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      label: 'Overview',
      path: '/app',
      active: location.pathname === '/app',
    },
    {
      label: 'Dependencies',
      path: currentScanId ? `/app/scans/${currentScanId}/dashboard` : '/app',
      active: location.pathname.includes('/dashboard'),
    },
    {
      label: 'Findings',
      path: currentScanId ? `/app/scans/${currentScanId}/report` : '/app',
      active: location.pathname.includes('/report'),
    },
    {
      label: 'History',
      path: '/app/history',
      active: location.pathname === '/app/history',
    },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand + Desktop Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/app" className="flex items-center gap-2.5 no-underline group">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-headline-md text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Supply<span className="text-primary font-bold">Guard</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-body-sm transition-colors no-underline ${
                    item.active
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Functional Command Search + New Scan + Theme + Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Functional Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-xs font-body-sm text-outline hover:text-on-surface transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-[10px] font-mono text-outline">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </button>

            {/* New Scan Primary Action */}
            <Link
              to="/app"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-body-sm rounded-lg font-medium transition-all shadow-xs hover:shadow-sm no-underline active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Scan</span>
            </Link>

            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile Pill */}
            <Link
              to="/app/profile"
              className="hidden sm:flex items-center gap-2 p-1 rounded-lg hover:bg-surface-container-low transition-colors no-underline"
              title={`Signed in as ${displayName}`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-mono text-xs text-primary font-bold">
                {userInitial}
              </div>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg cursor-pointer border-none bg-transparent"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant/30 px-4 py-3 space-y-2 animate-fade-in">
            {/* Mobile Command Palette Trigger */}
            <button
              type="button"
              onClick={() => {
                setPaletteOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-body-sm text-outline"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Search repository or CVE...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-[10px] font-mono">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </button>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1 pt-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-body-sm no-underline ${
                    item.active
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <Link
                to="/app/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body-sm text-on-surface-variant hover:text-on-surface no-underline"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & Settings</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body-sm text-critical hover:bg-critical/10 text-left border-none bg-transparent cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Fully Functional Command Palette Dialog */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        currentScanId={currentScanId}
      />
    </>
  );
};

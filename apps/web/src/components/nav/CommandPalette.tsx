import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getScanHistory } from '../../lib/api';
import type { ScanResult } from '../../types';
import {
  Search,
  LayoutGrid,
  Share2,
  ShieldAlert,
  Zap,
  Clock,
  Plus,
  Sun,
  Moon,
  LogOut,
  User,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentScanId?: string | null;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Recent Scans';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentScanId,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch recent scans
  const { data: scans } = useQuery<ScanResult[]>({
    queryKey: ['scans', user?.id],
    queryFn: async () => {
      try {
        return await getScanHistory();
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Assemble commands
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Overview',
      subtitle: 'Main repository security analysis workspace',
      icon: <LayoutGrid className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate('/app');
        onClose();
      },
    },
    {
      id: 'nav-dependencies',
      category: 'Navigation',
      title: 'Dependency Graph',
      subtitle: currentScanId ? 'Inspect interactive dependency topology' : 'Explore scanned dependencies',
      icon: <Share2 className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate(currentScanId ? `/app/scans/${currentScanId}/dashboard` : '/app');
        onClose();
      },
    },
    {
      id: 'nav-findings',
      category: 'Navigation',
      title: 'Findings & Remediation',
      subtitle: 'Vulnerability advisories and remediation advice',
      icon: <ShieldAlert className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate(currentScanId ? `/app/scans/${currentScanId}/report` : '/app');
        onClose();
      },
    },
    {
      id: 'nav-behavioral',
      category: 'Navigation',
      title: 'Behavioral Signals',
      subtitle: 'Static analysis of package install lifecycle scripts',
      icon: <Zap className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate(currentScanId ? `/app/scans/${currentScanId}/behavioral` : '/app/behavioral');
        onClose();
      },
    },
    {
      id: 'nav-history',
      category: 'Navigation',
      title: 'Scan History',
      subtitle: 'View past repository audits and ledger',
      icon: <Clock className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate('/app/history');
        onClose();
      },
    },
    {
      id: 'nav-profile',
      category: 'Navigation',
      title: 'User Profile & Settings',
      subtitle: 'Manage account, organization, and API tokens',
      icon: <User className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate('/app/profile');
        onClose();
      },
    },
  ];

  const actionCommands: CommandItem[] = [
    {
      id: 'action-new-scan',
      category: 'Actions',
      title: 'Start New Scan',
      subtitle: 'Audit a public repository or monorepo package',
      icon: <Plus className="w-4 h-4 text-primary" />,
      onSelect: () => {
        navigate('/app');
        onClose();
      },
    },
    {
      id: 'action-toggle-theme',
      category: 'Actions',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: `Current theme: ${theme}`,
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-primary" />,
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    },
    {
      id: 'action-sign-out',
      category: 'Actions',
      title: 'Sign Out',
      subtitle: 'Sign out of current workspace session',
      icon: <LogOut className="w-4 h-4 text-critical" />,
      onSelect: async () => {
        await signOut();
        navigate('/signin');
        onClose();
      },
    },
  ];

  const scanCommands: CommandItem[] = (scans || []).slice(0, 5).map((scan) => {
    const repoSlug = scan.repoUrl.replace(/^https?:\/\/github\.com\//, '');
    return {
      id: `scan-${scan.scanId}`,
      category: 'Recent Scans',
      title: repoSlug,
      subtitle: `Scanned ${new Date(scan.createdAt).toLocaleDateString()} • ${(scan as any).totalPackages ?? scan.packages?.length ?? 0} packages`,
      icon: <Clock className="w-4 h-4 text-outline" />,
      onSelect: () => {
        navigate(`/app/scans/${scan.scanId}/dashboard`);
        onClose();
      },
    };
  });

  const allCommands = [...navigationCommands, ...actionCommands, ...scanCommands];

  const filteredCommands = query.trim()
    ? allCommands.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(query.toLowerCase()) ||
          cmd.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Handle arrow navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/30 bg-surface-container-lowest/80">
          <Search className="w-4 h-4 text-outline shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent border-none text-on-surface placeholder:text-outline text-sm font-body-md focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-outline-variant/15">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-outline text-xs font-body-sm">
              No matching commands or scans found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-surface-container-high text-on-surface'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/30 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium font-body-sm truncate text-on-surface">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-outline truncate font-body-sm">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-outline uppercase px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30">
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 text-primary transition-transform ${isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-outline-variant/20 bg-surface-container-lowest/60 text-[11px] font-mono text-outline">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container border border-outline-variant/30">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container border border-outline-variant/30">↵</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container border border-outline-variant/30">Esc</kbd> Close</span>
          </div>
          <span className="text-[10px] text-outline">SupplyGuard Quick Action</span>
        </div>
      </div>
    </div>
  );
};

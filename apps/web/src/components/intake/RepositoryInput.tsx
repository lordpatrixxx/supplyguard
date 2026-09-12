import React, { useState } from 'react';
import {
  Search, ArrowRight, GitBranch, FolderGit2, X,
  AlertCircle, ChevronDown, ShieldCheck, Sparkles
} from 'lucide-react';

interface RepositoryInputProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  branch: string;
  setBranch: (branch: string) => void;
  subpath: string;
  setSubpath: (subpath: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  errorMessage: string;
  setErrorMessage: (msg: string) => void;
}

export const RepositoryInput: React.FC<RepositoryInputProps> = ({
  repoUrl,
  setRepoUrl,
  branch,
  setBranch,
  subpath,
  setSubpath,
  onSubmit,
  isPending,
  errorMessage,
  setErrorMessage,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const sampleTargets = [
    { label: 'tastejs/todomvc', url: 'https://github.com/tastejs/todomvc', desc: 'Classic Benchmark (npm)' },
    { label: 'expressjs/express', url: 'https://github.com/expressjs/express', desc: 'Core Web API (npm)' },
    { label: 'psf/requests', url: 'https://github.com/psf/requests', desc: 'Python Library (pip)' },
    { label: 'Swastik1024/SIH_KisanMitra01', url: 'https://github.com/Swastik1024/SIH_KisanMitra01', desc: 'Fullstack Monorepo (npm + pip)' },
  ];

  // Keyboard shortcut listener: Cmd/Ctrl + Enter to trigger submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleClear = () => {
    setRepoUrl('');
    setErrorMessage('');
  };

  return (
    <div className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-sm transition-all duration-200">
      <form onSubmit={onSubmit} className="flex flex-col gap-6 sm:gap-7">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
              Target Repository Intake
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant font-body-sm">
              Enter any public Git repository or monorepo package path to analyze.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant/30 text-[11px] font-mono text-outline">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>npm • PyPI • poetry • pnpm</span>
          </span>
        </div>

        {/* Primary Interactive URL Input Console */}
        <div className="flex flex-col gap-2">
          <label htmlFor="repo-url-input" className="flex items-center justify-between text-xs font-body-sm font-medium text-on-surface">
            <span>Repository URL or GitHub Slug</span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-outline">
              Press {isMac ? '⌘' : 'Ctrl'} + Enter to scan
            </span>
          </label>

          <div
            className={`relative flex items-center bg-surface-container-lowest rounded-xl border transition-all duration-200 shadow-inner ${
              isFocused
                ? 'border-primary ring-2 ring-primary/20 shadow-md'
                : 'border-outline-variant/50 hover:border-outline-variant'
            } ${errorMessage ? 'border-critical ring-1 ring-critical/30' : ''}`}
          >
            {/* Protocol Badge */}
            <div className="hidden sm:flex items-center pl-3.5 pr-2 py-3 text-outline font-mono text-xs select-none border-r border-outline-variant/20 mr-2">
              <span>https://</span>
            </div>

            <div className="flex sm:hidden pl-3 text-outline">
              <Search className="w-4 h-4 text-outline" />
            </div>

            {/* Input Field */}
            <input
              id="repo-url-input"
              type="text"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="github.com/owner/repository"
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-3.5 pr-10 pl-2 font-mono text-xs sm:text-sm text-on-surface placeholder:text-outline/40 focus:outline-none disabled:opacity-60"
            />

            {/* Quick Clear Button */}
            {repoUrl && !isPending && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear repository input"
                className="absolute right-3 p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Benchmark Shortcut Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-on-surface-variant font-body-sm shrink-0">
            Quick benchmarks:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {sampleTargets.map((target) => (
              <button
                key={target.url}
                type="button"
                onClick={() => {
                  setRepoUrl(target.url);
                  setErrorMessage('');
                }}
                disabled={isPending}
                title={target.desc}
                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 font-mono text-xs text-on-surface-variant hover:text-primary transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {target.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Advanced Options (Branch & Monorepo) */}
        <div className="border-t border-outline-variant/20 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 font-body-sm text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            <ChevronDown
              className={`w-4 h-4 text-outline transition-transform duration-200 ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
            <span className="font-medium">
              {showAdvanced ? 'Hide Advanced Options' : 'Advanced: Monorepo Subpath / Custom Git Branch'}
            </span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3.5 p-4 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/40 animate-fade-in">
              <div className="space-y-1.5">
                <label
                  htmlFor="branch-input"
                  className="flex items-center gap-1.5 font-body-sm text-xs font-medium text-on-surface"
                >
                  <GitBranch className="w-3.5 h-3.5 text-outline" />
                  <span>Target Branch (optional)</span>
                </label>
                <input
                  id="branch-input"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main, release/v2, develop"
                  disabled={isPending}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-xs text-on-surface placeholder:text-outline/40 focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="subpath-input"
                  className="flex items-center gap-1.5 font-body-sm text-xs font-medium text-on-surface"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-outline" />
                  <span>Monorepo Subpath (optional)</span>
                </label>
                <input
                  id="subpath-input"
                  type="text"
                  value={subpath}
                  onChange={(e) => setSubpath(e.target.value)}
                  placeholder="packages/backend or apps/api"
                  disabled={isPending}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-xs text-on-surface placeholder:text-outline/40 focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-critical/10 border border-critical/30 text-critical text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5 font-body-sm">
              <span className="font-semibold">Unable to initiate audit: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Action Footer Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-2 text-xs font-body-sm text-on-surface-variant">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Audits multi-ecosystem manifests &amp; lockfiles directly from Git</span>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-sm rounded-xl shadow-md hover:shadow-lg transition-all font-semibold cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                <span>Initiating Audit Pipeline...</span>
              </>
            ) : (
              <>
                <span>Start Security Audit</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

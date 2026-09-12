import React, { useState } from 'react';
import { Search, ArrowRight, X, AlertCircle, ChevronDown, GitBranch, FolderGit2 } from 'lucide-react';

interface OverviewHeroProps {
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

export const OverviewHero: React.FC<OverviewHeroProps> = ({
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
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const sampleTargets = [
    { label: 'todomvc', url: 'https://github.com/tastejs/todomvc', desc: 'Classic benchmark' },
    { label: 'express', url: 'https://github.com/expressjs/express', desc: 'Node.js framework' },
    { label: 'requests', url: 'https://github.com/psf/requests', desc: 'Python library' },
    { label: 'SIH_KisanMitra01', url: 'https://github.com/Swastik1024/SIH_KisanMitra01', desc: 'Fullstack monorepo' },
  ];

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
    <section className="text-center max-w-3xl mx-auto space-y-6 pt-6 sm:pt-10">
      {/* Category Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span>Software Supply Chain Security Analysis</span>
      </div>

      {/* Main Headline */}
      <h1 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight">
        Secure your software <span className="text-primary">supply chain.</span>
      </h1>

      {/* Human-Centered Explanation */}
      <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto font-normal leading-relaxed">
        Static analysis of package manifests, dependency relationships, and install lifecycle scripts across open-source repositories.
      </p>

      {/* Primary Intake Console */}
      <div className="pt-2 max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <div
            className={`relative flex items-center bg-surface-container-low border rounded-2xl p-1.5 sm:p-2 shadow-sm transition-all duration-200 ${
              errorMessage
                ? 'border-critical ring-1 ring-critical/30'
                : 'border-outline-variant/40 hover:border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
            }`}
          >
            <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-outline">
              <Search className="w-4 h-4" />
            </div>

            <input
              id="repository-input"
              type="text"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="github.com/organization/repository"
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent border-none text-on-surface placeholder:text-outline font-mono text-xs sm:text-sm py-2 px-1 focus:outline-none disabled:opacity-60"
            />

            {repoUrl && !isPending && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear input"
                className="p-1.5 mr-1 text-outline hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="hidden sm:inline-block text-[11px] text-outline font-mono mr-2 select-none">
              {isMac ? '⌘↵' : 'Ctrl+↵'}
            </span>

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs sm:text-sm font-body-sm font-semibold transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer border-none disabled:opacity-60 shrink-0"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Start Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-critical/10 border border-critical/30 text-critical text-xs font-body-sm animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick-Pick Registry Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs font-body-sm text-outline mr-1">
              Sample repositories:
            </span>
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
                className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/40 text-on-surface-variant hover:text-on-surface text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
              >
                {target.label}
              </button>
            ))}
          </div>

          {/* Optional Advanced Settings Drawer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-body-sm text-outline hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
              <span>{showAdvanced ? 'Hide options' : 'Git branch & subpath options'}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left animate-fade-in">
                <div className="space-y-1">
                  <label htmlFor="hero-branch-input" className="flex items-center gap-1.5 text-xs font-medium text-on-surface">
                    <GitBranch className="w-3.5 h-3.5 text-outline" />
                    <span>Branch / Git Ref (optional)</span>
                  </label>
                  <input
                    id="hero-branch-input"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main or release"
                    disabled={isPending}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-1.5 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="hero-subpath-input" className="flex items-center gap-1.5 text-xs font-medium text-on-surface">
                    <FolderGit2 className="w-3.5 h-3.5 text-outline" />
                    <span>Monorepo Subpath (optional)</span>
                  </label>
                  <input
                    id="hero-subpath-input"
                    type="text"
                    value={subpath}
                    onChange={(e) => setSubpath(e.target.value)}
                    placeholder="packages/backend"
                    disabled={isPending}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-1.5 font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

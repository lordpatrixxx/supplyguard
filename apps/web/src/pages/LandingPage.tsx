import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { createScan } from '../lib/api';

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const prefill = (location.state as { prefillRepo?: string })?.prefillRepo || '';
  const [repoUrl, setRepoUrl] = useState(prefill || 'https://github.com/tastejs/todomvc');
  const [branch, setBranch] = useState('');
  const [subpath, setSubpath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (prefill) {
      setRepoUrl(prefill);
    }
  }, [prefill]);

  const scanMutation = useMutation({
    mutationFn: async (payload: { repoUrl: string; branch?: string; subpath?: string }) => {
      return await createScan(payload);
    },
    onSuccess: (data) => {
      navigate(`/app/scans/${data.scanId}`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Scan initiation failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a GitHub repository URL');
      return;
    }
    let formatted = trimmed;
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }

    scanMutation.mutate({
      repoUrl: formatted,
      branch: branch.trim() || undefined,
      subpath: subpath.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          {/* Left Column: Directive Input Console */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Status Chip */}
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-surface-container rounded-full border border-outline-variant/40 text-xs font-code-sm text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>Enterprise Software Supply Chain Auditor</span>
            </div>

            {/* Master Headline */}
            <div className="space-y-2">
              <h1 className="font-headline-md text-3xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                New Supply Chain Security Audit
              </h1>
              <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
                Scan public GitHub repositories or microservice subpaths to audit nested dependencies,
                correlate vulnerability intelligence, and evaluate topological blast radius.
              </p>
            </div>

            {/* Intake Form Box */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 bg-surface-container-low rounded-xl shadow-md border border-outline-variant/40">
              <div className="flex flex-col gap-1.5">
                <label className="font-code-sm text-xs text-outline uppercase tracking-wider">
                  Target Repository URL
                </label>
                <div className="relative flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/50 px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <svg className="w-5 h-5 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="1.05" y1="12" x2="7" y2="12" />
                    <line x1="17.01" y1="12" x2="22.96" y2="12" />
                  </svg>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                    disabled={scanMutation.isPending}
                  />
                </div>
              </div>

              {/* Sample Target Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-outline font-code-sm">Sample Targets:</span>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/tastejs/todomvc')}
                  className="px-2 py-0.5 rounded bg-surface-container text-xs font-code-sm text-on-surface-variant hover:text-primary hover:border-primary/40 border border-outline-variant transition-colors"
                >
                  tastejs/todomvc
                </button>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/axios/axios')}
                  className="px-2 py-0.5 rounded bg-surface-container text-xs font-code-sm text-on-surface-variant hover:text-primary hover:border-primary/40 border border-outline-variant transition-colors"
                >
                  axios/axios
                </button>
              </div>

              {/* Advanced Monorepo / Branch Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 font-code-sm text-xs text-outline hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>{showAdvanced ? 'Hide Advanced Options' : 'Advanced: Monorepo Subpath / Custom Branch'}</span>
                </button>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant/40 animate-fade-in">
                  <div>
                    <label className="block font-code-sm text-[11px] uppercase text-outline mb-1">
                      Git Branch (optional)
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main / master / staging"
                      className="w-full bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-code-sm text-[11px] uppercase text-outline mb-1">
                      Monorepo Subpath (optional)
                    </label>
                    <input
                      type="text"
                      value={subpath}
                      onChange={(e) => setSubpath(e.target.value)}
                      placeholder="packages/backend or apps/api"
                      className="w-full bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-lg bg-critical/10 border border-critical/40 text-critical text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
                <span className="font-code-sm text-xs text-outline flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Audits package.json &amp; npm lockfile</span>
                </span>

                <button
                  type="submit"
                  disabled={scanMutation.isPending}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-sm rounded-lg shadow-sm transition-all font-semibold cursor-pointer border-none disabled:opacity-60"
                >
                  {scanMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                      <span>Initiating...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Audit</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* User Attribution Footer */}
            <div className="flex items-center justify-between text-xs font-code-sm text-outline px-1">
              <span>Tenant Security Isolation: Active</span>
              <span>{user ? `Scoped to ${user.email}` : 'Authenticated Session'}</span>
            </div>
          </div>

          {/* Right Column: Active Telemetry & Capability Overview */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-4">
              <h2 className="font-headline-sm font-semibold text-lg text-on-surface">
                Autonomous Supply Chain Pipeline
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                SupplyGuard executes multi-stage graph analysis directly against manifest trees,
                preventing local code execution vulnerabilities while extracting true dependency topologies.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 space-y-1.5">
                  <div className="font-code-sm text-xs font-semibold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Vulnerability Engine
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Correlates upstream OSV and GitHub Security Advisories with CVSS vectors.
                  </div>
                </div>

                <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 space-y-1.5">
                  <div className="font-code-sm text-xs font-semibold text-tertiary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    Topological Fan-Out
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Measures true downstream dependent reachability across all graph depths.
                  </div>
                </div>

                <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 space-y-1.5">
                  <div className="font-code-sm text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Heuristic Protection
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Detects lookalike typosquatting and internal namespace collisions.
                  </div>
                </div>

                <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 space-y-1.5">
                  <div className="font-code-sm text-xs font-semibold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    CycloneDX v1.5 JSON
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Generates standardized, cryptographically hashed bills of materials.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

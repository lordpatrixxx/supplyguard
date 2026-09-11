import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createScan } from '../lib/api';
import {
  ShieldAlert, Network, Search, Zap, FileCode2, Lock,
  ChevronDown, ArrowRight, GitBranch, FolderGit2,
  Terminal, ShieldCheck, AlertCircle, Cpu
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="flex flex-col w-full max-w-7xl mx-auto px-6 py-8 sm:py-10">
      {/* Top Header Section (Spans both columns so cards align perfectly below) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-outline-variant/30">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant/40 text-xs font-code-sm text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Enterprise Software Supply Chain Auditor</span>
          </div>
          <h1 className="font-headline-md text-3xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight">
            New Supply Chain Security Audit
          </h1>
          <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
            Scan public GitHub repositories or microservice subpaths to audit nested dependencies,
            correlate vulnerability intelligence, and evaluate topological blast radius.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-end px-3.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/40 font-code-sm text-xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-on-surface-variant">Live Scanner:</span>
          <span className="text-primary font-semibold">Active</span>
        </div>
      </div>

      {/* Main 2-Column Grid with Both Cards Aligned at the Top */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-8">
        {/* Left Column: Target Repository Input Console */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-7 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-code-sm text-xs text-outline uppercase tracking-wider font-medium">
                  Target Repository URL
                </label>
                <span className="font-code-sm text-[11px] text-outline">Public or Enterprise Git</span>
              </div>
              <div className="relative flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/50 px-3.5 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <Terminal className="w-5 h-5 text-outline mr-3 shrink-0" />
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
                className="px-2.5 py-1 rounded bg-surface-container text-xs font-code-sm text-on-surface-variant hover:text-primary hover:border-primary/40 border border-outline-variant/40 transition-colors cursor-pointer"
              >
                tastejs/todomvc
              </button>
              <button
                type="button"
                onClick={() => setRepoUrl('https://github.com/axios/axios')}
                className="px-2.5 py-1 rounded bg-surface-container text-xs font-code-sm text-on-surface-variant hover:text-primary hover:border-primary/40 border border-outline-variant/40 transition-colors cursor-pointer"
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
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                <span>{showAdvanced ? 'Hide Advanced Options' : 'Advanced: Monorepo Subpath / Custom Branch'}</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/40 animate-fade-in">
                <div>
                  <label className="flex items-center gap-1.5 font-code-sm text-[11px] uppercase text-outline mb-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-outline" />
                    <span>Git Branch (optional)</span>
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main / master / staging"
                    className="w-full bg-surface-container border border-outline-variant/40 rounded px-3 py-2 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 font-code-sm text-[11px] uppercase text-outline mb-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-outline" />
                    <span>Monorepo Subpath (optional)</span>
                  </label>
                  <input
                    type="text"
                    value={subpath}
                    onChange={(e) => setSubpath(e.target.value)}
                    placeholder="packages/backend or apps/api"
                    className="w-full bg-surface-container border border-outline-variant/40 rounded px-3 py-2 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-critical/10 border border-critical/40 text-critical text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
              <span className="font-code-sm text-xs text-outline flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
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
                    <span>Initiating Audit...</span>
                  </>
                ) : (
                  <>
                    <span>Start Audit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Autonomous Supply Chain Pipeline */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-7 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-headline-sm font-semibold text-base sm:text-lg text-on-surface">
                    Autonomous Supply Chain Pipeline
                  </h2>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-[10px] font-code-sm text-primary uppercase tracking-wider font-semibold">
                Zero Execution
              </span>
            </div>

            <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
              SupplyGuard executes multi-stage graph analysis directly against manifest trees,
              eliminating untrusted code execution risks while extracting true dependency topologies.
            </p>

            <div className="space-y-2.5 pt-1">
              <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>Vulnerability Engine</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed">
                    Correlates upstream OSV and GitHub Advisories with FIRST-compliant CVSS vectors.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary shrink-0 mt-0.5">
                  <Network className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>Topological Fan-Out</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  </div>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed">
                    Calculates real downstream dependent reachability across all graph depths.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>Heuristic Protection</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  </div>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed">
                    Detects lookalike typosquatting and internal namespace collisions.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>Behavioral Threat Signals</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed">
                    Static install-script heuristics detecting pipe-to-shell and obfuscation.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest/80 rounded-lg border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <FileCode2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>CycloneDX v1.5 JSON SBOM</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  <div className="text-[11px] text-on-surface-variant leading-relaxed">
                    Standardized, cryptographically hashed software bills of materials.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-outline-variant/30 flex items-center gap-2 text-outline font-code-sm text-[11px]">
            <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>100% Static Analysis Guarantee: Code is never executed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createScan, getScan, getScanHistory } from '../lib/api';
import { OverviewHero } from '../components/overview/OverviewHero';
import { DependencyConstellation } from '../components/ecosystem/DependencyConstellation';
import { SecuritySummary } from '../components/overview/SecuritySummary';
import { Shield, CheckCircle2, History, ArrowRight } from 'lucide-react';
import type { ScanResult } from '../types';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const prefill = (location.state as { prefillRepo?: string })?.prefillRepo || '';
  const scanIdParam = searchParams.get('scanId');

  const [repoUrl, setRepoUrl] = useState(prefill || 'https://github.com/tastejs/todomvc');
  const [branch, setBranch] = useState('');
  const [subpath, setSubpath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (prefill) {
      setRepoUrl(prefill);
    }
  }, [prefill]);

  // Fetch recent scan history to allow inspecting latest repository audit if available
  const { data: history = [] } = useQuery<ScanResult[]>({
    queryKey: ['scan-history-overview'],
    queryFn: getScanHistory,
    staleTime: 30000,
  });

  // Active scan ID can come from URL search params or fallback to the most recent completed scan
  const activeScanId = scanIdParam || (history.length > 0 && history[0].status === 'complete' ? history[0].scanId : null);

  const { data: activeScan, isLoading: isScanLoading } = useQuery<ScanResult>({
    queryKey: ['scan-detail', activeScanId],
    queryFn: () => getScan(activeScanId!),
    enabled: !!activeScanId,
    staleTime: 60000,
  });

  const scanMutation = useMutation({
    mutationFn: async (payload: { repoUrl: string; branch?: string; subpath?: string }) => {
      return await createScan(payload);
    },
    onSuccess: (data) => {
      navigate(`/app/scans/${data.scanId}`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Scan initiation failed. Check repository URL and network connectivity.');
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 animate-fade-in">
      {/* ── 1. Target Repository Intake Hero ── */}
      <OverviewHero
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        branch={branch}
        setBranch={setBranch}
        subpath={subpath}
        setSubpath={setSubpath}
        onSubmit={handleSubmit}
        isPending={scanMutation.isPending}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />

      {/* ── Returning User Recent Scan Banner (Optional quick switcher) ── */}
      {history.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 truncate w-full sm:w-auto">
            <History className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">
              Recent scan:{' '}
              <strong className="text-on-surface font-mono font-medium">
                {history[0].repoUrl.replace(/^https?:\/\/github\.com\//, '')}
              </strong>{' '}
              ({history[0].packages?.length ?? 0} packages)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(`/app/scans/${history[0].scanId}/dashboard`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors cursor-pointer border border-outline-variant/30"
            >
              <span>View Full Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Signature Dependency Ecosystem Constellation ── */}
      <section className="w-full">
        <DependencyConstellation
          scanData={activeScan || null}
          height={480}
        />
      </section>

      {/* ── 3. Security & Dependency Summary (Progressive Disclosure) ── */}
      <section className="w-full">
        <SecuritySummary
          scanData={activeScan || null}
          isLoading={isScanLoading}
        />
      </section>

      {/* ── 4. Honest Technical Assurance Footer ── */}
      <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <span className="leading-relaxed">
            SupplyGuard evaluates dependency manifests via read-only GitHub API and AST analysis. Zero code execution required.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-outline shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>OSV &amp; GHSA Advisories</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>CycloneDX 1.5 Export</span>
          </span>
        </div>
      </footer>
    </div>
  );
};

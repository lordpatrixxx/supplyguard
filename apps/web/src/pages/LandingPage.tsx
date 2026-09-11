import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createScan } from '../lib/api';
import { AuditHero } from '../components/intake/AuditHero';
import { RepositoryInput } from '../components/intake/RepositoryInput';
import { DependencyConstellation } from '../components/intake/DependencyConstellation';
import { AnalysisPipeline } from '../components/intake/AnalysisPipeline';
import { Shield, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefill = (location.state as { prefillRepo?: string })?.prefillRepo || '';
  const [repoUrl, setRepoUrl] = useState(prefill || 'https://github.com/tastejs/todomvc');
  const [branch, setBranch] = useState('');
  const [subpath, setSubpath] = useState('');
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
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 animate-fade-in">
      {/* ── Top Header / Audit Hero Section ── */}
      <AuditHero />

      {/* ── Primary Workspace: Repository Input Console + Live Topology Constellation ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left / Top: Interactive Target Repository Intake */}
        <div className="w-full xl:col-span-7">
          <RepositoryInput
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
        </div>

        {/* Right / Bottom: Signature Interactive Dependency Topology Constellation */}
        <div className="w-full xl:col-span-5">
          <DependencyConstellation />
        </div>
      </div>

      {/* ── Security Analysis Pipeline & Multi-Vector Intelligence Visualization ── */}
      <div className="w-full pt-2">
        <AnalysisPipeline />
      </div>

      {/* ── Security & Compliance Footer Assurance ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span>
            SupplyGuard evaluates AST manifests via read-only Git API queries. Private tokens or runtime sandboxes are never required.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-outline shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>FIRST CVSS v3.1</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>CycloneDX 1.5</span>
          </span>
        </div>
      </div>
    </div>
  );
}

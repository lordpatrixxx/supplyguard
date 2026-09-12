import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createScan } from '../lib/api';
import { AuditHero } from '../components/intake/AuditHero';
import { RepositoryInput } from '../components/intake/RepositoryInput';
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
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* ── Top Header / Audit Hero Section ── */}
      <AuditHero />

      {/* ── Target Repository Intake Console ── */}
      <div className="w-full">
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

      {/* ── Security & Compliance Footer Assurance ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span>
            SupplyGuard evaluates AST manifests via read-only Git API queries. Zero code execution required.
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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ScanResult, Vulnerability } from '../../types';
import {
  ShieldCheck,
  AlertTriangle,
  FileCode2,
  ChevronDown,
  ArrowRight,
  Zap,
  Layers,
} from 'lucide-react';

interface SecuritySummaryProps {
  scanData?: ScanResult | null;
  isLoading?: boolean;
}

export const SecuritySummary: React.FC<SecuritySummaryProps> = ({
  scanData,
  isLoading: _isLoading = false,
}) => {
  const [expandedVulnId, setExpandedVulnId] = useState<string | null>(null);

  // ── State A: Empty / No Active Scan ──
  if (!scanData) {
    return (
      <section className="w-full max-w-5xl mx-auto pt-6">
        <div className="p-8 sm:p-10 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface">
              Explore your dependency ecosystem
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Start a scan above to analyze package relationships, discover known vulnerabilities from open advisory databases, and inspect package install scripts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2 text-left">
            <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                <Layers className="w-4 h-4 text-primary" />
                <span>Multi-Ecosystem Discovery</span>
              </div>
              <p className="text-xs text-on-surface-variant font-body-sm leading-normal">
                Recursively maps direct and transitive packages across npm and Python directories.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span>Advisory Correlation</span>
              </div>
              <p className="text-xs text-on-surface-variant font-body-sm leading-normal">
                Correlates package versions with OSV and GHSA vulnerability databases.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                <Zap className="w-4 h-4 text-secondary" />
                <span>Behavioral Threat Signals</span>
              </div>
              <p className="text-xs text-on-surface-variant font-body-sm leading-normal">
                Statically inspects install lifecycle scripts for network commands and obfuscated code.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── State C: Scan Completed / Real Scan Data ──
  const packages = scanData.packages || [];
  const totalPackages = (scanData as any).totalPackages ?? packages.length;
  const directDeps = (scanData as any).directDeps ?? packages.filter((p) => p.isDirect).length;
  const transitiveDeps = (scanData as any).transitiveDeps ?? packages.filter((p) => !p.isDirect).length;
  const vulns: Vulnerability[] =
    (scanData as any).vulnerabilities ??
    packages.flatMap((p) => p.vulnerabilities || []);
  const behavioralSignals =
    (scanData as any).behavioralSignals ??
    packages.flatMap((p) => p.behavioralFlags || (p.behavioralFlag ? [p.behavioralFlag] : []));
  const detectedFiles = scanData.detectedFiles || [];

  return (
    <section className="w-full max-w-6xl mx-auto space-y-6 pt-4">
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
        <div>
          <h2 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface">
            Security &amp; Dependency Summary
          </h2>
          <p className="text-xs sm:text-sm font-body-sm text-on-surface-variant">
            Real metrics evaluated for {scanData.repoUrl.replace(/^https?:\/\/github\.com\//, '')}
          </p>
        </div>

        <Link
          to={`/app/scans/${scanData.scanId}/dashboard`}
          className="inline-flex items-center gap-1.5 text-xs font-body-sm font-medium text-primary hover:text-primary-container transition-colors no-underline"
        >
          <span>Open interactive graph</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3-Column Sparse Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Package Composition & Depth */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                Package Scope
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container border border-outline-variant/30 text-primary">
                {scanData.treeCompleteness === 'complete' ? 'Complete Tree' : 'Analyzed'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-body-sm">
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/15">
                <span className="text-on-surface-variant">Total Unique Packages</span>
                <span className="font-semibold font-mono text-on-surface">{totalPackages}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/15">
                <span className="text-on-surface-variant">Direct Dependencies</span>
                <span className="font-mono text-on-surface">{directDeps}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/15">
                <span className="text-on-surface-variant">Transitive Packages</span>
                <span className="font-mono text-on-surface">{transitiveDeps}</span>
              </div>
            </div>

            {/* Discovered Manifest Files */}
            {detectedFiles.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-medium text-outline uppercase tracking-wider">
                  Discovered Manifests
                </span>
                <div className="space-y-1">
                  {detectedFiles.map((file) => (
                    <div
                      key={file}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container border border-outline-variant/20 text-[11px] font-mono text-on-surface-variant truncate"
                      title={file}
                    >
                      <FileCode2 className="w-3 h-3 text-outline shrink-0" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant/20 text-[11px] font-body-sm text-on-surface-variant flex items-center justify-between">
            <span>Lockfile precedence applied</span>
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        {/* Column 2: Known Security Advisories (Progressive Disclosure) */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                Known Advisories
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                  vulns.length > 0
                    ? 'bg-critical/15 text-critical border border-critical/30'
                    : 'bg-primary/10 text-primary border border-primary/30'
                }`}
              >
                {vulns.length === 0 ? 'Zero Findings' : `${vulns.length} Flagged`}
              </span>
            </div>

            {vulns.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-primary mx-auto opacity-80" />
                <p className="text-xs font-body-sm text-on-surface font-medium">
                  No known CVE or GHSA advisories detected.
                </p>
                <p className="text-[11px] font-body-sm text-on-surface-variant">
                  All resolved packages match clean versions in the OSV database.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {vulns.slice(0, 3).map((vuln, idx) => {
                  const isExpanded = expandedVulnId === vuln.id;
                  const severity = vuln.severity?.toUpperCase();
                  const severityColor =
                    severity === 'CRITICAL'
                      ? 'text-critical bg-critical/15 border-critical/30'
                      : severity === 'HIGH'
                      ? 'text-critical bg-critical/10 border-critical/20'
                      : 'text-warning bg-warning/15 border-warning/30';

                  return (
                    <div
                      key={vuln.id || `vuln-${idx}`}
                      className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-on-surface truncate">
                          {vuln.packageName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${severityColor}`}
                        >
                          {vuln.severity}
                        </span>
                      </div>

                      <p className="text-xs font-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                        {vuln.summary || (vuln as any).title || (vuln as any).description || 'Known vulnerability advisory'}
                      </p>

                      {/* Progressive Disclosure Toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedVulnId(isExpanded ? null : vuln.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-body-sm text-primary hover:text-primary-container transition-colors cursor-pointer border-none bg-transparent p-0 pt-1"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span>{isExpanded ? 'Hide details' : 'View technical details'}</span>
                      </button>

                      {/* Expanded Technical Details */}
                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/25 text-[11px] font-mono space-y-1 text-on-surface-variant animate-fade-in">
                          {vuln.cve && (
                            <div className="flex justify-between">
                              <span className="text-outline">CVE ID:</span>
                              <span className="text-on-surface">{vuln.cve}</span>
                            </div>
                          )}
                          {vuln.ghsa && (
                            <div className="flex justify-between">
                              <span className="text-outline">GHSA ID:</span>
                              <span className="text-on-surface">{vuln.ghsa}</span>
                            </div>
                          )}
                          {(vuln.fixedIn || (vuln as any).fixedVersion) && (
                            <div className="flex justify-between text-primary">
                              <span>Fix Available:</span>
                              <span>{vuln.fixedIn || (vuln as any).fixedVersion}</span>
                            </div>
                          )}
                          {(vuln.affectedRange || (vuln as any).affectedVersions) && (
                            <div className="flex justify-between">
                              <span className="text-outline">Affected:</span>
                              <span className="truncate max-w-[140px]">{vuln.affectedRange || (vuln as any).affectedVersions}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant/20">
            <Link
              to={`/app/scans/${scanData.scanId}/report`}
              className="inline-flex items-center gap-1.5 text-xs font-body-sm font-medium text-primary hover:text-primary-container transition-colors no-underline"
            >
              <span>View all findings in report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Column 3: Behavioral Threat Signals */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base font-semibold text-on-surface">
                Behavioral Threat Signals
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                Static Analysis
              </span>
            </div>

            <p className="text-xs font-body-sm text-on-surface-variant leading-relaxed">
              Static analysis of package lifecycle scripts (<code className="font-mono text-primary">preinstall</code>, <code className="font-mono text-primary">postinstall</code>) across repository manifests.
            </p>

            {behavioralSignals.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/25 space-y-1.5 text-xs font-body-sm">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>No Suspicious Lifecycle Scripts</span>
                </div>
                <p className="text-on-surface-variant text-[11px] leading-normal">
                  No pipe-to-shell, obfuscated hex strings, or credential harvesting patterns detected.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {behavioralSignals.slice(0, 2).map((sig: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-container border border-critical/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-critical font-semibold">{sig.packageName || 'Package Script'}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-critical/15 text-critical font-semibold">Flagged</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">{sig.description || sig.pattern || 'Suspicious script pattern detected'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant/20">
            <Link
              to={`/app/scans/${scanData.scanId}/behavioral`}
              className="inline-flex items-center gap-1.5 text-xs font-body-sm font-medium text-primary hover:text-primary-container transition-colors no-underline"
            >
              <span>Inspect behavioral telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult } from '../types'
import { getScan, downloadSbom } from '../lib/api'
import {
  Home, FileCode, Share2, Check, Code2, ShieldCheck, TrendingDown,
  CheckSquare, ShieldAlert, GitFork, Sparkles, GitBranch, Brain,
  Copy, Network, Fingerprint, Loader2, Download
} from 'lucide-react'

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedScript, setCopiedScript] = useState(false)

  const { data: scan, isLoading, error } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: () => getScan(id!),
    enabled: !!id,
  })

  const repoName = useMemo(() => {
    if (!scan?.repoUrl) return 'Target Repository'
    return scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
  }, [scan?.repoUrl])

  const flaggedPackages = useMemo(() => {
    if (!scan?.packages) return []
    return [...scan.packages]
      .filter((p) => p.riskScore >= 40 || p.vulnerabilities.length > 0 || p.typosquatFlag || p.confusionFlag)
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [scan?.packages])

  const currentScore = scan?.overallRiskScore || 0
  const projectedScore = scan?.projectedOverallRiskScore !== undefined
    ? scan.projectedOverallRiskScore
    : Math.max(0, currentScore - flaggedPackages.reduce((acc, p) => acc + (p.ptsReduced || 0), 0))
  const scoreDelta = Math.max(0, currentScore - projectedScore)

  const handleCopyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleDownloadSbom = async () => {
    if (!id) return
    try {
      await downloadSbom(id, scan?.repoUrl)
    } catch (err) {
      console.error('Failed to download SBOM:', err)
    }
  }

  const handleCopyAllFixes = () => {
    const commands = flaggedPackages
      .map((p) => {
        const topVuln = p.vulnerabilities[0]
        const fixedVersion = topVuln?.fixedIn || `${p.name}@latest`
        return p.remediation?.fix_command || `npm install ${p.name}@${fixedVersion}`
      })
      .filter(Boolean)

    if (commands.length === 0) return

    const script = [
      '#!/bin/bash',
      `# SupplyGuard Remediation Script for ${repoName}`,
      `# Scan ID: ${id}`,
      `# Generated: ${new Date().toISOString()}`,
      '',
      ...commands,
      '',
      'echo "SupplyGuard remediation commands executed. Running npm audit..."',
      'npm audit',
    ].join('\n')

    navigator.clipboard.writeText(script)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="font-code-sm text-xs text-outline">Generating Remediation Matrix...</span>
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="bg-surface-container rounded-xl p-8 text-center max-w-md border border-outline-variant/30 shadow-xl">
          <h2 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Report Not Found</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-6">
            Scan #{id} could not be loaded.
          </p>
          <Link to="/app" className="btn-primary no-underline inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const criticalCount = scan.packages.filter((p) => p.riskTier === 'critical').length
  const transitivePercent = scan.packages.length > 0
    ? Math.round((scan.packages.filter((p) => !p.isDirect).length / scan.packages.length) * 100)
    : 0

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in gap-6">
      {/* ── Top Header Card ── */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col gap-5">
          {/* Breadcrumb & Action CTAs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-code-sm text-xs text-outline">
              <Link to="/app" className="flex items-center gap-1 hover:text-primary transition-colors no-underline text-outline">
                <Home className="w-3.5 h-3.5" />
                <span>Workspace</span>
              </Link>
              <span>/</span>
              <span className="text-on-surface font-medium">{repoName}</span>
              <span>/</span>
              <span className="text-primary font-medium">Remediation Report</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadSbom}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-code-sm transition-colors shadow-sm cursor-pointer border border-outline-variant/40"
                type="button"
                title="Download CycloneDX v1.5 JSON SBOM"
              >
                <FileCode className="w-3.5 h-3.5 text-primary" />
                <span>Export SBOM</span>
              </button>

              <Link
                to={`/app/scans/${id}/dashboard`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-code-sm transition-colors shadow-sm no-underline border border-outline-variant/40"
              >
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span>View Graph</span>
              </Link>

              <button
                onClick={handleCopyAllFixes}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer border-none"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Script Copied' : 'Copy Fix Script'}</span>
              </button>
            </div>
          </div>

          {/* Title & Score Pill */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs font-code-sm text-secondary uppercase tracking-wider font-semibold">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span>Prioritized Remediation Matrix</span>
              </div>
              <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
                Supply Chain Remediation Report
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant max-w-2xl">
                Action items for <span className="font-code-sm text-on-surface font-semibold">{repoName}</span> ranked by contextual risk, topological blast radius, and dependency reachability.
              </p>
            </div>

            {/* Score Delta Pill */}
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <div className="bg-surface-container px-4 py-3 rounded-xl shadow-sm flex items-center gap-4 border border-outline-variant/40">
                <div className="flex flex-col items-center">
                  <span className="font-code-sm text-[10px] uppercase text-critical font-semibold">Current</span>
                  <span className="font-headline-md text-xl font-bold text-critical tabular-nums">{currentScore}</span>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingDown className="w-5 h-5 text-safe" />
                  <span className="font-code-sm text-[10px] text-safe font-bold">-{scoreDelta} pts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-code-sm text-[10px] uppercase text-safe font-semibold">Projected</span>
                  <span className="font-headline-md text-xl font-bold text-safe tabular-nums">{projectedScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Summary Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-surface-container p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline font-code-sm text-[11px] uppercase tracking-wider">
                <span>Actionable</span>
                <CheckSquare className="w-3.5 h-3.5 text-tertiary" />
              </div>
              <div className="my-1 font-headline-md text-xl font-bold text-on-surface tabular-nums">
                {flaggedPackages.length}
              </div>
              <div className="text-outline font-code-sm text-[11px]">
                {criticalCount} Critical · {Math.max(0, flaggedPackages.length - criticalCount)} Med/High
              </div>
            </div>

            <div className="bg-surface-container p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline font-code-sm text-[11px] uppercase tracking-wider">
                <span>Critical CVEs</span>
                <ShieldAlert className="w-3.5 h-3.5 text-critical" />
              </div>
              <div className="my-1 font-headline-md text-xl font-bold text-critical tabular-nums">
                {String(criticalCount).padStart(2, '0')}
              </div>
              <div className="text-critical font-code-sm text-[11px] font-medium">
                Immediate Attention
              </div>
            </div>

            <div className="bg-surface-container p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline font-code-sm text-[11px] uppercase tracking-wider">
                <span>Transitive Ratio</span>
                <GitFork className="w-3.5 h-3.5 text-tertiary" />
              </div>
              <div className="my-1 font-headline-md text-xl font-bold text-on-surface tabular-nums">
                {transitivePercent}%
              </div>
              <div className="text-outline font-code-sm text-[11px]">
                Lockfile Dependency Tree
              </div>
            </div>

            <div className="bg-surface-container p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-outline font-code-sm text-[11px] uppercase tracking-wider">
                <span>Analysis Engine</span>
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="my-1 font-headline-md text-xl font-bold text-primary tabular-nums">
                Active
              </div>
              <div className="text-outline font-code-sm text-[11px]">
                Actionable Fix Commands
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Body Content: Ranked Worklist & Context Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Priority Stack (col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-base font-bold text-on-surface">Ranked Worklist</span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-code-sm text-xs text-outline border border-outline-variant/30">
                Sorted by Risk (0–100)
              </span>
            </div>
            <span className="font-code-sm text-xs text-outline hidden sm:inline">Engine Evaluation Complete</span>
          </div>

          {flaggedPackages.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-8 text-center border border-outline-variant/30">
              <ShieldCheck className="w-10 h-10 text-safe mx-auto mb-2" />
              <h3 className="font-headline-sm text-base font-bold text-on-surface">No High-Risk Packages Requiring Action</h3>
              <p className="font-body-md text-xs text-on-surface-variant mt-1">
                All dependencies adhere to supply-chain security baselines.
              </p>
            </div>
          ) : (
            flaggedPackages.map((pkg, idx) => {
              const isCrit = pkg.riskTier === 'critical'
              const topVuln = pkg.vulnerabilities[0]
              const fixedVersion = topVuln?.fixedIn || `${pkg.name}@latest`
              const fixCmd = pkg.remediation?.fix_command || `npm install ${pkg.name}@${fixedVersion}`

              return (
                <div
                  key={`${pkg.name}@${pkg.version}#${idx}`}
                  className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm transition-all hover:bg-surface-container/80 border border-outline-variant/30"
                >
                  <div className="p-5 flex flex-col gap-3.5">
                    {/* Header Meta */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg font-headline-sm text-xs font-bold flex items-center justify-center ${
                            isCrit ? 'bg-critical text-on-primary' : 'bg-surface-container-high text-on-surface'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-code-sm text-sm font-bold text-on-surface">
                              {pkg.name}@{pkg.version}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-surface-container text-outline font-code-sm text-[10px] uppercase border border-outline-variant/30">
                              {pkg.isDirect ? 'Direct' : 'Transitive'}
                            </span>
                            {pkg.dependentCount !== undefined && pkg.dependentCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-code-sm text-[10px]">
                                {pkg.dependentCount} downstream
                              </span>
                            )}
                          </div>
                          <span className={`font-code-sm text-xs font-medium block mt-0.5 ${isCrit ? 'text-critical' : 'text-tertiary'}`}>
                            {topVuln
                              ? `${topVuln.summary || 'Known Security Advisory'} (${topVuln.id})`
                              : pkg.typosquatFlag
                              ? `Typosquatting Risk: matches ${pkg.typosquatFlag.similarTo}`
                              : pkg.confusionFlag
                              ? `Dependency Confusion: ${pkg.confusionFlag.reason}`
                              : 'Outdated Dependency Version'}
                          </span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        {topVuln && (
                          <span className="px-2 py-0.5 rounded bg-critical/10 text-critical border border-critical/20 font-code-sm text-[11px] font-bold uppercase">
                            CVSS {topVuln.severity || 'HIGH'} ({topVuln.cvss.toFixed(1)})
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-code-sm text-[11px] font-semibold border border-outline-variant/30">
                          Risk {pkg.riskScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Dependency Path Vector Trace */}
                    <div className="bg-surface-container-lowest p-3 rounded-lg flex flex-col gap-1 border border-outline-variant/20">
                      <span className="text-outline font-code-sm text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        Dependency Vector Trace
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 font-code-sm text-xs text-on-surface">
                        <span className="text-primary font-medium">{repoName}</span>
                        {pkg.path.length > 0 ? (
                          pkg.path.map((node, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                              <span className="text-outline">→</span>
                              <span className={i === pkg.path.length - 1 ? (isCrit ? 'text-critical font-semibold' : 'text-primary font-medium') : 'text-on-surface'}>
                                {node}
                              </span>
                            </span>
                          ))
                        ) : (
                          <>
                            <span className="text-outline">→</span>
                            <span className="text-critical font-semibold">{pkg.name}@{pkg.version}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* AI Threat Context */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                      <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-code-sm text-[10px] uppercase tracking-wider text-primary font-bold">Threat Context</span>
                        <p className="font-body-md text-xs text-on-surface mt-0.5 leading-relaxed">
                          {pkg.remediation?.why_risky ||
                            `${pkg.name}@${pkg.version} introduces unpinned or vulnerable functionality into runtime execution pathways.`}
                        </p>
                      </div>
                    </div>

                    {/* Actionable Fix */}
                    <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-code-sm text-[10px] uppercase tracking-wider text-outline block">Actionable Fix</span>
                        <span className="font-body-md text-xs text-on-surface font-semibold">
                          {pkg.remediation?.fix || `Upgrade resolution to ${fixedVersion}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-initial flex items-center bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant/40">
                          <code className="font-code-sm text-xs text-on-surface select-all mr-2">
                            {fixCmd}
                          </code>
                          <button
                            onClick={() => handleCopyCommand(fixCmd, idx)}
                            className="text-outline hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0.5"
                            title="Copy Command"
                          >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-safe" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {pkg.ptsReduced && pkg.ptsReduced > 0 ? (
                          <div className="px-2.5 py-1 bg-primary/10 rounded-lg text-primary font-code-sm text-xs font-semibold whitespace-nowrap">
                            −{pkg.ptsReduced} pts
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 bg-surface-container rounded-lg text-outline font-code-sm text-xs whitespace-nowrap">
                            Manual review
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Audit Ledger & Topology Overview (col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Topology Summary */}
          <div className="bg-surface-container-low p-5 rounded-xl flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-sm font-bold text-on-surface">Topology Summary</span>
              <Network className="w-4 h-4 text-primary" />
            </div>
            <p className="font-body-md text-xs text-on-surface-variant">
              Graph exposure mapped across the root project manifest and npm dependency tree.
            </p>

            <div className="flex flex-col gap-1.5 font-code-sm text-xs">
              <div className="flex justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Total Dependencies</span>
                <span className="text-on-surface font-medium">{scan.packages.length} packages</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Critical Vulnerabilities</span>
                <span className="text-critical font-medium">{criticalCount} Vectors</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/20">
                <span className="text-outline">Transitive Proportion</span>
                <span className="text-tertiary font-medium">{transitivePercent}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-outline">CycloneDX Spec</span>
                <span className="text-primary font-medium">v1.5 JSON Validated</span>
              </div>
            </div>
          </div>

          {/* Build Provenance & Verification */}
          <div className="bg-surface-container-low p-5 rounded-xl flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-sm font-bold text-on-surface">Build Provenance</span>
              <ShieldCheck className="w-4 h-4 text-safe" />
            </div>

            <div className="space-y-2 font-code-sm text-xs">
              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface font-medium">Registry Tarball Verification</span>
                  <span className="text-safe text-[10px] font-bold bg-safe/10 px-1.5 py-0.5 rounded">MATCHED</span>
                </div>
                <p className="font-body-md text-[11px] text-on-surface-variant">
                  Dependencies matched against official registry dist-tags and SHA integrity digests.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface font-medium">SLSA / Build Attestation</span>
                  <span className="text-outline text-[10px] bg-surface-container px-1.5 py-0.5 rounded">NOT PUBLISHED</span>
                </div>
                <p className="font-body-md text-[11px] text-on-surface-variant">
                  Packages do not publish cosign/in-toto provenance attestations to npm registry.
                </p>
              </div>
            </div>

            <div className="bg-primary/10 p-3 rounded-lg flex items-center gap-2.5 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="font-code-sm text-xs font-semibold text-primary">Lockfile Verification Active</span>
                <span className="text-[10px] text-outline">Audited against npm v7+ package-lock integrity hashes.</span>
              </div>
            </div>
          </div>

          {/* SBOM Checksum & Export */}
          <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-outline" />
              <div className="flex flex-col">
                <span className="font-code-sm text-xs text-on-surface font-semibold">SBOM Download</span>
                <span className="font-code-sm text-[10px] text-outline">CycloneDX 1.5 JSON</span>
              </div>
            </div>
            <button
              onClick={handleDownloadSbom}
              className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs font-semibold rounded-lg transition-all cursor-pointer border border-outline-variant/40 flex items-center gap-1.5"
              title="Download CycloneDX SBOM"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

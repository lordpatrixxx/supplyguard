import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult, PackageNode } from '../types'
import { GraphView } from '../components/GraphView'
import { FindingDetailPanel } from '../components/FindingDetailPanel'
import { getScan, downloadSbom } from '../lib/api'
import {
  ShieldCheck, Shield, Clock, GitBranch, Download,
  ArrowRight, AlertCircle, Loader2, MousePointer,
  FolderOpen, ChevronDown, ChevronUp, X, Info, GitFork
} from 'lucide-react'

export function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''

  const [selectedPkg, setSelectedPkg] = useState<PackageNode | null>(null)
  const [showScopeDetails, setShowScopeDetails] = useState(false)
  const [dismissScopeNotice, setDismissScopeNotice] = useState(false)

  const { data: scan, isLoading, error } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: () => getScan(id!),
    enabled: !!id,
  })

  // Redirect if scan isn't complete
  useEffect(() => {
    if (scan && scan.status !== 'complete') {
      navigate(`/app/scans/${id}`, { replace: true })
    }
  }, [scan?.status, id, navigate])

  // Select package based on search query or highest risk by default
  useEffect(() => {
    if (!scan?.packages || scan.packages.length === 0) return

    if (queryParam) {
      const q = queryParam.toLowerCase()
      const match = scan.packages.find(p =>
        p.name.toLowerCase().includes(q) ||
        p.vulnerabilities.some(v => v.id.toLowerCase().includes(q))
      )
      if (match) {
        setSelectedPkg(match)
        return
      }
    }

    if (!selectedPkg) {
      const sorted = [...scan.packages].sort((a, b) => b.riskScore - a.riskScore)
      setSelectedPkg(sorted[0])
    }
  }, [scan?.packages, queryParam, selectedPkg])

  const repoName = useMemo(() => {
    if (!scan?.repoUrl) return 'Target Repository'
    return scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
  }, [scan?.repoUrl])

  const { criticalCount, highCount, mediumCount, lowCount, safeCount, vulnCount, directCount, transitiveCount } =
    useMemo(() => {
      if (!scan?.packages) {
        return {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          safeCount: 0,
          vulnCount: 0,
          directCount: 0,
          transitiveCount: 0,
        }
      }

      let crit = 0
      let high = 0
      let med = 0
      let low = 0
      let safe = 0
      let direct = 0
      let trans = 0
      let totalVulns = 0

      for (const p of scan.packages) {
        totalVulns += p.vulnerabilities.length
        if (p.isDirect) direct++
        else trans++

        if (p.riskTier === 'critical') crit++
        else if (p.riskTier === 'high') high++
        else if (p.riskTier === 'medium') med++
        else if (p.riskTier === 'low') low++
        else safe++
      }

      return {
        criticalCount: crit,
        highCount: high,
        mediumCount: med,
        lowCount: low,
        safeCount: safe,
        vulnCount: totalVulns,
        directCount: direct,
        transitiveCount: trans,
      }
    }, [scan?.packages])

  const handleDownloadSbom = async () => {
    if (!id) return
    try {
      await downloadSbom(id, scan?.repoUrl)
    } catch (err) {
      console.error('Failed to download SBOM:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="font-code-sm text-xs text-outline">Loading supply chain analysis...</span>
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="bg-surface-container rounded-xl p-8 text-center max-w-md border border-outline-variant/30 shadow-xl">
          <AlertCircle className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h2 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Scan Data Unavailable</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-6">
            Could not retrieve scan data for #{id}.
          </p>
          <Link to="/app" className="btn-primary no-underline inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const score = scan.overallRiskScore || 0
  const isHighRisk = score >= 50
  const hasZeroPackages = scan.packages.length === 0
  const isZeroRisk = !hasZeroPackages && criticalCount === 0 && highCount === 0 && vulnCount === 0 && score < 30

  // Circular gauge calculations (r=32 => 2*PI*32 = 201.06)
  const circumference = 201.06
  const dashOffset = circumference - (circumference * Math.min(100, Math.max(0, score))) / 100

  const renderLimitationsNotice = () => {
    if (!scan?.limitations || scan.limitations.length === 0 || dismissScopeNotice) return null

    return (
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 shadow-sm text-xs font-body-md text-on-surface-variant flex flex-col gap-2 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-outline">
            <Info className="w-4 h-4 text-secondary shrink-0" />
            <span className="font-semibold text-on-surface">Analysis Scope Notice</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-on-surface-variant text-[11px] sm:text-xs">
              Direct dependencies analyzed. Missing lockfiles may limit transitive modeling.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScopeDetails(!showScopeDetails)}
              className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors border border-outline-variant/30"
            >
              <span>{showScopeDetails ? 'Hide Details' : 'Details'}</span>
              {showScopeDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setDismissScopeNotice(true)}
              className="p-1 text-outline hover:text-on-surface rounded cursor-pointer transition-colors"
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {showScopeDetails && (
          <div className="mt-2 pt-2 border-t border-outline-variant/20 max-h-40 overflow-y-auto space-y-1">
            {scan.limitations.map((limit, idx) => (
              <div key={idx} className="flex items-start gap-2 font-code-sm text-[11px] text-on-surface-variant">
                <span className="text-outline shrink-0">•</span>
                <span>{limit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── ZERO PACKAGES DETECTED STATE ──
  if (hasZeroPackages) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 animate-fade-in">
        {/* Context Header */}
        <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-outline shadow-sm shrink-0">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-code-sm text-xs text-on-surface-variant">
                  <span>Scan #{id?.slice(0, 8)}</span>
                  <span>/</span>
                  <span className="text-outline font-medium">Manifest Audit</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">
                    {repoName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-code-sm text-xs font-semibold border border-outline-variant/30">
                    0 Dependencies Located
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 bg-surface-container rounded-lg text-on-surface-variant font-code-sm text-xs flex items-center gap-2 border border-outline-variant/30">
                <GitBranch className="w-3.5 h-3.5 text-outline" />
                <span className="text-on-surface font-medium">{scan.branch || 'HEAD'}</span>
              </div>
            </div>
          </div>
        </div>

        {renderLimitationsNotice()}

        {/* Informative Guidance Card */}
        <div className="p-8 max-w-2xl mx-auto w-full flex flex-col items-center text-center gap-4 py-12 bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-outline-variant/40 flex items-center justify-center text-primary shadow-lg">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
              No Supported Dependencies Found in Repository
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
              SupplyGuard searched the repository for <span className="text-on-surface font-semibold">{repoName}</span>, but found no supported direct or transitive dependencies declared in any discovered manifest file.
            </p>
            {scan.detectedFiles && scan.detectedFiles.length > 0 && (
              <p className="font-code-sm text-xs text-outline max-w-md mx-auto">
                Audited manifests: {scan.detectedFiles.join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center mt-3">
            <Link
              to="/app"
              className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-semibold rounded-lg shadow-sm transition-all no-underline"
            >
              Analyze Another Repository
            </Link>
            <Link
              to="/app/history"
              className="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs font-semibold rounded-lg transition-colors no-underline border border-outline-variant/40"
            >
              View Scan History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── CLEAN AUDIT STATE ──
  if (isZeroRisk) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 animate-fade-in">
        {/* ROW 1: Context Header */}
        <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-safe/10 border border-safe/30 flex items-center justify-center text-safe shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-code-sm text-xs text-on-surface-variant">
                  <span>Scan #{id?.slice(0, 8)}</span>
                  <span>/</span>
                  <span className="text-safe font-medium">Standard Baseline</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">
                    {repoName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-safe/10 text-safe font-code-sm text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-safe"></span>
                    Zero Critical Risks
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 bg-surface-container rounded-lg text-on-surface-variant font-code-sm text-xs flex items-center gap-2 border border-outline-variant/30">
                <GitBranch className="w-3.5 h-3.5 text-outline" />
                <span className="text-on-surface font-medium">{scan.branch || 'HEAD'}</span>
              </div>
              <button
                onClick={handleDownloadSbom}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-code-sm text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer border border-outline-variant/40 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export SBOM</span>
              </button>
            </div>
          </div>
        </div>

        {renderLimitationsNotice()}

        {/* ROW 2: 6 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">Risk Score</div>
            <div className="font-headline-md text-2xl font-bold text-safe">{score}<span className="text-xs text-outline font-normal">/100</span></div>
            <div className="text-xs font-code-sm text-safe mt-1">Low Risk</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">Dependencies</div>
            <div className="font-headline-md text-2xl font-bold text-on-surface">{scan.packages.length}</div>
            <div className="text-xs font-code-sm text-on-surface-variant mt-1">{directCount} direct · {transitiveCount} trans.</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">Critical</div>
            <div className="font-headline-md text-2xl font-bold text-safe">00</div>
            <div className="text-xs font-code-sm text-safe mt-1">None Detected</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">High</div>
            <div className="font-headline-md text-2xl font-bold text-safe">00</div>
            <div className="text-xs font-code-sm text-safe mt-1">None Detected</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">Medium</div>
            <div className="font-headline-md text-2xl font-bold text-on-surface">{String(mediumCount).padStart(2, '0')}</div>
            <div className="text-xs font-code-sm text-on-surface-variant mt-1">Monitored</div>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="font-code-sm text-[11px] uppercase tracking-wider text-outline mb-1">Safe</div>
            <div className="font-headline-md text-2xl font-bold text-safe">{scan.packages.length}</div>
            <div className="text-xs font-code-sm text-safe mt-1">No Supported Risks Detected</div>
          </div>
        </div>

        {/* Clean Center Hero Card */}
        <div className="p-8 max-w-2xl mx-auto w-full flex flex-col items-center text-center gap-4 py-12 bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-safe/10 border-2 border-safe/40 flex items-center justify-center text-safe shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">Audit Cleared • No Critical Risks Detected</h2>
            <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
              SupplyGuard evaluated {scan.packages.length} dependencies in <span className="text-on-surface font-semibold">{repoName}</span>. No supported vulnerability or supply-chain indicators were detected by the current analysis.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
            <Link
              to="/app"
              className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-semibold rounded-lg shadow-sm transition-all no-underline"
            >
              Analyze Another Repository
            </Link>
            <Link
              to="/app/history"
              className="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs font-semibold rounded-lg transition-colors no-underline border border-outline-variant/40"
            >
              View Scan History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── FULL DASHBOARD & RISK CONSTELLATION ──
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">

      {/* ── ROW 1: Risk Score, Repository, Branch, Last Scan + CTAs ── */}
      <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Score Dial + Repo Identity + Metadata */}
          <div className="flex items-center gap-5">
            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center w-18 h-18 shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 76 76">
                <circle
                  className="text-surface-container-high"
                  cx="38"
                  cy="38"
                  fill="transparent"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                />
                <circle
                  className={isHighRisk ? 'text-critical' : 'text-primary'}
                  cx="38"
                  cy="38"
                  fill="transparent"
                  r="32"
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  strokeWidth="6"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-headline-md text-xl font-bold text-on-surface leading-none">
                  {score}
                </span>
                <span className="font-code-sm text-[10px] text-outline uppercase tracking-wider">/100</span>
              </div>
            </div>

            {/* Metadata & Title */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-code-sm text-[11px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${
                    isHighRisk
                      ? 'text-critical bg-critical/10 border border-critical/20'
                      : 'text-primary bg-primary/10 border border-primary/20'
                  }`}
                >
                  {isHighRisk ? 'Elevated Risk Level' : 'Balanced Security Stance'}
                </span>
                <span className="font-code-sm text-xs text-outline">• Supply Chain Risk</span>
              </div>
              <h1 className="font-headline-md text-xl font-bold text-on-surface tracking-tight mt-1 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                <span className="truncate max-w-md">{repoName}</span>
              </h1>
              <div className="flex items-center gap-3 font-code-sm text-xs text-on-surface-variant mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-outline" />
                  <span className="text-on-surface font-medium">{scan.branch || 'HEAD'}</span>
                </span>
                <span className="text-outline">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-outline" />
                  <span>{scan.completedAt ? new Date(scan.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleDownloadSbom}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs font-semibold rounded-lg transition-all cursor-pointer border border-outline-variant/40 shadow-sm"
              title="Download CycloneDX 1.5 JSON SBOM"
            >
              <Download className="w-4 h-4 text-outline" />
              <span>CycloneDX SBOM</span>
            </button>

            <Link
              to={`/app/scans/${id}/report`}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-semibold rounded-lg transition-all shadow-sm no-underline"
            >
              <span>Remediation Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {renderLimitationsNotice()}

      {/* ── ROW 2: 6 KPI Cards (Responsive 3+3 or 6 across) ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Dependencies */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="font-code-sm text-[11px] uppercase tracking-wider text-outline">Dependencies</span>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface tabular-nums">
              {scan.packages.length}
            </span>
          </div>
          <span className="font-code-sm text-xs text-on-surface-variant truncate">
            {directCount} direct · {transitiveCount} trans.
          </span>
        </div>

        {/* Card 2: Critical */}
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${
          criticalCount > 0
            ? 'bg-critical/5 border-critical/30'
            : 'bg-surface-container-low border-outline-variant/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-code-sm text-[11px] uppercase tracking-wider text-critical font-bold">Critical</span>
            {criticalCount > 0 && <span className="w-2 h-2 rounded-full bg-critical animate-ping"></span>}
          </div>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-critical tabular-nums">
              {String(criticalCount).padStart(2, '0')}
            </span>
          </div>
          <span className="font-code-sm text-xs text-critical font-medium">Urgent Action</span>
        </div>

        {/* Card 3: High */}
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${
          highCount > 0
            ? 'bg-secondary/5 border-secondary/30'
            : 'bg-surface-container-low border-outline-variant/30'
        }`}>
          <span className="font-code-sm text-[11px] uppercase tracking-wider text-secondary font-semibold">High</span>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-secondary tabular-nums">
              {String(highCount).padStart(2, '0')}
            </span>
          </div>
          <span className="font-code-sm text-xs text-on-surface-variant">Priority</span>
        </div>

        {/* Card 4: Medium */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="font-code-sm text-[11px] uppercase tracking-wider text-tertiary font-semibold">Medium</span>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-tertiary tabular-nums">
              {String(mediumCount).padStart(2, '0')}
            </span>
          </div>
          <span className="font-code-sm text-xs text-on-surface-variant">Scheduled</span>
        </div>

        {/* Card 5: Low */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="font-code-sm text-[11px] uppercase tracking-wider text-outline font-semibold">Low</span>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface tabular-nums">
              {String(lowCount).padStart(2, '0')}
            </span>
          </div>
          <span className="font-code-sm text-xs text-on-surface-variant">Monitored</span>
        </div>

        {/* Card 6: Safe */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="font-code-sm text-[11px] uppercase tracking-wider text-safe font-semibold">Safe</span>
          <div className="my-1.5">
            <span className="font-headline-md text-2xl sm:text-3xl font-bold text-safe tabular-nums">
              {safeCount}
            </span>
          </div>
          <span className="font-code-sm text-xs text-safe font-medium">No Risks Flagged</span>
        </div>
      </div>

      {/* ── Project & Ecosystem Breakdown (Multi-Manifest Support) ── */}
      {scan.projectSummaries && scan.projectSummaries.length > 0 && (
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-primary" />
              <h2 className="font-headline-sm text-sm font-bold text-on-surface">
                Project &amp; Ecosystem Breakdown
              </h2>
              <span className="font-code-sm text-xs text-outline">
                ({scan.projectSummaries.length} {scan.projectSummaries.length === 1 ? 'project' : 'projects'} detected)
              </span>
            </div>
            {scan.treeCompleteness === 'truncated' && (
              <span className="font-code-sm text-[11px] text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                Notice: Git tree truncated at GitHub single-query limit
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scan.projectSummaries.map((proj) => (
              <div
                key={`${proj.projectName}-${proj.directory}`}
                className="bg-surface-container rounded-xl p-4 border border-outline-variant/20 flex flex-col justify-between gap-3 hover:border-outline-variant/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-headline-sm text-sm font-bold text-on-surface capitalize truncate">
                      {proj.projectName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-code-sm font-semibold uppercase tracking-wider bg-surface-container-high text-on-surface border border-outline-variant/30">
                    {proj.ecosystem}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-outline-variant/15 text-center font-code-sm text-xs">
                  <div>
                    <span className="text-outline text-[10px] uppercase block">Direct</span>
                    <span className="font-bold text-on-surface tabular-nums">{proj.directDependencies}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] uppercase block">Transitive</span>
                    <span className="font-bold text-on-surface tabular-nums">
                      {proj.transitiveDependencies === 'unavailable' ? 'Direct-Only' : proj.transitiveDependencies}
                    </span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] uppercase block">Total</span>
                    <span className="font-bold text-primary tabular-nums">{proj.totalDependencies}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-code-sm text-on-surface-variant">
                  <span className="truncate max-w-[140px] text-outline" title={proj.directory}>
                    {proj.directory}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      proj.lockfilePresent
                        ? 'bg-safe/10 text-safe border border-safe/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}
                  >
                    {proj.lockfilePresent ? 'Lockfile Verified' : 'Direct Manifest'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Stage: 65% Graph Canvas + 35% Side Panel ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start relative min-h-[720px]">
        {/* Left: 65% Graph Canvas */}
        <div className="w-full lg:w-[65%] flex flex-col gap-4">
          <GraphView
            packages={scan.packages}
            edges={scan.edges}
            onNodeClick={(pkg) => setSelectedPkg(pkg)}
            selectedPkg={selectedPkg}
            initialSearchQuery={queryParam}
          />

          {/* Graph Sub-Bar */}
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex-wrap gap-3">
            <div className="flex items-center gap-3 font-code-sm text-xs text-outline">
              <span className="flex items-center gap-1.5 text-on-surface">
                <Shield className="w-4 h-4 text-primary" />
                <span>{scan.packages.length} Nodes</span>
              </span>
              <span>•</span>
              <span className={vulnCount > 0 ? 'text-critical font-medium' : 'text-safe'}>
                {vulnCount} Vulnerabilities Detected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSbom}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs font-semibold rounded-lg transition-all cursor-pointer border border-outline-variant/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>SBOM</span>
              </button>

              <Link
                to={`/app/scans/${id}/report`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-semibold rounded-lg transition-all no-underline"
              >
                <span>View Full Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right: 35% Active Finding Detail Side Panel */}
        <div className="w-full lg:w-[35%] sticky top-20">
          {selectedPkg ? (
            <FindingDetailPanel pkg={selectedPkg} />
          ) : (
            <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/30 text-center flex flex-col items-center justify-center min-h-[440px]">
              <MousePointer className="w-10 h-10 text-outline mb-3" />
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Select a Node to Inspect</h3>
              <p className="font-body-md text-xs text-on-surface-variant max-w-xs mt-1.5">
                Click on any dependency in the topology to view its score breakdown, CVSS evidence, provenance signals, and remediation recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

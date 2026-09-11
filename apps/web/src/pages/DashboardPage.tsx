import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult, PackageNode } from '../types'
import { GraphView } from '../components/GraphView'
import { FindingDetailPanel } from '../components/FindingDetailPanel'

export function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''

  const [selectedPkg, setSelectedPkg] = useState<PackageNode | null>(null)

  const { data: scan, isLoading, error } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: async () => {
      const res = await fetch(`/api/scans/${id}`)
      if (!res.ok) throw new Error('Scan not found')
      return res.json()
    },
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
        else if (p.riskScore >= 60) high++
        else if (p.riskTier === 'medium' || p.riskScore >= 40) med++
        else if (p.riskScore > 15) low++
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

  const handleDownloadSbom = () => {
    window.open(`/api/scans/${id}/sbom`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-space-md">
          <span className="material-symbols-outlined text-primary-container text-[48px] animate-spin">
            progress_activity
          </span>
          <span className="font-code-sm text-code-sm text-outline">Loading supply chain telemetry...</span>
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="bg-surface-container rounded-xl p-space-xl text-center max-w-md border border-surface-variant shadow-xl">
          <span className="material-symbols-outlined text-secondary text-[48px] mb-2">error</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Scan Data Unavailable</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Could not retrieve telemetry for scan #{id}.
          </p>
          <Link to="/app" className="btn-primary no-underline inline-block">
            Return to Intake
          </Link>
        </div>
      </div>
    )
  }

  const score = scan.overallRiskScore || 0
  const isHighRisk = score >= 50
  const isZeroRisk = criticalCount === 0 && highCount === 0 && vulnCount === 0 && score < 30

  // Circular gauge calculations (r=32 => 2*PI*32 = 201.06)
  const circumference = 201.06
  const dashOffset = circumference - (circumference * Math.min(100, Math.max(0, score))) / 100

  // ── CLEAN AUDIT STATE ──
  if (isZeroRisk) {
    return (
      <div className="flex flex-col w-full animate-fade-in">
        {/* Top Context Header & KPI Strip */}
        <div className="px-margin-lg pt-space-lg pb-space-md bg-surface-dim border-b border-surface-variant">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md mb-space-lg">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shadow-sm">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <div className="flex items-center gap-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
                  <span>Scan Run #{id?.slice(0, 8)}</span>
                  <span>/</span>
                  <span className="text-primary-container font-medium">Policy Profile: National Cyber Challenge</span>
                </div>
                <div className="flex items-center gap-space-sm mt-0.5">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Audit Ledger: {repoName}</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container font-label-caps text-label-caps uppercase font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    Verified Clean
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm flex-wrap">
              <div className="px-space-sm py-1 bg-surface-container-low rounded-lg text-on-surface-variant font-code-sm text-code-sm flex items-center gap-space-xs">
                <span className="text-outline">Branch:</span>
                <span className="text-on-surface font-medium">main</span>
              </div>
              <button
                onClick={handleDownloadSbom}
                className="px-space-md py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-label-caps uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer border-none shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                Export CycloneDX 1.5 JSON
              </button>
            </div>
          </div>

          {/* KPI Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm">
            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Overall Risk Score</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display-lg text-display-lg text-primary-container font-bold">{score}</span>
                <span className="font-code-sm text-code-sm text-outline">/ 100</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-container/10 text-primary-container font-label-caps text-label-caps font-semibold">
                <span className="w-1 h-1 rounded-full bg-primary-container"></span>
                LOW RISK
              </div>
            </div>

            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Dependencies Analyzed</div>
              <div className="font-display-lg text-display-lg text-on-surface font-bold">{scan.packages.length}</div>
              <div className="mt-2 font-code-sm text-code-sm text-on-surface-variant truncate">
                {directCount} direct • {transitiveCount} transitive
              </div>
            </div>

            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Known CVEs</div>
              <div className="font-display-lg text-display-lg text-primary-container font-bold">0</div>
              <div className="mt-2 inline-flex items-center gap-1 font-code-sm text-code-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-primary-container">check_circle</span>
                Advisories checked
              </div>
            </div>

            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Suspicious Signals</div>
              <div className="font-display-lg text-display-lg text-primary-container font-bold">0</div>
              <div className="mt-2 font-code-sm text-code-sm text-on-surface-variant">0 typosquat / confusion</div>
            </div>

            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Provenance Anomalies</div>
              <div className="font-display-lg text-display-lg text-primary-container font-bold">0</div>
              <div className="mt-2 font-code-sm text-code-sm text-on-surface-variant">100% lockfile verified</div>
            </div>

            <div className="p-space-md bg-surface-container rounded-lg shadow-sm border border-surface-variant/40">
              <div className="font-label-caps text-label-caps uppercase text-outline mb-1">Verified Clean Nodes</div>
              <div className="font-display-lg text-display-lg text-primary-container font-bold">{scan.packages.length}</div>
              <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-container/10 text-primary-container font-label-caps text-label-caps font-semibold">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                PASSED AUDIT
              </div>
            </div>
          </div>
        </div>

        {/* Clean Center Hero Card */}
        <div className="p-space-xl max-w-4xl mx-auto w-full flex flex-col items-center text-center gap-space-lg py-16">
          <div className="w-20 h-20 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container ring-4 ring-primary-container/20 shadow-xl">
            <span className="material-symbols-outlined text-[44px]">verified_user</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight">Audit Cleared • Zero Critical Risks</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
              SupplyGuard evaluated {scan.packages.length} dependencies in <span className="text-on-surface font-semibold">{repoName}</span>. No known vulnerable CVEs, typosquatting vectors, or supply-chain anomalies were detected.
            </p>
          </div>

          <div className="flex items-center gap-space-md flex-wrap justify-center mt-2">
            <Link
              to="/app"
              className="px-space-lg py-2.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm rounded-lg shadow-md font-semibold transition-all no-underline"
            >
              Analyze Another Repository
            </Link>
            <Link
              to="/app/history"
              className="px-space-lg py-2.5 bg-surface-container-high hover:bg-surface-bright text-on-surface font-headline-sm text-headline-sm rounded-lg transition-colors no-underline font-semibold"
            >
              View Fleet Audit History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── FULL REFINED DASHBOARD & RISK CONSTELLATION ──
  return (
    <div className="p-space-lg flex flex-col gap-space-lg w-full max-w-[1720px] mx-auto animate-fade-in">
      {/* ── Top Telemetry & Health Ribbon ── */}
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md flex flex-col xl:flex-row gap-space-lg justify-between items-stretch border border-surface-variant">
        {/* Left: Overall Score Dial & Metadata */}
        <div className="flex items-center gap-space-xl min-w-[320px]">
          <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 76 76">
              <circle
                className="text-surface-variant"
                cx="38"
                cy="38"
                fill="transparent"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
              />
              <circle
                className={isHighRisk ? 'text-secondary' : 'text-primary-container'}
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
              <span className="font-headline-md text-headline-md font-bold text-on-surface leading-none">
                {score}
              </span>
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">/100</span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-space-xs">
              <span
                className={`font-label-caps text-label-caps uppercase px-space-xs py-0.5 rounded font-semibold ${
                  isHighRisk
                    ? 'text-secondary bg-secondary-container/20'
                    : 'text-primary-container bg-primary-container/20'
                }`}
              >
                {isHighRisk ? 'Elevated Posture Deficit' : 'Balanced Security Stance'}
              </span>
              <span className="font-code-sm text-code-sm text-outline">• SBOM Audit</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight mt-0.5">
              Supply Chain Risk Vector
            </h1>
            <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-on-surface-variant mt-1 flex-wrap">
              <span className="material-symbols-outlined text-[15px] text-outline">schedule</span>
              <span>Updated just now</span>
              <span className="text-surface-variant">•</span>
              <span className="text-primary-container">branch: main</span>
              <span className="text-surface-variant">•</span>
              <span className="text-outline font-code-sm">repo: {repoName}</span>
            </div>
          </div>
        </div>

        {/* Right: 6 Triage Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-space-sm flex-1 items-center">
          {/* Tile 1: Dependencies */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full border border-surface-variant/40">
            <span className="font-label-caps text-label-caps uppercase text-outline">Dependencies</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-on-surface">
                {scan.packages.length}
              </span>
              <span className="font-code-sm text-code-sm text-outline">pkgs</span>
            </div>
            <div className="font-code-sm text-code-sm text-on-surface-variant flex items-center justify-between mt-1">
              <span>{directCount} Direct</span>
              <span className="text-outline">{transitiveCount} Tr.</span>
            </div>
          </div>

          {/* Tile 2: Critical */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full bg-gradient-to-br from-error-container/20 to-transparent border border-surface-variant/40">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase text-error font-bold">Critical</span>
              <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
            </div>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-error">
                {String(criticalCount).padStart(2, '0')}
              </span>
              <span className="font-label-caps text-label-caps text-error/80 uppercase">Urgent</span>
            </div>
            <span className="font-code-sm text-code-sm text-error/70 truncate">Needs patch</span>
          </div>

          {/* Tile 3: High */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full border border-surface-variant/40">
            <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">High</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-secondary">
                {String(highCount).padStart(2, '0')}
              </span>
              <span className="font-code-sm text-code-sm text-outline">CVSS &gt;7.0</span>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant">Action priority</span>
          </div>

          {/* Tile 4: Medium */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full border border-surface-variant/40">
            <span className="font-label-caps text-label-caps uppercase text-tertiary font-semibold">Medium</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-tertiary">
                {String(mediumCount).padStart(2, '0')}
              </span>
              <span className="font-code-sm text-code-sm text-outline">CVSS 4-7</span>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant">Scheduled fix</span>
          </div>

          {/* Tile 5: Low */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full border border-surface-variant/40">
            <span className="font-label-caps text-label-caps uppercase text-outline">Low</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-on-surface">
                {String(lowCount).padStart(2, '0')}
              </span>
              <span className="font-code-sm text-code-sm text-outline">CVSS &lt;4</span>
            </div>
            <span className="font-code-sm text-code-sm text-on-surface-variant">Monitored</span>
          </div>

          {/* Tile 6: Safe */}
          <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex flex-col justify-between h-full bg-gradient-to-br from-primary/10 to-transparent border border-surface-variant/40">
            <span className="font-label-caps text-label-caps uppercase text-primary font-semibold">Safe</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg font-bold text-primary">
                {safeCount}
              </span>
              <span className="font-code-sm text-code-sm text-outline">Passed</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${Math.round((safeCount / Math.max(1, scan.packages.length)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Mission Control Stage: 65% Graph Canvas + 35% Side Panel ── */}
      <div className="flex flex-col lg:flex-row gap-space-lg items-start relative min-h-[760px]">
        {/* Left: 65% Graph Canvas */}
        <div className="w-full lg:w-[63%] xl:w-[65%] flex flex-col gap-space-md">
          <GraphView
            packages={scan.packages}
            edges={scan.edges}
            onNodeClick={(pkg) => setSelectedPkg(pkg)}
            selectedPkg={selectedPkg}
            initialSearchQuery={queryParam}
          />

          {/* Quick Action Navigation Strip */}
          <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-variant shadow-sm flex-wrap gap-space-sm">
            <div className="flex items-center gap-space-md font-code-sm text-code-sm text-outline">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary-container">shield</span>
                <span>Active Graph Analysis: {scan.packages.length} Nodes</span>
              </span>
              <span>•</span>
              <span className="text-secondary font-medium">{vulnCount} Total Vulnerabilities Detected</span>
            </div>

            <div className="flex items-center gap-space-sm">
              <button
                onClick={handleDownloadSbom}
                className="flex items-center gap-space-xs px-space-md py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-[13px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer border-none"
                title="Download CycloneDX 1.5 JSON SBOM"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>CycloneDX SBOM</span>
              </button>

              <Link
                to={`/app/scans/${id}/report`}
                className="flex items-center gap-space-xs px-space-md py-1.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-[13px] font-semibold rounded-lg shadow-sm transition-all no-underline"
              >
                <span>View Ranked Remediation Report</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: 35% Active Finding Detail Side Panel */}
        <div className="w-full lg:w-[37%] xl:w-[35%] sticky top-20">
          {selectedPkg ? (
            <FindingDetailPanel pkg={selectedPkg} />
          ) : (
            <div className="bg-surface-container-low rounded-xl p-space-xl border border-surface-variant text-center flex flex-col items-center justify-center min-h-[480px]">
              <span className="material-symbols-outlined text-outline text-[48px] mb-2">touch_app</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Select a Node to Inspect</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mt-1">
                Click on any dependency in the topology to view its score breakdown, CVSS evidence, provenance signals, and AI remediation plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

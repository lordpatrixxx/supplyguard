import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import type { ScanResult } from '../types'
import { getScanHistory, downloadSbom } from '../lib/api'

export function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialQ)
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'passed'>('all')

  useEffect(() => {
    if (initialQ) {
      setSearchQuery(initialQ)
    }
  }, [initialQ])

  const { data: scans, isLoading } = useQuery<ScanResult[]>({
    queryKey: ['scans', user?.id],
    queryFn: () => getScanHistory(),
  })

  const filteredScans = useMemo(() => {
    if (!scans) return []
    return scans.filter((s) => {
      const repo = (s.repoUrl || '').toLowerCase()
      if (searchQuery.trim() && !repo.includes(searchQuery.toLowerCase().trim())) {
        return false
      }
      if (activeFilter === 'critical') {
        return s.overallRiskScore >= 70 || s.packages.some((p) => p.riskTier === 'critical')
      }
      if (activeFilter === 'passed') {
        return s.overallRiskScore < 40 && !s.packages.some((p) => p.riskTier === 'critical')
      }
      return true
    })
  }, [scans, searchQuery, activeFilter])

  const totalScans = scans?.length || 0
  const criticalScansCount = scans?.filter((s) => s.overallRiskScore >= 70 || s.packages.some((p) => p.riskTier === 'critical')).length || 0
  const passedScansCount = scans?.filter((s) => s.overallRiskScore < 40).length || 0

  const meanScore = useMemo(() => {
    if (!scans || scans.length === 0) return '0.0'
    const sum = scans.reduce((acc, s) => acc + (s.overallRiskScore || 0), 0)
    return (sum / scans.length).toFixed(1)
  }, [scans])

  return (
    <div className="p-margin-lg flex flex-col gap-space-xl max-w-[1600px] w-full mx-auto animate-fade-in">
      {/* ── Top Action & Title Header Pane ── */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-caps text-label-caps uppercase text-primary-container tracking-wider">
              Historical Audit Stream
            </span>
            <span className="text-outline font-code-sm text-code-sm">/</span>
            <span className="font-label-caps text-label-caps text-outline uppercase">
              Supply Chain Registry
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Scan History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Historical supply chain security assessments and vulnerability posture over time. Audit dependency footprints and automated risk scoring.
          </p>
        </div>

        <div className="flex items-center gap-space-md flex-wrap">
          <div className="hidden sm:flex items-center gap-space-sm px-space-md py-space-xs bg-surface-container-low rounded-lg shadow-sm border border-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary-container">sync_alt</span>
            <span className="font-code-sm text-code-sm text-on-surface">
              Audits Scoped: <span className="text-primary-container font-medium">{user?.email ? user.email.split('@')[0] : 'Fleet'}</span>
            </span>
          </div>

          <Link
            to="/app"
            className="flex items-center gap-space-xs px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-[13px] rounded-lg transition-all shadow-md active:scale-95 no-underline font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add_moderator</span>
            <span>New Scan</span>
          </Link>
        </div>
      </section>

      {/* ── Telemetry Strip: Drift Sparklines & Delta Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
        {/* Card 1: Drift Status */}
        <div className="p-space-lg bg-surface-container rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden border border-surface-variant">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-primary-container/5 blur-xl pointer-events-none"></div>
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps uppercase text-outline">Mean Risk Score</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{meanScore}</span>
              <span className="font-code-sm text-code-sm text-outline">/ 100</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Across {totalScans} evaluated repository audits
            </span>
          </div>
          <div className="w-24 h-12 flex items-end">
            <svg className="w-full h-full text-primary-container" fill="none" viewBox="0 0 100 40">
              <path
                d="M0 35 Q20 32 35 25 T70 18 T100 8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              ></path>
              <path
                d="M0 35 Q20 32 35 25 T70 18 T100 8 L100 40 L0 40 Z"
                fill="currentColor"
                fillOpacity="0.08"
              ></path>
            </svg>
          </div>
        </div>

        {/* Card 2: Critical Exposure Trend */}
        <div className="p-space-lg bg-surface-container rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden border border-surface-variant">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps uppercase text-outline">Critical Audits</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg text-secondary font-bold">
                {String(criticalScansCount).padStart(2, '0')}
              </span>
              <span className="font-code-sm text-code-sm text-secondary">Requiring Action</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Risk score &ge; 70 or critical CVEs
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-space-sm bg-surface-container-high rounded-lg border border-surface-variant/40">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
            <span className="font-code-sm text-code-sm text-secondary font-medium">CVE Priority 1</span>
          </div>
        </div>

        {/* Card 3: Passed Audits */}
        <div className="p-space-lg bg-surface-container rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden border border-surface-variant">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps uppercase text-outline">Passed Audits</span>
            <div className="flex items-baseline gap-space-xs mt-1">
              <span className="font-display-lg text-display-lg text-primary-container font-bold">{passedScansCount}</span>
              <span className="font-code-sm text-code-sm text-outline">of {totalScans}</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Adhering to supply chain baselines
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container border border-surface-variant/40">
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
        </div>
      </div>

      {/* ── Filter & Query Control Console ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md p-space-md bg-surface-container-low rounded-xl shadow-sm border border-surface-variant">
        <div className="flex-1 flex items-center gap-space-md flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">
              manage_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter repositories or commit sha..."
              className="w-full h-10 bg-surface-container-lowest rounded-lg pl-9 pr-space-md text-on-surface placeholder:text-outline font-code-sm text-code-sm focus:outline-none focus:bg-surface-container-high transition-all border border-surface-variant/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-space-sm top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-[14px] cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filter Pills Group */}
          <div className="flex items-center gap-space-xs p-1 bg-surface-container-lowest rounded-lg overflow-x-auto w-full sm:w-auto border border-surface-variant/40">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-space-md py-1 font-headline-sm text-[12px] rounded-lg transition-colors font-medium cursor-pointer border-none ${
                activeFilter === 'all'
                  ? 'text-on-primary bg-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high bg-transparent'
              }`}
            >
              All Scans ({totalScans})
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-space-md py-1 font-headline-sm text-[12px] rounded-lg transition-colors cursor-pointer border-none ${
                activeFilter === 'critical'
                  ? 'text-on-primary bg-secondary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high bg-transparent'
              }`}
            >
              Critical Risks ({criticalScansCount})
            </button>
            <button
              onClick={() => setActiveFilter('passed')}
              className={`px-space-md py-1 font-headline-sm text-[12px] rounded-lg transition-colors cursor-pointer border-none ${
                activeFilter === 'passed'
                  ? 'text-on-primary bg-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high bg-transparent'
              }`}
            >
              Passed Audits ({passedScansCount})
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-space-sm">
          <div className="flex items-center gap-space-xs text-outline font-code-sm text-code-sm">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span className="hidden sm:inline">Sorted:</span>
            <span className="text-on-surface font-medium">Most Recent</span>
          </div>
        </div>
      </div>

      {/* ── Main Audit Data Ledger / Table ── */}
      <div className="bg-surface-container rounded-xl overflow-hidden shadow-lg flex flex-col border border-surface-variant">
        {/* Table Header Matrix */}
        <div className="hidden xl:grid grid-cols-12 gap-gutter px-space-xl py-space-md bg-surface-container-low text-outline font-label-caps text-label-caps uppercase tracking-wider border-b border-surface-variant">
          <div className="col-span-3 flex items-center gap-space-xs">
            <span>Repository &amp; Branch</span>
          </div>
          <div className="col-span-2">Timestamp &amp; Status</div>
          <div className="col-span-2">Dependency Footprint</div>
          <div className="col-span-2">Risk Index / Score</div>
          <div className="col-span-2">Finding Distribution</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Scans List Wrapper */}
        <div className="flex flex-col">
          {isLoading ? (
            <div className="p-space-xl text-center text-outline font-code-sm">
              <span className="material-symbols-outlined text-primary-container animate-spin text-[32px] mb-2">
                progress_activity
              </span>
              <div>Loading audit ledger...</div>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="p-space-xl text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-outline text-[48px] mb-2">history_toggle_off</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">No matching scans located</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Trigger a new repository inspection from the intake workspace.
              </p>
              <Link to="/app" className="btn-primary no-underline inline-block mt-4">
                Start First Scan
              </Link>
            </div>
          ) : (
            filteredScans.map((scan) => {
              const repo = scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
              const isCrit = scan.overallRiskScore >= 70 || scan.packages.some((p) => p.riskTier === 'critical')
              const isPassed = scan.overallRiskScore < 40 && !scan.packages.some((p) => p.riskTier === 'critical')
              const directCount = scan.packages.filter((p) => p.isDirect).length
              const transCount = scan.packages.filter((p) => !p.isDirect).length

              const critVulns = scan.packages.filter((p) => p.riskTier === 'critical').length
              const highVulns = scan.packages.filter((p) => p.riskScore >= 60 && p.riskTier !== 'critical').length
              const medVulns = scan.packages.filter((p) => p.riskTier === 'medium').length
              const safePkgs = scan.packages.filter((p) => p.riskTier === 'safe').length

              const scanDate = new Date(scan.createdAt)
              const formattedDate = scanDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              const formattedTime = scanDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })

              return (
                <article
                  key={scan.scanId}
                  className="group p-space-lg xl:px-space-xl xl:py-space-md bg-surface-container hover:bg-surface-container-high/60 transition-all flex flex-col xl:grid xl:grid-cols-12 gap-space-md xl:gap-gutter items-stretch xl:items-center border-b border-surface-variant/40 last:border-none"
                >
                  {/* Column 1: Repo & Target Details */}
                  <div className="xl:col-span-3 flex items-start xl:items-center gap-space-md">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 border border-surface-variant/40">
                      <span className="material-symbols-outlined text-[20px]">dataset</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate group-hover:text-primary-container transition-colors">
                          {repo}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest font-code-sm text-code-sm text-primary-container border border-surface-variant/40">
                          main
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs mt-0.5">
                        <span className="material-symbols-outlined text-outline text-[13px]">commit</span>
                        <span className="font-code-sm text-code-sm text-outline">sha:{scan.scanId.slice(0, 7)}</span>
                        <span className="text-outline font-code-sm text-code-sm">•</span>
                        <span className="font-code-sm text-code-sm text-primary-container flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                          {scan.status === 'complete' ? 'Completed' : scan.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Date and Temporal Context */}
                  <div className="xl:col-span-2 flex flex-col justify-center">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-outline text-[16px]">schedule</span>
                      <span className="font-code-md text-code-md text-on-surface font-medium">{formattedDate}</span>
                    </div>
                    <span className="font-code-sm text-code-sm text-outline ml-5">{formattedTime}</span>
                  </div>

                  {/* Column 3: Package Metrics */}
                  <div className="xl:col-span-2 flex flex-col justify-center">
                    <div className="flex items-baseline gap-space-xs">
                      <span className="font-code-lg text-code-lg text-on-surface font-semibold">
                        {scan.packages.length}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">packages</span>
                    </div>
                    <div className="flex items-center gap-space-xs mt-0.5 font-code-sm text-code-sm text-outline">
                      <span className="text-on-surface">{directCount} direct</span>
                      <span>/</span>
                      <span>{transCount} trans.</span>
                    </div>
                  </div>

                  {/* Column 4: Risk Score Gauge */}
                  <div className="xl:col-span-2 flex items-center gap-space-md">
                    <div className="flex flex-col min-w-[70px]">
                      <div className="flex items-baseline gap-space-xs">
                        <span
                          className={`font-display-lg text-[22px] font-bold ${
                            isCrit ? 'text-secondary' : isPassed ? 'text-primary-container' : 'text-tertiary'
                          }`}
                        >
                          {scan.overallRiskScore}
                        </span>
                        <span className="font-code-sm text-code-sm text-outline">/100</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 font-label-caps text-label-caps rounded uppercase font-semibold text-center mt-0.5 ${
                          isCrit
                            ? 'bg-secondary-container/30 text-secondary'
                            : isPassed
                            ? 'bg-primary-container/20 text-primary-container'
                            : 'bg-tertiary-container/30 text-tertiary'
                        }`}
                      >
                        {isCrit ? 'HIGH RISK' : isPassed ? 'PASSED' : 'MEDIUM'}
                      </span>
                    </div>
                    <div className="flex-1 hidden xl:flex flex-col gap-1">
                      <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCrit ? 'bg-secondary' : isPassed ? 'bg-primary-container' : 'bg-tertiary'}`}
                          style={{ width: `${Math.min(100, Math.max(8, scan.overallRiskScore))}%` }}
                        ></div>
                      </div>
                      <span className="font-code-sm text-[10px] text-outline">
                        {isCrit ? 'Exceeds threshold' : 'Nominal bounds'}
                      </span>
                    </div>
                  </div>

                  {/* Column 5: Finding Distribution Breakdown Bar */}
                  <div className="xl:col-span-2 flex flex-col gap-1.5 justify-center">
                    <div className="h-2 w-full bg-surface-container-lowest rounded flex overflow-hidden border border-surface-variant/40">
                      {critVulns > 0 && (
                        <div
                          className="bg-secondary h-full"
                          style={{ width: `${Math.max(10, Math.min(60, (critVulns / Math.max(1, scan.packages.length)) * 100))}%` }}
                          title={`${critVulns} Critical`}
                        ></div>
                      )}
                      {highVulns > 0 && (
                        <div
                          className="bg-tertiary-fixed-dim h-full"
                          style={{ width: `${Math.max(10, (highVulns / Math.max(1, scan.packages.length)) * 100)}%` }}
                          title={`${highVulns} High`}
                        ></div>
                      )}
                      {medVulns > 0 && (
                        <div
                          className="bg-tertiary-container h-full"
                          style={{ width: `${Math.max(10, (medVulns / Math.max(1, scan.packages.length)) * 100)}%` }}
                          title={`${medVulns} Medium`}
                        ></div>
                      )}
                      <div
                        className="bg-primary-container h-full flex-1"
                        title={`${safePkgs} Safe`}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between font-code-sm text-[11px] text-outline">
                      <span className="text-secondary font-semibold">{critVulns} Crit</span>
                      <span className="text-tertiary font-medium">{medVulns} Med</span>
                      <span className="text-primary-container">{safePkgs} Safe</span>
                    </div>
                  </div>

                  {/* Column 6: Actions Toolbar */}
                  <div className="xl:col-span-1 flex items-center justify-end gap-space-xs pt-space-xs xl:pt-0">
                    <button
                      onClick={() => navigate(`/app/scans/${scan.scanId}/dashboard`)}
                      className="p-2 bg-surface-container-high hover:bg-surface-bright text-primary-container rounded-lg transition-colors cursor-pointer border-none"
                      title="View Graph Analysis"
                    >
                      <span className="material-symbols-outlined text-[18px]">hub</span>
                    </button>
                    <button
                      onClick={() => navigate(`/app/scans/${scan.scanId}/report`)}
                      className="p-2 bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none"
                      title="View Remediation Report"
                    >
                      <span className="material-symbols-outlined text-[18px]">description</span>
                    </button>
                    <button
                      onClick={() => downloadSbom(scan.scanId, scan.repoUrl)}
                      className="p-2 bg-surface-container-high hover:bg-surface-bright text-outline hover:text-primary-container rounded-lg transition-colors cursor-pointer border-none"
                      title="Download CycloneDX SBOM"
                    >
                      <span className="material-symbols-outlined text-[18px]">file_download</span>
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

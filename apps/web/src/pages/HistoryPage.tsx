import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import type { ScanResult } from '../types'
import { getScanHistory, downloadSbom } from '../lib/api'
import {
  Share2, FileText, Download, Search, X,
  ShieldCheck, ShieldAlert, SlidersHorizontal, Loader2, Plus,
  Clock, CheckCircle, FolderGit2, History
} from 'lucide-react'

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

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="flex flex-col gap-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* ── Top Header Pane ── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-code-sm text-xs text-outline uppercase tracking-wider mb-1">
            <span>Scan History</span>
            <span>/</span>
            <span>Security Ledger</span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">Scan History</h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Historical supply chain security assessments and dependency risk trends.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs font-code-sm">
            <span className="text-outline">Account:</span>
            <span className="text-primary font-medium">{displayName}</span>
          </div>

          <Link
            to="/app"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg transition-all shadow-sm no-underline font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New Scan</span>
          </Link>
        </div>
      </section>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Mean Risk Score */}
        <div className="p-5 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="font-code-sm text-[11px] uppercase tracking-wider text-outline">Mean Risk Score</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-headline-md text-3xl font-bold text-on-surface tabular-nums">{meanScore}</span>
              <span className="font-code-sm text-xs text-outline">/ 100</span>
            </div>
            <span className="font-body-md text-xs text-on-surface-variant mt-1 block">
              Across {totalScans} repository scans
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Critical Exposure */}
        <div className="p-5 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="font-code-sm text-[11px] uppercase tracking-wider text-critical">Critical Scans</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-headline-md text-3xl font-bold text-critical tabular-nums">
                {String(criticalScansCount).padStart(2, '0')}
              </span>
              <span className="font-code-sm text-xs text-critical">Requiring Action</span>
            </div>
            <span className="font-body-md text-xs text-on-surface-variant mt-1 block">
              Risk score &ge; 70 or critical CVEs
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-critical/10 border border-critical/30 flex items-center justify-center text-critical">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Passed Audits */}
        <div className="p-5 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="font-code-sm text-[11px] uppercase tracking-wider text-safe">Passed Scans</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-headline-md text-3xl font-bold text-safe tabular-nums">{passedScansCount}</span>
              <span className="font-code-sm text-xs text-outline">of {totalScans} total</span>
            </div>
            <span className="font-body-md text-xs text-on-surface-variant mt-1 block">
              Adhering to security baselines
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-safe/10 border border-safe/30 flex items-center justify-center text-safe">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex-1 flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter repositories..."
              className="w-full h-9 bg-surface-container-lowest rounded-lg pl-9 pr-8 text-on-surface placeholder:text-outline font-code-sm text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary border border-outline-variant/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 font-code-sm text-xs rounded-md transition-colors cursor-pointer border-none font-medium ${
                activeFilter === 'all'
                  ? 'text-on-primary bg-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-transparent'
              }`}
            >
              All ({totalScans})
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-3 py-1 font-code-sm text-xs rounded-md transition-colors cursor-pointer border-none font-medium ${
                activeFilter === 'critical'
                  ? 'text-on-primary bg-critical font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-transparent'
              }`}
            >
              Critical ({criticalScansCount})
            </button>
            <button
              onClick={() => setActiveFilter('passed')}
              className={`px-3 py-1 font-code-sm text-xs rounded-md transition-colors cursor-pointer border-none font-medium ${
                activeFilter === 'passed'
                  ? 'text-on-primary bg-safe font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-transparent'
              }`}
            >
              Passed ({passedScansCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-outline font-code-sm text-xs self-end sm:self-auto pr-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Sorted: Most Recent</span>
        </div>
      </div>

      {/* ── Scan History Table ── */}
      <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-outline-variant/30">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-container text-outline font-code-sm text-[11px] uppercase tracking-wider border-b border-outline-variant/30">
          <div className="col-span-4">Repository &amp; Branch</div>
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Dependencies</div>
          <div className="col-span-2">Risk Score</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Scans List */}
        <div className="divide-y divide-outline-variant/20">
          {isLoading ? (
            <div className="p-12 text-center text-outline font-code-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span>Loading scan history...</span>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
              <History className="w-12 h-12 text-outline" />
              <h3 className="font-headline-sm text-base font-bold text-on-surface">No scans found</h3>
              <p className="font-body-md text-xs text-on-surface-variant max-w-sm">
                {searchQuery ? 'No scans match your search query.' : 'Run your first repository scan to start auditing dependencies.'}
              </p>
              <Link to="/app" className="btn-primary no-underline inline-block mt-2">
                Start Scan
              </Link>
            </div>
          ) : (
            filteredScans.map((scan) => {
              const repo = scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
              const isCrit = scan.overallRiskScore >= 70 || scan.packages.some((p) => p.riskTier === 'critical')
              const isPassed = scan.overallRiskScore < 40 && !scan.packages.some((p) => p.riskTier === 'critical')
              const directCount = scan.packages.filter((p) => p.isDirect).length
              const transCount = scan.packages.filter((p) => !p.isDirect).length

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
                  className="group px-6 py-4 hover:bg-surface-container/60 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center"
                >
                  {/* Column 1: Repo & Target Details (col-span-4) */}
                  <div className="lg:col-span-4 flex items-center gap-3 min-w-0 w-full">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 border border-outline-variant/30">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                          {repo}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-code-sm text-[11px] text-outline border border-outline-variant/30">
                          main
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-code-sm text-xs text-outline mt-0.5">
                        <span>sha:{scan.scanId.slice(0, 7)}</span>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${isCrit ? 'text-critical' : isPassed ? 'text-safe' : 'text-primary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-critical' : isPassed ? 'bg-safe' : 'bg-primary'}`}></span>
                          {scan.status === 'complete' ? 'Completed' : scan.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Timestamp (col-span-2) */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface font-code-sm">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      <span>{formattedDate}</span>
                    </div>
                    <span className="font-code-sm text-[11px] text-outline ml-5">{formattedTime}</span>
                  </div>

                  {/* Column 3: Dependencies formatted per spec (col-span-2) */}
                  <div className="lg:col-span-2 flex flex-col">
                    <span className="font-code-sm text-xs font-semibold text-on-surface">
                      {scan.packages.length} packages
                    </span>
                    <span className="font-code-sm text-[11px] text-outline mt-0.5">
                      {directCount} direct · {transCount} transitive
                    </span>
                  </div>

                  {/* Column 4: Risk Score & distribution (col-span-2) */}
                  <div className="lg:col-span-2 flex items-center gap-3">
                    <div className="min-w-[56px]">
                      <span className={`font-headline-md text-lg font-bold tabular-nums ${
                        isCrit ? 'text-critical' : isPassed ? 'text-safe' : 'text-tertiary'
                      }`}>
                        {scan.overallRiskScore}
                      </span>
                      <span className="font-code-sm text-[11px] text-outline">/100</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm font-semibold uppercase tracking-wider ${
                      isCrit
                        ? 'bg-critical/10 text-critical border border-critical/20'
                        : isPassed
                        ? 'bg-safe/10 text-safe border border-safe/20'
                        : 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                    }`}>
                      {isCrit ? 'High Risk' : isPassed ? 'Passed' : 'Medium'}
                    </span>
                  </div>

                  {/* Column 5: Action Toolbar with Tooltips & Accessible Labels (col-span-2) */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-1.5 w-full lg:w-auto">
                    <button
                      onClick={() => navigate(`/app/scans/${scan.scanId}/dashboard`)}
                      className="p-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg transition-colors cursor-pointer border border-outline-variant/30"
                      title="View Dependency Graph"
                      aria-label="View Dependency Graph"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/app/scans/${scan.scanId}/report`)}
                      className="p-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border border-outline-variant/30"
                      title="View Remediation Report"
                      aria-label="View Remediation Report"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadSbom(scan.scanId, scan.repoUrl)}
                      className="p-2 bg-surface-container hover:bg-surface-container-high text-outline hover:text-primary rounded-lg transition-colors cursor-pointer border border-outline-variant/30"
                      title="Download CycloneDX SBOM"
                      aria-label="Download CycloneDX SBOM"
                    >
                      <Download className="w-4 h-4" />
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

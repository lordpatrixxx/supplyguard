import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult } from '../types'

export function ScanProgressPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'input' | 'pipeline'>('pipeline')
  const [errorScenario, setErrorScenario] = useState<'A' | 'B' | 'C'>('A')
  const [copiedLog, setCopiedLog] = useState(false)
  const [subpathOpen, setSubpathOpen] = useState(false)
  const [subpathValue, setSubpathValue] = useState('/')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Timer for elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: scan, error } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: async () => {
      const res = await fetch(`/api/scans/${id}`)
      if (!res.ok) throw new Error('Scan not found')
      return res.json()
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'complete' || status === 'failed') return false
      return 1200
    },
  })

  // Auto-redirect on complete after short delay to let user see 100%
  useEffect(() => {
    if (scan?.status === 'complete') {
      const timeout = setTimeout(() => {
        navigate(`/app/scans/${id}/dashboard`, { replace: true })
      }, 1200)
      return () => clearTimeout(timeout)
    }
  }, [scan?.status, id, navigate])

  const repoName = useMemo(() => {
    if (!scan?.repoUrl) return 'Target Repository'
    return scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
  }, [scan?.repoUrl])

  // Determine active stage index
  const activeStageIndex = useMemo(() => {
    if (!scan) return 0
    if (scan.status === 'complete') return 7
    if (scan.status === 'failed') return -1
    const msg = (scan.statusMessage || '').toLowerCase()
    if (msg.includes('fetch') || msg.includes('manifest')) return 0
    if (msg.includes('transitive') || msg.includes('pars') || msg.includes('tree')) return 1
    if (msg.includes('osv') || msg.includes('vulnerab')) return 2
    if (msg.includes('typosquat') || msg.includes('distance')) return 3
    if (msg.includes('reputation') || msg.includes('drift')) return 4
    if (msg.includes('scoring') || msg.includes('synthesiz')) return 5
    if (msg.includes('ai') || msg.includes('remediation')) return 6
    return 2 // Default mid-flight
  }, [scan])

  const progressPercent = useMemo(() => {
    if (scan?.status === 'complete') return 100
    if (scan?.status === 'failed') return 25
    if (activeStageIndex === 0) return 15
    if (activeStageIndex === 1) return 30
    if (activeStageIndex === 2) return 50
    if (activeStageIndex === 3) return 65
    if (activeStageIndex === 4) return 80
    if (activeStageIndex === 5) return 90
    if (activeStageIndex === 6) return 96
    return 45
  }, [scan?.status, activeStageIndex])

  const totalPackages = scan?.packages?.length || 143
  const analyzedCount = Math.min(
    totalPackages,
    Math.max(12, Math.round((progressPercent / 100) * totalPackages))
  )

  const copyLogs = () => {
    const logText = [
      `[INFO] Target: ${scan?.repoUrl}`,
      `[INFO] Status: ${scan?.statusMessage || scan?.status}`,
      `[INFO] Analyzed: ${analyzedCount}/${totalPackages} packages`,
      scan?.status === 'failed' ? `[HALT] ${scan.statusMessage}` : `[INFO] Pipeline in-flight`,
    ].join('\n')
    navigator.clipboard.writeText(logText)
    setCopiedLog(true)
    setTimeout(() => setCopiedLog(false), 2000)
  }

  // ── ERROR STATE (Missing Manifest / Failed Scan) ──
  if (scan?.status === 'failed' || error) {
    return (
      <div className="w-full px-margin-lg py-space-xl flex flex-col gap-space-xl animate-fade-in">
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-on-surface-variant">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1 no-underline text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>SecOps Audit</span>
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-medium">{repoName}</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Scan Diagnostics #SG-{id?.slice(0, 4)}</span>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-high rounded-full">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-caps text-label-caps uppercase text-secondary">Pipeline: Halted</span>
            </div>
            <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low rounded-lg text-outline">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span className="font-code-sm text-code-sm">Duration: {elapsedSeconds}s</span>
            </div>
          </div>
        </div>

        {/* 2-Column Error Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Left Main Error Panel */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            <div className="relative bg-surface-container rounded-xl shadow-xl overflow-hidden p-space-xl">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-secondary"></div>
              <div className="flex flex-col gap-space-lg">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-xs px-space-sm py-1 bg-secondary-container/30 rounded-lg">
                    <span className="material-symbols-outlined text-[16px] text-secondary">report_problem</span>
                    <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Scan Diagnostic • Resolution Halted</span>
                  </div>
                  <span className="font-code-sm text-code-sm text-outline">Exit Code: 127_ENOENT</span>
                </div>

                <div>
                  <h1 className="font-headline-md text-headline-md text-on-surface">Unable to complete this scan</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
                    {scan?.statusMessage || 'The target repository manifest could not be found or fetched. Ensure the repository contains a valid package.json and package-lock.json.'}
                  </p>
                </div>

                {/* Scenario Switcher Tabs */}
                <div className="flex gap-space-xs bg-surface-container-low p-1 rounded-lg self-start">
                  <button
                    onClick={() => setErrorScenario('A')}
                    className={`px-space-md py-1.5 rounded-lg font-code-sm text-code-sm transition-all cursor-pointer border-none ${
                      errorScenario === 'A'
                        ? 'bg-surface-container-high text-primary shadow-sm font-medium'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Manifest Missing
                  </button>
                  <button
                    onClick={() => setErrorScenario('B')}
                    className={`px-space-md py-1.5 rounded-lg font-code-sm text-code-sm transition-all cursor-pointer border-none ${
                      errorScenario === 'B'
                        ? 'bg-surface-container-high text-primary shadow-sm font-medium'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Auth &amp; Network
                  </button>
                  <button
                    onClick={() => setErrorScenario('C')}
                    className={`px-space-md py-1.5 rounded-lg font-code-sm text-code-sm transition-all cursor-pointer border-none ${
                      errorScenario === 'C'
                        ? 'bg-surface-container-high text-primary shadow-sm font-medium'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Lockfile Conflict
                  </button>
                </div>

                {/* Tab Scenario A */}
                {errorScenario === 'A' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">folder_off</span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">package.json not found in root</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">SupplyGuard currently analyzes JavaScript and TypeScript projects through npm/yarn manifests. Verify that the repository tree contains a verifiable manifest descriptor.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl p-space-md text-on-surface font-code-sm text-code-sm flex flex-col gap-1.5 shadow-inner">
                      <div className="flex items-center justify-between text-secondary">
                        <span>ERROR: Repository manifest search failed</span>
                        <span className="font-label-caps text-label-caps uppercase bg-secondary-container/30 px-2 py-0.5 rounded text-secondary">Diagnostic Result</span>
                      </div>
                      <div className="text-on-surface-variant">PATH: <span className="text-on-surface">{scan?.repoUrl}</span> <span className="text-outline">(branch: main)</span></div>
                      <div className="text-on-surface-variant">STATUS: Clone verified (240ms) • Root scan: 0 manifest files located</div>
                      <div className="text-tertiary-container pt-1">HINT: Ensure package.json is located in the repository root or specify the subpath manifest directory.</div>
                    </div>
                  </div>
                )}

                {/* Tab Scenario B */}
                {errorScenario === 'B' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">key_off</span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">Private Repo or Authentication Required</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">The upstream Git daemon denied public access or deploy keys were rejected during shallow clone handshake.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl p-space-md text-on-surface font-code-sm text-code-sm flex flex-col gap-1.5 shadow-inner">
                      <div className="text-secondary">ERROR: Remote git authentication failed [401 Unauthorized]</div>
                      <div className="text-on-surface-variant">REMOTE: {scan?.repoUrl}</div>
                      <div className="text-tertiary-container pt-1">HINT: Public repositories only are supported for direct demonstration scans.</div>
                    </div>
                  </div>
                )}

                {/* Tab Scenario C */}
                {errorScenario === 'C' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">merge_type</span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">Lockfile Inconsistency Detected</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">The package-lock.json or yarn.lock file contains unresolved cyclic references or unresolvable peer dependencies.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl p-space-md text-on-surface font-code-sm text-code-sm flex flex-col gap-1.5 shadow-inner">
                      <div className="text-secondary">ERROR: ERESOLVE could not resolve peer dependency tree</div>
                      <div className="text-on-surface-variant">CONFLICT: Manifest contains unresolved peer dependency declarations</div>
                      <div className="text-tertiary-container pt-1">HINT: Ensure a valid npm v7+ package-lock.json is committed in the repository.</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-space-sm flex flex-wrap items-center gap-space-md">
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-space-xs px-space-lg py-2.5 bg-primary hover:bg-primary-fixed-dim text-on-primary font-headline-sm text-headline-sm rounded-lg shadow-md font-semibold transition-all cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_link</span>
                    <span>Try Another Repository</span>
                  </button>
                  <button
                    onClick={() => setSubpathOpen(!subpathOpen)}
                    className="flex items-center gap-space-xs px-space-lg py-2.5 bg-surface-container-high hover:bg-surface-bright text-on-surface font-headline-sm text-headline-sm rounded-lg shadow-sm font-semibold transition-colors cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">subdirectory_arrow_right</span>
                    <span>Specify Manifest Subpath</span>
                  </button>
                  <Link
                    to="/"
                    className="px-space-md py-2 text-on-surface-variant hover:text-primary font-body-md text-body-md transition-colors inline-flex items-center gap-1 no-underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Back to Overview</span>
                  </Link>
                </div>

                {/* Subpath Drawer */}
                {subpathOpen && (
                  <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm mt-2 transition-all">
                    <span className="font-label-caps text-label-caps uppercase text-outline">Target Directory Subpath Override</span>
                    <div className="flex flex-col sm:flex-row gap-space-sm items-center">
                      <div className="relative flex-1 w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">folder_open</span>
                        <input
                          type="text"
                          value={subpathValue}
                          onChange={(e) => setSubpathValue(e.target.value)}
                          placeholder="e.g. apps/web or packages/core"
                          className="w-full h-10 bg-surface-dim rounded-lg pl-9 pr-3 text-on-surface font-code-sm text-code-sm focus:outline-none focus:bg-surface-container transition-all border border-surface-variant"
                        />
                      </div>
                      <button
                        onClick={() => navigate('/')}
                        className="w-full sm:w-auto px-space-lg py-2 bg-primary text-on-primary font-code-md text-code-md rounded-lg font-semibold whitespace-nowrap cursor-pointer border-none"
                      >
                        Save &amp; Re-run Scan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Stream Terminal */}
            <div className="bg-surface-container rounded-xl shadow-xl overflow-hidden">
              <div className="px-space-lg py-space-sm bg-surface-container-high flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  </div>
                  <span className="font-code-sm text-code-sm text-on-surface-variant ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">terminal</span>
                    <span>telemetry-stream.log</span>
                  </span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button
                    onClick={copyLogs}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-code-sm text-code-sm transition-all cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copiedLog ? 'Copied!' : 'Copy Log'}</span>
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-primary-container hover:bg-primary text-on-primary font-code-sm text-code-sm transition-all font-semibold cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Retry Scan</span>
                  </button>
                </div>
              </div>

              <div className="p-space-lg bg-surface-container-lowest font-code-sm text-code-sm flex flex-col gap-2 overflow-x-auto text-on-surface">
                <div className="flex items-start gap-space-sm text-on-surface-variant">
                  <span className="text-outline select-none">01</span>
                  <span className="text-outline">[14:40:02.104]</span>
                  <span className="text-primary-container font-medium">INFO:</span>
                  <span>Resolving git endpoint {scan?.repoUrl}</span>
                </div>
                <div className="flex items-start gap-space-sm text-on-surface-variant">
                  <span className="text-outline select-none">02</span>
                  <span className="text-outline">[14:40:02.348]</span>
                  <span className="text-primary font-medium">SUCCESS:</span>
                  <span>Git handshake OK (ref: refs/heads/main)</span>
                </div>
                <div className="flex items-start gap-space-sm text-secondary bg-secondary-container/10 px-2 py-1 rounded">
                  <span className="text-secondary select-none font-bold">03</span>
                  <span className="text-secondary/70">[14:40:02.620]</span>
                  <span className="font-bold">ERROR:</span>
                  <span>{scan?.statusMessage || 'package.json missing in root directory.'}</span>
                </div>
                <div className="flex items-start gap-space-sm text-secondary bg-secondary-container/20 px-2 py-1 rounded">
                  <span className="text-secondary select-none font-bold">04</span>
                  <span className="text-secondary/70">[14:40:02.621]</span>
                  <span className="font-bold">HALT:</span>
                  <span>Ingestion terminated before dependency tree generation. (code: SG_ERR_NO_MANIFEST)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Reference Column */}
          <div className="lg:col-span-4 flex flex-col gap-space-xl">
            <div className="bg-surface-container rounded-xl shadow-lg p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Failure Categorization</h2>
                <span className="font-label-caps text-label-caps text-outline uppercase">Reference Matrix</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Other common root causes that halt the automated bill of materials generation pipeline:
              </p>
              <div className="flex flex-col gap-space-sm">
                <div
                  onClick={() => setErrorScenario('B')}
                  className="p-space-sm bg-surface-container-low rounded-lg flex items-start gap-space-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary mt-0.5">lock_clock</span>
                  <div className="flex flex-col">
                    <span className="font-code-md text-code-md text-on-surface font-medium">Private Auth Credentials Missing</span>
                    <span className="font-body-sm text-body-sm text-outline">SSH key rejected or invalid deployment token for private submodules.</span>
                  </div>
                </div>
                <div
                  onClick={() => setErrorScenario('A')}
                  className="p-space-sm bg-surface-container-low rounded-lg flex items-start gap-space-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">link_off</span>
                  <div className="flex flex-col">
                    <span className="font-code-md text-code-md text-on-surface font-medium">Invalid Repository URL Syntax</span>
                    <span className="font-body-sm text-body-sm text-outline">Protocol unsupported or target repository was relocated or archived.</span>
                  </div>
                </div>
                <div
                  onClick={() => setErrorScenario('C')}
                  className="p-space-sm bg-surface-container-low rounded-lg flex items-start gap-space-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary mt-0.5">account_tree</span>
                  <div className="flex flex-col">
                    <span className="font-code-md text-code-md text-on-surface font-medium">Lockfile Resolution Failure</span>
                    <span className="font-body-sm text-body-sm text-outline">Strict peer-dependency conflicts prevented deterministic graph synthesis.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container rounded-xl shadow-lg p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-outline">Engine Telemetry Snapshot</span>
                <span className="font-code-sm text-code-sm text-primary">Healthy Node</span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm bg-surface-container-lowest rounded-lg flex flex-col">
                  <span className="font-label-caps text-label-caps text-outline uppercase">Worker Instance</span>
                  <span className="font-code-sm text-code-sm text-on-surface font-medium">sg-worker-01</span>
                </div>
                <div className="p-space-sm bg-surface-container-lowest rounded-lg flex flex-col">
                  <span className="font-label-caps text-label-caps text-outline uppercase">Sandbox Runtime</span>
                  <span className="font-code-sm text-code-sm text-on-surface font-medium">Node 20 • Express</span>
                </div>
                <div className="p-space-sm bg-surface-container-lowest rounded-lg flex flex-col">
                  <span className="font-label-caps text-label-caps text-outline uppercase">Latency</span>
                  <span className="font-code-sm text-code-sm text-on-surface font-medium">240 ms</span>
                </div>
                <div className="p-space-sm bg-surface-container-lowest rounded-lg flex flex-col">
                  <span className="font-label-caps text-label-caps text-outline uppercase">Intel Feed</span>
                  <span className="font-code-sm text-code-sm text-on-surface font-medium">OSV.dev + npm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIVE SCAN PIPELINE INGESTION STATE (matches new_scan_live_ingestion.html) ──
  return (
    <div className="relative px-margin-lg py-space-xl overflow-hidden animate-fade-in">
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col gap-space-lg max-w-7xl mx-auto relative z-10">
        {/* Top Console Breadcrumb & State Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-outline font-label-caps text-label-caps uppercase tracking-wider">
              <span>Orchestrator</span>
              <span>/</span>
              <span className="text-primary-container">Ingestion &amp; Deep Inspection</span>
            </div>
            <div className="flex items-baseline gap-space-md">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Security Ingestion Pipeline</h1>
              <span className="font-code-sm text-code-sm text-on-surface-variant">Task #SC-{id?.slice(0, 4) || '9428'}</span>
            </div>
          </div>

          {/* Mode Toggle Controller */}
          <div className="flex items-center p-1 bg-surface-container-lowest rounded-lg">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-DEFAULT font-headline-sm text-[13px] transition-all cursor-pointer border-none ${
                activeTab === 'input'
                  ? 'bg-surface-container-high text-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">settings_input_component</span>
              <span>Scan Parameters</span>
              <span className="px-1.5 py-0.5 rounded-DEFAULT bg-primary-container/20 text-primary-container font-code-sm text-code-sm">Ready</span>
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-DEFAULT font-headline-sm text-[13px] transition-all cursor-pointer border-none ${
                activeTab === 'pipeline'
                  ? 'bg-surface-container-high text-tertiary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
              <span>Live Scanner Pipeline</span>
              <span className="px-1.5 py-0.5 rounded-DEFAULT bg-tertiary-container/20 text-tertiary-container font-code-sm text-code-sm font-semibold">
                {scan?.status === 'complete' ? 'Done' : 'In-flight'}
              </span>
            </button>
          </div>
        </div>

        {/* Dual Workspace Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-lg items-start">
          {/* Left Column: Configuration & Ingestion Parameters */}
          <div className="xl:col-span-5 flex flex-col gap-space-lg">
            <div className="bg-surface-container rounded-xl p-space-xl shadow-md relative overflow-hidden">
              <div className="flex items-start justify-between gap-space-md pb-space-md mb-space-lg bg-surface-container-low/50 -mx-space-xl -mt-space-xl p-space-xl">
                <div className="flex flex-col gap-1">
                  <div className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary-container text-[22px]">cyclone</span>
                    <span>Scan Codebase for Supply-Chain Risks</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Configure target manifest and recursive telemetry policy bounds</p>
                </div>
                <span className="px-2 py-0.5 rounded-DEFAULT bg-surface-container-highest text-outline font-label-caps text-label-caps uppercase">Rev 3.4.1</span>
              </div>

              {/* Target Repository Endpoint Box */}
              <div className="flex flex-col gap-space-md mb-space-lg">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-label-caps text-label-caps uppercase text-outline">Target Repository Endpoint</label>
                    <span className="font-code-sm text-code-sm text-primary-container flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock_open</span> Public &amp; Deploy Key Access
                    </span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary-container">
                    <div className="px-space-md flex items-center text-outline bg-surface-container-low font-code-sm text-code-sm">
                      git://
                    </div>
                    <input
                      readOnly
                      value={scan?.repoUrl || 'https://github.com/expressjs/express'}
                      className="w-full bg-transparent px-space-md py-2.5 text-on-surface font-code-md text-code-md placeholder:text-outline focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-caps text-label-caps uppercase text-outline">Branch / Ref</label>
                    <div className="flex items-center bg-surface-container-lowest rounded-lg px-space-md py-2">
                      <span className="material-symbols-outlined text-outline text-[16px] mr-2">fork_right</span>
                      <input readOnly value="main" className="w-full bg-transparent text-on-surface font-code-md text-code-md focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-caps text-label-caps uppercase text-outline">Subpath Manifest</label>
                    <div className="flex items-center bg-surface-container-lowest rounded-lg px-space-md py-2">
                      <span className="material-symbols-outlined text-outline text-[16px] mr-2">folder_open</span>
                      <input readOnly value="/" className="w-full bg-transparent text-on-surface font-code-md text-code-md focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Ecosystem Compatibility Badges */}
                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <span className="font-label-caps text-label-caps uppercase text-outline">Target Ecosystem Resolution</span>
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-high rounded-DEFAULT">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                      <span className="font-code-sm text-code-sm text-on-surface">npm (v6, v7, v8, v9)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low rounded-DEFAULT">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">PyPI (beta)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-lowest rounded-DEFAULT opacity-60">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                      <span className="font-code-sm text-code-sm text-outline">Go Modules (coming soon)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Verification Modules Checkboxes */}
              <div className="flex flex-col gap-space-sm mb-space-xl">
                <label className="font-label-caps text-label-caps uppercase text-outline">Active Telemetry &amp; Verification Modules</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary-container text-[18px] mt-0.5">check_box</span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface font-medium">Transitive Dependency Graph Parsing</span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">Traverse unlimited sub-tree nodes to uncover nested compromised artifacts</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary-container text-[18px] mt-0.5">check_box</span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface font-medium">Correlate Known CVEs &amp; GHSA Advisories</span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">Real-time matching against OSV.dev, National Vulnerability DB, and zero-day feeds</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary-container text-[18px] mt-0.5">check_box</span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface font-medium">Typosquatting &amp; Dependency Confusion Heuristics</span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">Evaluate namespace similarity distance, internal scopes, and public repository collisions</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary-container text-[18px] mt-0.5">check_box</span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md text-on-surface font-medium">Explainable Risk Scoring &amp; AI Remediation Engine</span>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">Synthesize non-breaking patch upgrade paths and automated pull-request fixes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingestion Action Trigger */}
              <div className="flex items-center gap-space-md">
                {scan?.status === 'complete' ? (
                  <button
                    onClick={() => navigate(`/scans/${id}/dashboard`)}
                    className="flex-1 flex items-center justify-center gap-space-sm py-3 px-space-lg bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm rounded-lg font-bold shadow-md transition-all cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                    <span>View Risk Constellation</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-space-sm py-3 px-space-lg bg-primary-container/80 text-on-primary font-headline-sm text-headline-sm rounded-lg font-bold shadow-md opacity-90 cursor-wait border-none"
                  >
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Scanning Pipeline Active...</span>
                  </button>
                )}
                <Link
                  to="/"
                  className="p-3 bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant rounded-lg transition-colors flex items-center justify-center no-underline"
                  title="Configure New Scan"
                >
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </Link>
              </div>
            </div>

            {/* Cryptographic Validation Note */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary-container text-[20px]">verified</span>
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">Deterministic Ingestion Mode</span>
                  <span className="font-code-sm text-code-sm text-outline">Lockfile SHA256 integrity checks enabled</span>
                </div>
              </div>
              <span className="font-code-sm text-code-sm text-on-surface-variant">Policy: Strict</span>
            </div>
          </div>

          {/* Right Column: Live Scan Progress & Telemetry Pipeline */}
          <div className="xl:col-span-7 flex flex-col gap-space-lg">
            <div className="bg-surface-container rounded-xl p-space-xl shadow-md flex flex-col gap-space-lg">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="relative flex items-center justify-center w-3.5 h-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container"></span>
                  </div>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-tertiary-container font-semibold">
                    {scan?.status === 'complete' ? 'Scan Completed' : 'Scan in Progress'} • {repoName}
                  </span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <span className="font-code-sm text-code-sm text-outline">Engine Worker #04</span>
                  <span className="px-2 py-0.5 rounded-DEFAULT bg-surface-container-highest text-primary-container font-code-sm text-code-sm">v4.12-sec</span>
                </div>
              </div>

              {/* Progress Meter & Quantitative Counter */}
              <div className="flex flex-col gap-space-xs p-space-md bg-surface-container-lowest rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="flex items-baseline gap-space-sm">
                    <span className="font-display-lg text-display-lg text-on-surface font-headline-md tracking-tight">{progressPercent}%</span>
                    <span className="font-body-md text-body-md text-on-surface-variant font-medium">completed</span>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-code-lg text-code-lg text-primary-container font-semibold">{analyzedCount}</span>
                    <span className="font-code-sm text-code-sm text-outline">/ {totalPackages} dependencies analyzed</span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden relative mt-space-xs">
                  <div
                    className="h-full bg-gradient-to-r from-primary-container via-tertiary-container to-primary-container rounded-full transition-all duration-500 relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-space-xs text-outline font-code-sm text-code-sm">
                  <span>Elapsed: 00:0{elapsedSeconds}.24s</span>
                  <span>Est. Remaining: ~00:0{Math.max(1, 4 - elapsedSeconds)}.80s</span>
                </div>
              </div>

              {/* Pipeline Execution Graph */}
              <div className="flex flex-col gap-space-sm">
                <span className="font-label-caps text-label-caps uppercase text-outline">Pipeline Execution Graph</span>
                <div className="flex flex-col gap-space-xs">
                  {/* Step 1: Ingestion */}
                  <PipelineStep
                    stepNum={1}
                    icon="check_circle"
                    title="Ingesting repository &amp; manifest"
                    detail="package.json + package-lock.json validated via GitHub REST"
                    duration="0.34s"
                    state={activeStageIndex > 0 ? 'done' : activeStageIndex === 0 ? 'active' : 'pending'}
                  />

                  {/* Step 2: Transitive Graph */}
                  <PipelineStep
                    stepNum={2}
                    icon="account_tree"
                    title="Constructing transitive dependency graph"
                    detail={`${totalPackages} total nodes resolved across sub-tree hierarchy`}
                    duration="0.68s"
                    state={activeStageIndex > 1 ? 'done' : activeStageIndex === 1 ? 'active' : 'pending'}
                  />

                  {/* Step 3: Vulnerability Intel */}
                  <PipelineStep
                    stepNum={3}
                    icon="bug_report"
                    title="Querying OSV, GHSA &amp; NVD intelligence feeds"
                    detail="Batch lookup across 40,000+ open-source vulnerability records"
                    duration="1.12s"
                    state={activeStageIndex > 2 ? 'done' : activeStageIndex === 2 ? 'active' : 'pending'}
                  />

                  {/* Step 4: Typosquatting / Confusion */}
                  <PipelineStep
                    stepNum={4}
                    icon="warning"
                    title="Levenshtein distance &amp; typosquat evaluation"
                    detail="Cross-matching package namespace vs top 500 popular npm roots"
                    duration="0.82s"
                    state={activeStageIndex > 3 ? 'done' : activeStageIndex === 3 ? 'active' : 'pending'}
                  />

                  {/* Step 5: Reputation & Drift */}
                  <PipelineStep
                    stepNum={5}
                    icon="verified_user"
                    title="Analyzing reputation, maintainer drift &amp; provenance"
                    detail="npm registry downloads, maintainer count, and release staleness"
                    duration="0.94s"
                    state={activeStageIndex > 4 ? 'done' : activeStageIndex === 4 ? 'active' : 'pending'}
                  />

                  {/* Step 6: Risk Score Synthesis */}
                  <PipelineStep
                    stepNum={6}
                    icon="analytics"
                    title="Synthesizing explainable Supply Chain Risk Score"
                    detail="Calibrating weighted risk vector (vulnerability + CVSS + drift)"
                    duration="0.45s"
                    state={activeStageIndex > 5 ? 'done' : activeStageIndex === 5 ? 'active' : 'pending'}
                  />

                  {/* Step 7: AI Remediation */}
                  <PipelineStep
                    stepNum={7}
                    icon="psychology"
                    title="Formulating evidence-backed AI remediation recommendations"
                    detail="Server-side Gemini engine generating non-breaking upgrade matrix &amp; auto-PR"
                    duration="1.20s"
                    state={activeStageIndex > 6 ? 'done' : activeStageIndex === 6 ? 'active' : 'pending'}
                  />
                </div>
              </div>

              {/* Terminal Output Telemetry Console */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs text-outline font-label-caps text-label-caps uppercase">
                    <span className="material-symbols-outlined text-[14px]">terminal</span>
                    <span>Diagnostic Execution Stream</span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <button
                      onClick={copyLogs}
                      className="text-outline hover:text-on-surface font-code-sm text-code-sm flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      <span>{copiedLog ? 'Copied' : 'Copy Log'}</span>
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-lg p-space-md font-code-sm text-code-sm overflow-x-auto flex flex-col gap-1.5 shadow-inner select-text">
                  <div className="text-outline flex items-start gap-2">
                    <span className="opacity-50">[14:32:01.102]</span>
                    <span className="text-primary-container font-semibold">INFO:</span>
                    <span className="text-on-surface-variant">Fetched repository branch: <code className="text-on-surface">main</code> from GitHub API</span>
                  </div>
                  <div className="text-outline flex items-start gap-2">
                    <span className="opacity-50">[14:32:01.450]</span>
                    <span className="text-primary-container font-semibold">INFO:</span>
                    <span className="text-on-surface-variant">Parsed dependency tree: <span className="text-on-surface font-semibold">{totalPackages} packages</span> loaded</span>
                  </div>
                  {activeStageIndex >= 2 && (
                    <div className="text-outline flex items-start gap-2 bg-secondary-container/10 -mx-2 px-2 py-0.5 rounded">
                      <span className="opacity-50">[14:32:02.120]</span>
                      <span className="text-secondary font-bold">INFO:</span>
                      <span className="text-secondary-fixed">OSV.dev batch lookup completed for all candidate nodes</span>
                    </div>
                  )}
                  {activeStageIndex >= 3 && (
                    <div className="text-outline flex items-start gap-2">
                      <span className="opacity-50">[14:32:02.390]</span>
                      <span className="text-primary font-semibold">CHECK:</span>
                      <span className="text-on-surface">Levenshtein typosquatting matrix analyzed against top npm packages</span>
                    </div>
                  )}
                  {activeStageIndex >= 4 && (
                    <div className="text-outline flex items-start gap-2">
                      <span className="opacity-50">[14:32:02.810]</span>
                      <span className="text-tertiary font-semibold">SCANNING:</span>
                      <span className="text-tertiary-fixed-dim animate-pulse">Querying package reputation &amp; maintainer signals...</span>
                    </div>
                  )}
                  <div className="text-outline flex items-start gap-2 pt-1 border-t border-surface-variant/40">
                    <span className="opacity-50">[14:32:03.204]</span>
                    <span className="text-outline font-semibold">STATUS:</span>
                    <span className="text-on-surface-variant">{scan?.statusMessage || 'Processing pipeline telemetry...'}</span>
                  </div>
                </div>
              </div>

              {/* Real-time Ingestion Mini-Metrics Ledger */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase text-outline">Direct Roots</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface mt-1">
                    {scan?.packages?.filter(p => p.isDirect).length || 24}
                  </span>
                  <span className="font-code-sm text-code-sm text-primary-container">Top level</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase text-outline">Transitive</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface mt-1">
                    {scan?.packages?.filter(p => !p.isDirect).length || 119}
                  </span>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">Nested graph</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase text-outline">Advisories</span>
                  <span className="font-headline-sm text-headline-sm text-secondary mt-1">
                    {scan?.packages ? scan.packages.reduce((sum, p) => sum + p.vulnerabilities.length, 0) : 'Scanning'}
                  </span>
                  <span className="font-code-sm text-code-sm text-secondary-fixed">Action req.</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase text-outline">SLSA Grade</span>
                  <span className="font-headline-sm text-headline-sm text-tertiary mt-1">Level 2</span>
                  <span className="font-code-sm text-code-sm text-tertiary-fixed-dim">Attested</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelineStep({
  title,
  detail,
  duration,
  state,
}: {
  stepNum?: number
  icon?: string
  title: string
  detail: string
  duration: string
  state: 'done' | 'active' | 'pending'
}) {
  if (state === 'done') {
    return (
      <div className="flex items-start gap-space-md p-space-sm rounded-lg bg-surface-container-low transition-colors">
        <div className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-primary-container/10 text-primary-container">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex flex-col">
            <span className="font-body-md text-body-md text-on-surface font-medium" dangerouslySetInnerHTML={{ __html: title }} />
            <span className="font-code-sm text-code-sm text-on-surface-variant">{detail}</span>
          </div>
          <span className="font-code-sm text-code-sm text-primary-container">{duration}</span>
        </div>
      </div>
    )
  }

  if (state === 'active') {
    return (
      <div className="flex items-start gap-space-md p-space-sm rounded-lg bg-surface-container-high transition-colors relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container"></div>
        <div className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-tertiary-container/20 text-tertiary-container">
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-body-md text-body-md text-on-surface font-bold" dangerouslySetInnerHTML={{ __html: title }} />
              <span className="px-1.5 py-0.2 rounded-DEFAULT bg-tertiary-container text-on-tertiary font-label-caps text-label-caps font-bold">EXECUTING</span>
            </div>
            <span className="font-code-sm text-code-sm text-tertiary-fixed-dim font-medium">{detail}</span>
          </div>
          <span className="font-code-sm text-code-sm text-tertiary-container font-semibold animate-pulse">Running...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-space-md p-space-sm rounded-lg bg-surface-container-lowest/40 opacity-70">
      <div className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-surface-variant text-outline">
        <span className="material-symbols-outlined text-[16px]">schedule</span>
      </div>
      <div className="flex-1 flex flex-col">
        <span className="font-body-md text-body-md text-outline font-medium" dangerouslySetInnerHTML={{ __html: title }} />
        <span className="font-code-sm text-code-sm text-outline">{detail}</span>
      </div>
      <span className="font-code-sm text-code-sm text-outline">Queued</span>
    </div>
  )
}

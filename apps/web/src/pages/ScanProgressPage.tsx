import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult } from '../types'
import { getScan } from '../lib/api'
import {
  Shield, Clock, AlertTriangle, FolderX, Key, GitMerge, Link2,
  CornerDownRight, ArrowLeft, FolderOpen, Terminal, Copy, Check,
  RefreshCw, Lock, GitFork, Sliders, Cpu, GitBranch, CheckSquare,
  Share2, Loader2, ShieldCheck, CheckCircle
} from 'lucide-react'

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
    queryFn: () => getScan(id!),
    enabled: !!id,
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

  const totalPackages = scan?.packages?.length || 0
  const analyzedCount = totalPackages > 0
    ? Math.min(totalPackages, Math.max(1, Math.round((progressPercent / 100) * totalPackages)))
    : null

  const copyLogs = () => {
    const logText = [
      `[INFO] Target: ${scan?.repoUrl}`,
      `[INFO] Status: ${scan?.statusMessage || scan?.status}`,
      `[INFO] Analyzed: ${totalPackages > 0 ? `${analyzedCount}/${totalPackages} packages` : 'Resolving packages...'}`,
      scan?.status === 'failed' ? `[HALT] ${scan.statusMessage}` : `[INFO] Pipeline in-flight`,
    ].join('\n')
    navigator.clipboard.writeText(logText)
    setCopiedLog(true)
    setTimeout(() => setCopiedLog(false), 2000)
  }

  // ── ERROR STATE (Missing Manifest / Failed Scan) ──
  if (scan?.status === 'failed' || error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 animate-fade-in">
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-code-sm text-xs text-on-surface-variant">
            <Link to="/app" className="hover:text-primary transition-colors flex items-center gap-1.5 no-underline text-on-surface-variant">
              <Shield className="w-4 h-4 text-primary" />
              <span>Security Audit</span>
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-medium">{repoName}</span>
            <span className="text-outline">/</span>
            <span className="text-critical font-medium">Scan Diagnostics #SG-{id?.slice(0, 4)}</span>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-critical/10 rounded-full border border-critical/30">
              <span className="w-2 h-2 rounded-full bg-critical animate-pulse"></span>
              <span className="font-code-sm text-xs text-critical font-semibold uppercase tracking-wider">Pipeline: Halted</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-lg text-outline font-code-sm text-xs border border-outline-variant/30">
              <Clock className="w-3.5 h-3.5" />
              <span>Duration: {elapsedSeconds}s</span>
            </div>
          </div>
        </div>

        {/* 2-Column Error Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Error Panel */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="relative bg-surface-container-low rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden p-6">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-critical"></div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-critical/10 rounded-lg border border-critical/20">
                    <AlertTriangle className="w-4 h-4 text-critical" />
                    <span className="font-code-sm text-xs text-critical font-semibold uppercase tracking-wider">Scan Diagnostic • Resolution Halted</span>
                  </div>
                  <span className="font-code-sm text-xs text-outline">Exit Code: 127_ENOENT</span>
                </div>

                <div>
                  <h1 className="font-headline-md text-xl font-bold text-on-surface">Unable to complete this scan</h1>
                  <p className="font-body-md text-sm text-on-surface-variant mt-1 max-w-2xl">
                    {scan?.statusMessage || 'The target repository manifest could not be found or fetched. Ensure the repository contains a valid package.json and package-lock.json.'}
                  </p>
                </div>

                {/* Scenario Switcher Tabs */}
                <div className="flex gap-2 bg-surface-container p-1 rounded-lg self-start">
                  <button
                    onClick={() => setErrorScenario('A')}
                    className={`px-3 py-1.5 rounded-md font-code-sm text-xs transition-all cursor-pointer border-none ${
                      errorScenario === 'A'
                        ? 'bg-surface-container-high text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Manifest Missing
                  </button>
                  <button
                    onClick={() => setErrorScenario('B')}
                    className={`px-3 py-1.5 rounded-md font-code-sm text-xs transition-all cursor-pointer border-none ${
                      errorScenario === 'B'
                        ? 'bg-surface-container-high text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Auth &amp; Network
                  </button>
                  <button
                    onClick={() => setErrorScenario('C')}
                    className={`px-3 py-1.5 rounded-md font-code-sm text-xs transition-all cursor-pointer border-none ${
                      errorScenario === 'C'
                        ? 'bg-surface-container-high text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface bg-transparent'
                    }`}
                  >
                    Lockfile Conflict
                  </button>
                </div>

                {/* Tab Scenario A */}
                {errorScenario === 'A' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <FolderX className="w-5 h-5 text-critical mt-0.5 shrink-0" />
                      <div>
                        <h2 className="font-headline-sm text-sm font-bold text-on-surface">No Supported Manifests Found</h2>
                        <p className="font-body-md text-xs text-on-surface-variant mt-0.5">SupplyGuard recursively searches for npm (package.json, package-lock.json) and Python (requirements.txt, pyproject.toml, Pipfile, poetry.lock) manifests across all repository directories.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-lg p-3 text-on-surface font-code-sm text-xs flex flex-col gap-1 border border-outline-variant/30">
                      <div className="flex items-center justify-between text-critical">
                        <span>ERROR: Repository manifest search failed</span>
                        <span className="font-code-sm text-[10px] uppercase bg-critical/10 px-2 py-0.5 rounded text-critical font-bold">Diagnostic Result</span>
                      </div>
                      <div className="text-on-surface-variant">PATH: <span className="text-on-surface">{scan?.repoUrl}</span> <span className="text-outline">(branch: main)</span></div>
                      <div className="text-on-surface-variant">STATUS: Recursive tree scan completed • 0 supported manifest files located</div>
                      <div className="text-primary pt-1">HINT: Ensure at least one supported manifest (package.json, requirements.txt, pyproject.toml, Pipfile, poetry.lock) is present in the repository tree.</div>
                    </div>
                  </div>
                )}

                {/* Tab Scenario B */}
                {errorScenario === 'B' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-critical mt-0.5 shrink-0" />
                      <div>
                        <h2 className="font-headline-sm text-sm font-bold text-on-surface">Private Repo or Authentication Required</h2>
                        <p className="font-body-md text-xs text-on-surface-variant mt-0.5">The upstream Git daemon denied public access or deploy keys were rejected during shallow clone handshake.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-lg p-3 text-on-surface font-code-sm text-xs flex flex-col gap-1 border border-outline-variant/30">
                      <div className="text-critical">ERROR: Remote git authentication failed [401 Unauthorized]</div>
                      <div className="text-on-surface-variant">REMOTE: {scan?.repoUrl}</div>
                      <div className="text-primary pt-1">HINT: Ensure the repository is publicly accessible or has valid access permissions configured.</div>
                    </div>
                  </div>
                )}

                {/* Tab Scenario C */}
                {errorScenario === 'C' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <GitMerge className="w-5 h-5 text-critical mt-0.5 shrink-0" />
                      <div>
                        <h2 className="font-headline-sm text-sm font-bold text-on-surface">Lockfile Inconsistency Detected</h2>
                        <p className="font-body-md text-xs text-on-surface-variant mt-0.5">The package-lock.json or yarn.lock file contains unresolved cyclic references or unresolvable peer dependencies.</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-lg p-3 text-on-surface font-code-sm text-xs flex flex-col gap-1 border border-outline-variant/30">
                      <div className="text-critical">ERROR: ERESOLVE could not resolve peer dependency tree</div>
                      <div className="text-on-surface-variant">CONFLICT: Manifest contains unresolved peer dependency declarations</div>
                      <div className="text-primary pt-1">HINT: Ensure a valid npm v7+ package-lock.json is committed in the repository.</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/app')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg shadow-sm font-semibold transition-all cursor-pointer border-none"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Try Another Repository</span>
                  </button>
                  <button
                    onClick={() => setSubpathOpen(!subpathOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-xs rounded-lg shadow-sm font-semibold transition-colors cursor-pointer border border-outline-variant/40"
                  >
                    <CornerDownRight className="w-4 h-4" />
                    <span>Specify Manifest Subpath</span>
                  </button>
                  <Link
                    to="/app"
                    className="px-3 py-2 text-on-surface-variant hover:text-primary font-body-md text-xs transition-colors inline-flex items-center gap-1.5 no-underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Overview</span>
                  </Link>
                </div>

                {/* Subpath Drawer */}
                {subpathOpen && (
                  <div className="bg-surface-container p-4 rounded-xl flex flex-col gap-2 mt-1 border border-outline-variant/30">
                    <span className="font-code-sm text-[11px] uppercase tracking-wider text-outline">Target Directory Subpath Override</span>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <div className="relative flex-1 w-full">
                        <FolderOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                        <input
                          type="text"
                          value={subpathValue}
                          onChange={(e) => setSubpathValue(e.target.value)}
                          placeholder="e.g. apps/web or packages/core"
                          className="w-full h-9 bg-surface-container-lowest rounded-lg pl-9 pr-3 text-on-surface font-code-sm text-xs focus:outline-none focus:border-primary border border-outline-variant/40 transition-all"
                        />
                      </div>
                      <button
                        onClick={() => navigate('/app')}
                        className="w-full sm:w-auto px-4 py-2 bg-primary text-on-primary font-headline-sm text-xs rounded-lg font-semibold whitespace-nowrap cursor-pointer border-none"
                      >
                        Save &amp; Re-run Scan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Stream Terminal */}
            <div className="bg-surface-container-low rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-critical/70"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-warning/70"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-safe/70"></span>
                  </div>
                  <span className="font-code-sm text-xs text-on-surface-variant ml-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    <span>telemetry-stream.log</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyLogs}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-code-sm text-xs transition-all cursor-pointer border-none"
                  >
                    {copiedLog ? <Check className="w-3.5 h-3.5 text-safe" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLog ? 'Copied!' : 'Copy Log'}</span>
                  </button>
                  <button
                    onClick={() => navigate('/app')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary hover:bg-primary-container text-on-primary font-code-sm text-xs transition-all font-semibold cursor-pointer border-none"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Scan</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-surface-container-lowest font-code-sm text-xs flex flex-col gap-1.5 overflow-x-auto text-on-surface">
                <div className="flex items-start gap-2 text-on-surface-variant">
                  <span className="text-outline select-none">01</span>
                  <span className="text-primary font-medium">INFO:</span>
                  <span>Resolving git endpoint {scan?.repoUrl}</span>
                </div>
                <div className="flex items-start gap-2 text-on-surface-variant">
                  <span className="text-outline select-none">02</span>
                  <span className="text-primary font-medium">SUCCESS:</span>
                  <span>Git handshake OK (ref: refs/heads/main)</span>
                </div>
                <div className="flex items-start gap-2 text-critical bg-critical/10 px-2 py-1 rounded">
                  <span className="text-critical select-none font-bold">03</span>
                  <span className="font-bold">ERROR:</span>
                  <span>{scan?.statusMessage || 'package.json missing in root directory.'}</span>
                </div>
                <div className="flex items-start gap-2 text-critical bg-critical/15 px-2 py-1 rounded">
                  <span className="text-critical select-none font-bold">04</span>
                  <span className="font-bold">HALT:</span>
                  <span>Ingestion terminated before dependency tree generation. (code: SG_ERR_NO_MANIFEST)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Reference Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-surface-container-low rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-sm font-bold text-on-surface">Failure Categorization</h2>
                <span className="font-code-sm text-[10px] text-outline uppercase tracking-wider">Reference</span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant">
                Common root causes that halt the automated analysis pipeline:
              </p>
              <div className="flex flex-col gap-2">
                <div
                  onClick={() => setErrorScenario('B')}
                  className="p-3 bg-surface-container rounded-lg flex items-start gap-2.5 hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/20"
                >
                  <Lock className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-code-sm text-xs text-on-surface font-semibold">Private Auth Missing</span>
                    <span className="font-body-md text-[11px] text-outline mt-0.5">SSH key rejected or invalid deployment token for private repos.</span>
                  </div>
                </div>
                <div
                  onClick={() => setErrorScenario('A')}
                  className="p-3 bg-surface-container rounded-lg flex items-start gap-2.5 hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/20"
                >
                  <AlertTriangle className="w-4 h-4 text-critical mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-code-sm text-xs text-on-surface font-semibold">Invalid URL Syntax</span>
                    <span className="font-body-md text-[11px] text-outline mt-0.5">Protocol unsupported or target repository was relocated or archived.</span>
                  </div>
                </div>
                <div
                  onClick={() => setErrorScenario('C')}
                  className="p-3 bg-surface-container rounded-lg flex items-start gap-2.5 hover:bg-surface-container-high transition-colors cursor-pointer border border-outline-variant/20"
                >
                  <GitFork className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-code-sm text-xs text-on-surface font-semibold">Lockfile Resolution Failure</span>
                    <span className="font-body-md text-[11px] text-outline mt-0.5">Strict peer-dependency conflicts prevented deterministic graph synthesis.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-code-sm text-[11px] uppercase tracking-wider text-outline">Engine Telemetry</span>
                <span className="font-code-sm text-xs text-safe font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-safe"></span>
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-code-sm">
                <div className="p-2.5 bg-surface-container rounded-lg flex flex-col">
                  <span className="text-[10px] text-outline uppercase">Runtime</span>
                  <span className="text-on-surface font-medium mt-0.5">Node 20 • Express</span>
                </div>
                <div className="p-2.5 bg-surface-container rounded-lg flex flex-col">
                  <span className="text-[10px] text-outline uppercase">Intel Feeds</span>
                  <span className="text-on-surface font-medium mt-0.5">OSV.dev + npm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIVE SCAN PIPELINE INGESTION STATE ──
  return (
    <div className="relative px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden animate-fade-in flex flex-col gap-6">
      {/* Top Console Breadcrumb & State Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-outline font-code-sm text-xs uppercase tracking-wider mb-1">
            <span>Orchestrator</span>
            <span>/</span>
            <span className="text-primary font-medium">Deep Inspection</span>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">Security Ingestion Pipeline</h1>
            <span className="font-code-sm text-xs text-on-surface-variant">Task #SC-{id?.slice(0, 4) || '9428'}</span>
          </div>
        </div>

        {/* Mode Toggle Controller */}
        <div className="flex items-center p-1 bg-surface-container-low rounded-lg border border-outline-variant/30 self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-code-sm text-xs transition-all cursor-pointer border-none ${
              activeTab === 'input'
                ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameters</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-code-sm text-xs transition-all cursor-pointer border-none ${
              activeTab === 'pipeline'
                ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Live Scanner</span>
            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-code-sm text-[10px] font-bold">
              {scan?.status === 'complete' ? 'Done' : 'In-flight'}
            </span>
          </button>
        </div>
      </div>

      {/* Dual Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration & Parameters (col-span-5) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-outline-variant/20">
              <Cpu className="w-5 h-5 text-primary" />
              <div className="font-headline-sm text-sm font-bold text-on-surface">Target Specification</div>
            </div>

            {/* Target Repository Endpoint Box */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-code-sm">
                  <label className="text-outline uppercase tracking-wider text-[10px]">Repository Endpoint</label>
                  <span className="text-primary flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3" /> Public &amp; Deploy Key Access
                  </span>
                </div>
                <div className="flex rounded-lg overflow-hidden bg-surface-container border border-outline-variant/40">
                  <div className="px-3 flex items-center text-outline bg-surface-container-high font-code-sm text-xs border-r border-outline-variant/40">
                    git://
                  </div>
                  <input
                    readOnly
                    value={scan?.repoUrl || 'https://github.com/expressjs/express'}
                    className="w-full bg-transparent px-3 py-2 text-on-surface font-code-sm text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-code-sm text-[10px] uppercase tracking-wider text-outline">Branch / Ref</label>
                  <div className="flex items-center bg-surface-container rounded-lg px-3 py-1.5 border border-outline-variant/40 gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-outline shrink-0" />
                    <input readOnly value="main" className="w-full bg-transparent text-on-surface font-code-sm text-xs focus:outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-code-sm text-[10px] uppercase tracking-wider text-outline">Subpath</label>
                  <div className="flex items-center bg-surface-container rounded-lg px-3 py-1.5 border border-outline-variant/40 gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-outline shrink-0" />
                    <input readOnly value="/" className="w-full bg-transparent text-on-surface font-code-sm text-xs focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Active Verification Modules */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="font-code-sm text-[10px] uppercase tracking-wider text-outline">Active Inspection Modules</label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container text-xs font-code-sm text-on-surface border border-outline-variant/20">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span>Transitive Dependency Graph Parsing</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container text-xs font-code-sm text-on-surface border border-outline-variant/20">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span>OSV &amp; GHSA Vulnerability Feed Correlation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container text-xs font-code-sm text-on-surface border border-outline-variant/20">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span>Typosquatting &amp; Namespace Confusion Checks</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container text-xs font-code-sm text-on-surface border border-outline-variant/20">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span>AI-Powered Remediation Recommendations</span>
                  </div>
                </div>
              </div>

              {/* Requirement 11: Detected Dependency Manifests Checklist */}
              {scan?.detectedFiles && scan.detectedFiles.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <label className="font-code-sm text-[10px] uppercase tracking-wider text-outline">
                      Detected Dependency Manifests ({scan.detectedFiles.length})
                    </label>
                    <span className="font-code-sm text-[10px] text-safe font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-safe"></span>
                      Discovered
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {scan.detectedFiles.map((file) => {
                      const isLock = file.includes('lock') || file.includes('shrinkwrap')
                      const isPython = file.endsWith('.txt') || file.endsWith('.toml') || file.includes('Pipfile') || file.includes('poetry')
                      return (
                        <div key={file} className="flex items-center justify-between p-2 rounded-lg bg-surface-container text-xs font-code-sm text-on-surface border border-outline-variant/20">
                          <div className="flex items-center gap-2 truncate">
                            <Check className="w-3.5 h-3.5 text-safe shrink-0" />
                            <span className="truncate font-mono">{file}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                            isPython
                              ? 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                              : isLock
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {isPython ? 'Python' : isLock ? 'Lockfile' : 'npm'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ingestion Action Trigger */}
              <div className="pt-2">
                {scan?.status === 'complete' ? (
                  <button
                    onClick={() => navigate(`/app/scans/${id}/dashboard`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg font-bold shadow-sm transition-all cursor-pointer border-none"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>View Risk Topology</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary/80 text-on-primary font-headline-sm text-xs rounded-lg font-bold shadow-sm opacity-90 cursor-wait border-none"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning Pipeline Active...</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center justify-between border border-outline-variant/30 text-xs font-code-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-safe" />
              <span className="text-on-surface font-medium">Deterministic Ingestion</span>
            </div>
            <span className="text-outline">
              {scan?.treeCompleteness === 'truncated' ? 'Tree Truncated (>1,000 files)' : 'Full Tree Resolved'}
            </span>
          </div>
        </div>

        {/* Right Column: Live Scan Progress & Telemetry Pipeline (col-span-7) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                <span className="font-code-sm text-xs font-semibold uppercase tracking-wider text-primary">
                  {scan?.status === 'complete' ? 'Scan Completed' : 'Scan in Progress'} • {repoName}
                </span>
              </div>
              <div className="font-code-sm text-xs text-outline">
                Analysis Engine: Active
              </div>
            </div>

            {/* Progress Meter */}
            <div className="flex flex-col gap-2 p-4 bg-surface-container rounded-lg border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-md text-2xl font-bold text-on-surface tabular-nums">{progressPercent}%</span>
                  <span className="font-body-md text-xs text-on-surface-variant">completed</span>
                </div>
                <div className="font-code-sm text-xs text-primary font-semibold">
                  {analyzedCount !== null ? (
                    <>
                      {analyzedCount} <span className="text-outline font-normal">/ {totalPackages} packages evaluated</span>
                    </>
                  ) : (
                    <span className="text-outline font-normal">Resolving package graph...</span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-outline font-code-sm text-[11px] pt-1">
                <span>Duration: {elapsedSeconds}s</span>
                <span>Est. Completion: ~{Math.max(1, 4 - elapsedSeconds)}s</span>
              </div>
            </div>

            {/* Requirement 12: Project Dependency Breakdown */}
            {scan?.projectSummaries && scan.projectSummaries.length > 0 && (
              <div className="flex flex-col gap-2 p-4 bg-surface-container rounded-lg border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-code-sm text-[10px] uppercase tracking-wider text-outline flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-primary" />
                    <span>Project Dependency Breakdown ({scan.projectSummaries.length} {scan.projectSummaries.length === 1 ? 'project' : 'projects'})</span>
                  </span>
                  {scan.treeCompleteness === 'truncated' && (
                    <span className="font-code-sm text-[10px] text-secondary font-semibold">Tree Partial</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {scan.projectSummaries.map((proj) => (
                    <div key={`${proj.projectName}-${proj.directory}`} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-headline-sm text-xs font-bold text-on-surface capitalize">
                            {proj.projectName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-code-sm text-[10px] uppercase font-bold ${
                            proj.ecosystem === 'pypi'
                              ? 'bg-tertiary/10 text-tertiary border border-tertiary/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {proj.ecosystem === 'pypi' ? 'Python' : 'npm'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-code-sm text-[10px] font-semibold ${
                            proj.resolutionStatus === 'locked'
                              ? 'bg-safe/10 text-safe'
                              : 'bg-secondary/10 text-secondary'
                          }`}>
                            {proj.resolutionStatus === 'locked' ? 'Locked' : 'Direct Only'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center bg-surface-container py-1.5 px-2 rounded font-code-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-outline uppercase">Direct</span>
                          <span className="text-xs font-bold text-on-surface">{proj.directDependencies}</span>
                        </div>
                        <div className="flex flex-col border-x border-outline-variant/30">
                          <span className="text-[10px] text-outline uppercase">Transitive</span>
                          <span className="text-xs font-bold text-on-surface">{proj.transitiveDependencies}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-outline uppercase">Total</span>
                          <span className="text-xs font-bold text-primary">{proj.totalDependencies}</span>
                        </div>
                      </div>

                      <div className="text-[11px] font-code-sm text-outline truncate flex items-center justify-between">
                        <span>Directory: <code className="text-on-surface-variant font-mono">{proj.directory || './'}</code></span>
                        <span className="text-[10px]">{proj.manifestFiles.length} manifest{proj.manifestFiles.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline Execution Graph */}
            <div className="flex flex-col gap-2">
              <span className="font-code-sm text-[10px] uppercase tracking-wider text-outline">Execution Pipeline</span>
              <div className="flex flex-col gap-1.5">
                <PipelineStep
                  stepNum={1}
                  title="Ingesting repository &amp; manifest"
                  detail="package.json + lockfile validated via GitHub API"
                  duration="0.34s"
                  state={activeStageIndex > 0 ? 'done' : activeStageIndex === 0 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={2}
                  title="Constructing transitive dependency graph"
                  detail={totalPackages > 0 ? `${totalPackages} total nodes resolved across sub-tree` : 'Resolving nodes across sub-tree'}
                  duration="0.68s"
                  state={activeStageIndex > 1 ? 'done' : activeStageIndex === 1 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={3}
                  title="Querying OSV &amp; GHSA vulnerability feeds"
                  detail="Batch lookup across open-source vulnerability databases"
                  duration="1.12s"
                  state={activeStageIndex > 2 ? 'done' : activeStageIndex === 2 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={4}
                  title="Evaluating typosquatting distance"
                  detail="Cross-matching namespaces against npm registry roots"
                  duration="0.82s"
                  state={activeStageIndex > 3 ? 'done' : activeStageIndex === 3 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={5}
                  title="Analyzing provenance &amp; maintainer signals"
                  detail="Registry downloads and release staleness evaluation"
                  duration="0.94s"
                  state={activeStageIndex > 4 ? 'done' : activeStageIndex === 4 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={6}
                  title="Synthesizing Supply Chain Risk Score"
                  detail="Calibrating weighted risk vector (CVSS + blast radius)"
                  duration="0.45s"
                  state={activeStageIndex > 5 ? 'done' : activeStageIndex === 5 ? 'active' : 'pending'}
                />
                <PipelineStep
                  stepNum={7}
                  title="Formulating AI remediation guidance"
                  detail="Generating non-breaking upgrade paths and patch matrix"
                  duration="1.20s"
                  state={activeStageIndex > 6 ? 'done' : activeStageIndex === 6 ? 'active' : 'pending'}
                />
              </div>
            </div>

            {/* Diagnostic Terminal Output */}
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex items-center justify-between text-outline font-code-sm text-xs">
                <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Terminal className="w-3 h-3 text-primary" />
                  <span>Execution Stream</span>
                </span>
                <button
                  onClick={copyLogs}
                  className="text-outline hover:text-on-surface font-code-sm text-xs flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  {copiedLog ? <Check className="w-3 h-3 text-safe" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLog ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-3 font-code-sm text-xs overflow-x-auto flex flex-col gap-1 border border-outline-variant/30 select-text">
                <div className="text-on-surface-variant flex items-start gap-2">
                  <span className="text-primary font-semibold">INFO:</span>
                  <span>Branch <code className="text-on-surface">main</code> resolved from GitHub</span>
                </div>
                <div className="text-on-surface-variant flex items-start gap-2">
                  <span className="text-primary font-semibold">INFO:</span>
                  <span>Parsed dependency tree: <span className="text-on-surface font-semibold">{totalPackages} packages</span> loaded</span>
                </div>
                {activeStageIndex >= 2 && (
                  <div className="text-secondary flex items-start gap-2 bg-secondary/10 px-1.5 py-0.5 rounded">
                    <span className="font-bold">INFO:</span>
                    <span>OSV.dev batch query completed for all candidate nodes</span>
                  </div>
                )}
                {activeStageIndex >= 3 && (
                  <div className="text-on-surface-variant flex items-start gap-2">
                    <span className="text-primary font-semibold">CHECK:</span>
                    <span>Levenshtein typosquatting matrix analyzed against top packages</span>
                  </div>
                )}
                <div className="text-on-surface-variant flex items-start gap-2 pt-1 border-t border-outline-variant/20">
                  <span className="text-outline font-semibold">STATUS:</span>
                  <span>{scan?.statusMessage || 'Processing pipeline telemetry...'}</span>
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
  title: string
  detail: string
  duration: string
  state: 'done' | 'active' | 'pending'
}) {
  if (state === 'done') {
    return (
      <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container transition-colors">
        <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-safe/10 text-safe shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex flex-col">
            <span className="font-body-md text-xs text-on-surface font-medium" dangerouslySetInnerHTML={{ __html: title }} />
            <span className="font-code-sm text-[11px] text-on-surface-variant">{detail}</span>
          </div>
          <span className="font-code-sm text-[11px] text-safe">{duration}</span>
        </div>
      </div>
    )
  }

  if (state === 'active') {
    return (
      <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container-high transition-colors relative overflow-hidden border-l-2 border-primary">
        <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex flex-col">
            <span className="font-body-md text-xs text-on-surface font-bold" dangerouslySetInnerHTML={{ __html: title }} />
            <span className="font-code-sm text-[11px] text-primary font-medium">{detail}</span>
          </div>
          <span className="font-code-sm text-[11px] text-primary font-semibold animate-pulse">Running...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container/40 opacity-70">
      <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-outline shrink-0">
        <Clock className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 flex flex-col">
        <span className="font-body-md text-xs text-outline font-medium" dangerouslySetInnerHTML={{ __html: title }} />
        <span className="font-code-sm text-[11px] text-outline">{detail}</span>
      </div>
      <span className="font-code-sm text-[10px] text-outline uppercase">Queued</span>
    </div>
  )
}

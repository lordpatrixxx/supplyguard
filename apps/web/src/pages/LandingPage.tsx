import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const prefill = (location.state as { prefillRepo?: string })?.prefillRepo || ''
  const [repoUrl, setRepoUrl] = useState(prefill || 'https://github.com/tastejs/todomvc')
  const [branch, setBranch] = useState('')
  const [subpath, setSubpath] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (prefill) {
      setRepoUrl(prefill)
    }
  }, [prefill])

  const scanMutation = useMutation({
    mutationFn: async (payload: { repoUrl: string; branch?: string; subpath?: string; userId?: string }) => {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Scan initiation failed')
      }
      return res.json() as Promise<{ scanId: string }>
    },
    onSuccess: (data) => {
      navigate(`/app/scans/${data.scanId}`)
    },
    onError: (err) => {
      setErrorMessage(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    const trimmed = repoUrl.trim()
    if (!trimmed) {
      setErrorMessage('Please enter a GitHub repository URL')
      return
    }
    let formatted = trimmed
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`
    }

    scanMutation.mutate({
      repoUrl: formatted,
      branch: branch.trim() || undefined,
      subpath: subpath.trim() || undefined,
      userId: user?.id,
    })
  }

  return (
    <div className="flex flex-col w-full">
      {/* Dynamic Atmospheric Glows */}
      <div className="relative w-full overflow-hidden px-margin-md lg:px-margin-lg py-space-xl">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 w-[30rem] h-[30rem] rounded-full bg-secondary-container/10 blur-[100px] pointer-events-none"></div>

        {/* Hero Asymmetric Split Grid (Stitch Specification) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start relative z-10">
          {/* Left Column: Mission Narrative & Directive Input */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            {/* Challenge Badge */}
            <div className="inline-flex items-center gap-space-xs self-start px-space-sm py-1 bg-surface-container-high rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-ping"></span>
              <span className="font-label-caps text-label-caps uppercase text-primary-container tracking-wider">
                PS14 Supply Chain Defense • National Cyber Challenge
              </span>
            </div>

            {/* Master Headline */}
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-tight">
              See what is hidden in your dependency chain, understand why it matters, and fix{' '}
              <span className="text-secondary underline decoration-secondary/30 decoration-2 underline-offset-4">
                high-risk issues first
              </span>
              .
            </h1>

            {/* Subheadline */}
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              Automated deep dependency tree analysis, real-time vulnerability cross-referencing, typosquatting &amp; dependency confusion detection, and explainable AI-backed remediation.
            </p>

            {/* Quick Scan Directive Input Box */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-space-xs p-space-sm bg-surface-container-low rounded-xl shadow-md border border-surface-variant">
              <div className="flex flex-col sm:flex-row gap-space-xs items-stretch sm:items-center">
                <div className="relative flex-1 flex items-center bg-surface-dim rounded-lg px-space-sm py-2">
                  <span className="material-symbols-outlined text-outline text-[20px] mr-2 shrink-0">
                    account_tree
                  </span>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value)
                      setErrorMessage('')
                    }}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-transparent font-code-md text-code-md text-on-surface focus:outline-none placeholder:text-outline"
                    disabled={scanMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setRepoUrl('https://github.com/remy/nodemon')}
                    className="font-code-sm text-code-sm text-outline hover:text-primary-container transition-colors ml-1 px-1.5 py-0.5 bg-surface-container-highest rounded cursor-pointer border-none"
                    title="Load nodemon demo repository"
                  >
                    DEMO
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={scanMutation.isPending}
                  className="flex items-center justify-center gap-space-xs px-space-xl py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] font-bold shrink-0 cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {scanMutation.isPending ? 'hourglass_top' : 'troubleshoot'}
                  </span>
                  <span>{scanMutation.isPending ? 'Analyzing...' : 'Analyze Repository'}</span>
                </button>
              </div>

              {/* Advanced Monorepo / Branch Toggle */}
              <div className="px-space-xs pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 font-code-sm text-code-sm text-outline hover:text-on-surface bg-transparent border-none cursor-pointer p-0"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showAdvanced ? 'expand_less' : 'tune'}
                  </span>
                  <span>{showAdvanced ? 'Hide Advanced Ingestion' : 'Advanced: Monorepo / Custom Branch'}</span>
                </button>

                <span className="font-code-sm text-code-sm text-primary-container hidden sm:inline">
                  Zero-token raw git manifest
                </span>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs p-space-sm bg-surface-dim rounded-lg border border-surface-variant mt-1 animate-fade-in">
                  <div>
                    <label className="block font-label-caps text-label-caps uppercase text-outline mb-1">
                      Git Branch (optional)
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main / master / staging"
                      className="w-full bg-surface-container border border-surface-variant rounded px-2.5 py-1.5 font-code-sm text-code-sm text-on-surface focus:outline-none focus:border-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps uppercase text-outline mb-1">
                      Monorepo Subpath (optional)
                    </label>
                    <input
                      type="text"
                      value={subpath}
                      onChange={(e) => setSubpath(e.target.value)}
                      placeholder="packages/backend or apps/web"
                      className="w-full bg-surface-container border border-surface-variant rounded px-2.5 py-1.5 font-code-sm text-code-sm text-on-surface focus:outline-none focus:border-primary-container"
                    />
                  </div>
                </div>
              )}

              {/* Manifest Subtext & Quick Signals */}
              <div className="flex items-center justify-between px-space-xs pt-1 text-on-surface-variant">
                <span className="font-code-sm text-code-sm flex items-center gap-1 text-outline">
                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                  Audits package.json &amp; npm lockfile
                </span>
                <span className="font-code-sm text-code-sm text-on-surface-variant">
                  {user ? `Scoped to ${user.email}` : 'Demo Workspace'}
                </span>
              </div>

              {errorMessage && (
                <div className="px-space-xs pt-2 text-error font-body-sm text-body-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>

            {/* Value Proposition Badges */}
            <div className="flex flex-wrap gap-space-xs pt-space-xs">
              <div className="flex items-center gap-1.5 px-space-sm py-1.5 bg-surface-container rounded-md text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary-container">device_hub</span>
                <span className="font-code-sm text-code-sm">Transitive Depth Traversal</span>
              </div>
              <div className="flex items-center gap-1.5 px-space-sm py-1.5 bg-surface-container rounded-md text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">spellcheck</span>
                <span className="font-code-sm text-code-sm">Typosquatting &amp; Confusion</span>
              </div>
              <div className="flex items-center gap-1.5 px-space-sm py-1.5 bg-surface-container rounded-md text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-tertiary">verified</span>
                <span className="font-code-sm text-code-sm">Explainable AI Remediation</span>
              </div>
            </div>

            {/* Trust & Intelligence Strip */}
            <div className="flex flex-col gap-space-xs pt-space-sm">
              <span className="font-label-caps text-label-caps uppercase text-outline">
                Correlated Threat Feeds &amp; Attestation Standards
              </span>
              <div className="flex items-center gap-space-sm flex-wrap text-on-surface-variant font-code-sm text-code-sm">
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-on-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>OSV.dev
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-on-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>GitHub Advisory (GHSA)
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-on-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>NIST NVD
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-on-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>npm Registry
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded text-on-surface">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Gemini AI
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Risk Constellation Visual Showcase (Stitch Design) */}
          <div className="lg:col-span-7 flex flex-col gap-space-sm">
            <div className="relative w-full h-[580px] bg-surface-container-low rounded-xl overflow-hidden shadow-xl p-space-md flex flex-col justify-between border border-surface-variant">
              {/* Background radial gradients */}
              <div className="absolute inset-0 bg-gradient-to-tr from-surface-dim via-surface-container-low to-surface-container opacity-90"></div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
              <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary/10 blur-2xl pointer-events-none"></div>

              {/* Interactive Constellation SVG Display */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <svg className="w-full h-full" fill="none" viewBox="0 0 700 560" xmlns="http://www.w3.org/2000/svg">
                  {/* Radial rings */}
                  <circle className="text-surface-variant/40" cx="350" cy="270" r="90" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" />
                  <circle className="text-surface-variant/30" cx="350" cy="270" r="180" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
                  <circle className="text-surface-variant/20" cx="350" cy="270" r="260" stroke="currentColor" strokeDasharray="6 6" strokeWidth="1" />

                  {/* Edges */}
                  <line className="text-primary-container/40" stroke="currentColor" strokeWidth="2" x1="350" y1="270" x2="230" y2="180" />
                  <line className="text-primary-container/40" stroke="currentColor" strokeWidth="2" x1="350" y1="270" x2="480" y2="160" />
                  <line className="text-tertiary/40" stroke="currentColor" strokeWidth="2" x1="350" y1="270" x2="290" y2="400" />
                  <line className="text-secondary/40" stroke="currentColor" strokeWidth="2" x1="350" y1="270" x2="490" y2="380" />

                  {/* Transitive critical path */}
                  <line className="text-secondary/70" stroke="currentColor" strokeDasharray="4 2" strokeWidth="2.5" x1="230" y1="180" x2="130" y2="110" />
                  <line className="text-secondary/80" stroke="currentColor" strokeWidth="2" x1="480" y1="160" x2="610" y2="100" />

                  {/* Root Node */}
                  <g>
                    <circle className="text-surface-dim" cx="350" cy="270" fill="currentColor" r="18" />
                    <circle className="text-primary-container" cx="350" cy="270" fill="currentColor" r="14" />
                    <circle className="text-primary-container/30" cx="350" cy="270" r="24" stroke="currentColor" strokeWidth="2" />
                    <text className="font-code-sm text-code-sm fill-on-surface font-semibold" textAnchor="middle" x="350" y="308">
                      store-api (root)
                    </text>
                  </g>

                  {/* Express clean direct */}
                  <g>
                    <circle className="text-primary-container" cx="230" cy="180" fill="currentColor" r="10" />
                    <text className="font-code-sm text-code-sm fill-on-surface font-medium" textAnchor="middle" x="210" y="160">
                      express@4.18.2
                    </text>
                  </g>

                  {/* Axios clean direct */}
                  <g>
                    <circle className="text-primary-container" cx="480" cy="160" fill="currentColor" r="9" />
                    <text className="font-code-sm text-code-sm fill-on-surface" textAnchor="start" x="500" y="145">
                      axios@1.6.0
                    </text>
                  </g>

                  {/* Lodash critical node */}
                  <g className="animate-pulse">
                    <circle className="text-secondary" cx="130" cy="110" fill="currentColor" r="14" />
                    <circle className="text-secondary/60" cx="130" cy="110" r="22" stroke="currentColor" strokeWidth="2" />
                    <text className="font-code-sm text-code-sm fill-secondary font-bold" textAnchor="middle" x="130" y="80">
                      lodash@4.17.20 (86/100)
                    </text>
                  </g>

                  {/* Reqeusts typosquat node */}
                  <g>
                    <circle className="text-secondary" cx="610" cy="100" fill="currentColor" r="12" />
                    <circle className="text-secondary/60" cx="610" cy="100" r="18" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1.5" />
                    <text className="font-code-sm text-code-sm fill-secondary" textAnchor="middle" x="610" y="70">
                      reqeusts@2.31.0 (Typosquat)
                    </text>
                  </g>
                </svg>
              </div>

              {/* Top Card Controls */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-space-xs px-2.5 py-1 bg-surface-container-high/80 backdrop-blur rounded border border-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                  <span className="font-label-caps text-label-caps uppercase text-secondary font-semibold">
                    Simulated Supply Chain Exposure
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-code-sm text-code-sm text-outline">Engine: 2D Force Vector</span>
                </div>
              </div>

              {/* Floating Focal Inspection Card (Stitch Exact Component) */}
              <div className="relative z-10 self-end max-w-sm w-full bg-surface-container/95 backdrop-blur border border-surface-variant rounded-xl p-space-md shadow-2xl glow-critical">
                <div className="flex items-start justify-between gap-space-sm pb-space-xs border-b border-surface-variant mb-space-xs">
                  <div className="flex flex-col">
                    <span className="font-code-sm text-code-sm text-secondary uppercase font-semibold">
                      Critical Transitive Finding
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      lodash@4.17.20
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-display-lg text-[22px] font-bold text-secondary">86</span>
                    <span className="font-label-caps text-label-caps text-outline">/100 RISK</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-code-sm text-code-sm mb-space-sm">
                  <div className="flex justify-between">
                    <span className="text-outline">Advisory ID:</span>
                    <span className="text-secondary font-mono">CVE-2021-23337</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Type:</span>
                    <span className="text-on-surface">Command Injection (CVSS 8.5)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Remediation:</span>
                    <span className="text-primary-container font-mono">npm install lodash@4.17.21</span>
                  </div>
                </div>

                <div className="p-2 bg-surface-dim rounded font-code-sm text-code-sm text-on-surface-variant truncate">
                  Route: express &rarr; body-parser &rarr; lodash
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Architectural Capabilities */}
        <div className="mt-space-2xl grid grid-cols-1 md:grid-cols-3 gap-gutter-lg relative z-10">
          <div className="bg-surface-container-low p-space-lg rounded-xl border border-surface-variant flex flex-col gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined">account_tree</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              01 • Ingestion &amp; Manifest Parsing
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Fetches package.json and npm v7+ lockfiles via the GitHub REST raw content API. Traverses multi-level nested dependency chains without server-side clone overhead.
            </p>
          </div>

          <div className="bg-surface-container-low p-space-lg rounded-xl border border-surface-variant flex flex-col gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">bug_report</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              02 • Vulnerability &amp; Typosquat Analysis
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Batch-queries OSV.dev aggregating GHSA and NVD advisories with CVSS scores. Computes Levenshtein distance against the top 500 npm packages to catch dependency confusion attacks.
            </p>
          </div>

          <div className="bg-surface-container-low p-space-lg rounded-xl border border-surface-variant flex flex-col gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              03 • Explainable AI Remediation
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Calls Gemini 2.0 Flash with strict JSON schemas to generate developer-friendly risk summaries and copyable npm upgrade commands tailored to each dependency path.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

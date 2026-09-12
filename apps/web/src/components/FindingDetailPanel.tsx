import { useState } from 'react'
import type { PackageNode } from '../types'
import {
  X, GitFork, Network, AlertTriangle, BarChart3, Shield,
  CheckCircle, Copy, ClipboardCheck, ExternalLink, Sparkles,
  Wrench, Package, Zap
} from 'lucide-react'

interface FindingDetailPanelProps {
  pkg: PackageNode
  onClose?: () => void
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="font-headline-sm text-sm text-on-surface font-semibold">{title}</h3>
    </div>
  )
}

export function FindingDetailPanel({ pkg, onClose }: FindingDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [copiedPlan, setCopiedPlan] = useState(false)

  const topVuln = pkg.vulnerabilities[0]
  const targetVer = topVuln?.fixedIn || 'latest'
  const isPython = pkg.ecosystem === 'PyPI'

  let fixCommand = pkg.remediation?.fix_command
  if (!fixCommand) {
    if (isPython) {
      fixCommand = `pip install --upgrade ${pkg.name}==${targetVer}`
    } else if (pkg.isDirect) {
      fixCommand = `npm install ${pkg.name}@${targetVer} --save-exact`
    } else {
      fixCommand = `npm update ${pkg.name} --depth 999`
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fixCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyPlan = () => {
    const planText = [
      `# SupplyGuard Remediation Plan for ${pkg.name}@${pkg.version}`,
      `Risk Score: ${pkg.riskScore}/100 (${pkg.riskTier.toUpperCase()})`,
      `Advisory Severity: ${pkg.advisorySeverity || topVuln?.severity || 'MEDIUM'}`,
      topVuln ? `Vulnerability: ${topVuln.id} (CVSS ${topVuln.cvss}) - ${topVuln.summary}` : null,
      `Dependency Path: ${pkg.path.join(' -> ') || pkg.name}`,
      `Dependency Type: ${pkg.isDirect ? 'Direct' : 'Transitive'}`,
      `Action: ${pkg.remediation?.fix || `Upgrade ${pkg.name} to ${targetVer}`}`,
      `Command: ${fixCommand}`,
      !pkg.isDirect
        ? `Transitive Guidance: If npm update does not elevate the package, declare an override in package.json:\n  "overrides": { "${pkg.name}": "${targetVer}" }`
        : null,
      pkg.remediation?.why_risky ? `Analysis: ${pkg.remediation.why_risky}` : null,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(planText)
    setCopiedPlan(true)
    setTimeout(() => setCopiedPlan(false), 3000)
  }

  const isCritical = pkg.riskTier === 'critical'
  const isHigh = pkg.riskTier === 'high'
  const isMedium = pkg.riskTier === 'medium'
  const isLow = pkg.riskTier === 'low'

  const tierBadgeBg = isCritical
    ? 'bg-critical/15 text-critical border border-critical/30'
    : isHigh
    ? 'bg-secondary/15 text-secondary border border-secondary/30'
    : isMedium
    ? 'bg-warning/15 text-warning border border-warning/30'
    : isLow
    ? 'bg-surface-dim text-on-surface-variant border border-outline-variant/30'
    : 'bg-safe/15 text-safe border border-safe/30'

  const rb = pkg.riskBreakdown

  return (
    <aside className="w-full bg-surface-container-low rounded-xl shadow-xl flex flex-col overflow-hidden animate-slide-in border border-outline-variant/30">
      {/* ── 1. Package Identity Header ── */}
      <div className="p-5 bg-surface-container border-b border-outline-variant/30">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 min-w-0">
            {/* Package + Version */}
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-on-surface-variant shrink-0" />
              <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight truncate">
                {pkg.name}
              </h2>
              <span className={`font-code-sm text-sm font-medium ${isCritical ? 'text-critical' : isHigh ? 'text-secondary' : isMedium ? 'text-warning' : 'text-safe'}`}>
                @{pkg.version}
              </span>
            </div>

            {/* 3. Severity + 4. Risk Score */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md font-code-sm text-[11px] uppercase font-bold tracking-wider ${tierBadgeBg}`}>
                {pkg.riskTier.toUpperCase()} · {pkg.riskScore}/100
              </span>
              {pkg.advisorySeverity && pkg.advisorySeverity !== 'NONE' && (
                <span className="px-1.5 py-0.5 rounded bg-surface-dim font-code-sm text-[11px] text-secondary border border-outline-variant/40">
                  CVSS {pkg.advisorySeverity}
                </span>
              )}
              {pkg.project && (
                <span className="px-1.5 py-0.5 rounded bg-surface-dim font-code-sm text-[11px] text-primary border border-primary/30 capitalize">
                  {pkg.project}
                </span>
              )}
              <span className="font-code-sm text-[11px] text-outline">{pkg.ecosystem || 'npm'}</span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer bg-transparent border-none shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[740px]">

        {/* 5. Why This Is Risky */}
        <div className={`flex flex-col gap-2 bg-surface-container p-4 rounded-lg border-l-2 ${isCritical ? 'border-critical' : isMedium ? 'border-warning' : 'border-safe'}`}>
          <span className={`font-code-sm text-[11px] uppercase font-bold tracking-wider ${isCritical ? 'text-critical' : isMedium ? 'text-warning' : 'text-safe'}`}>
            Why This Is Risky
          </span>
          <p className="font-body-md text-sm text-on-surface leading-relaxed">
            {pkg.remediation?.why_risky ||
              (pkg.vulnerabilities.length > 0
                ? `Known vulnerability in installed version ${pkg.version}: ${topVuln?.summary || topVuln?.id}`
                : pkg.typosquatFlag
                ? `Typosquatting risk: package name is suspiciously close to "${pkg.typosquatFlag.similarTo}" (${pkg.typosquatFlag.similarity}% similarity)`
                : pkg.confusionFlag
                ? `Dependency confusion warning: ${pkg.confusionFlag.reason}`
                : 'Dependency has passed supply-chain hygiene requirements with nominal risk.')}
          </p>
        </div>

        {/* Dependency Confusion Alert */}
        {pkg.confusionFlag && (
          <div className="flex flex-col gap-1 p-3 bg-critical/10 border border-critical/30 rounded-lg">
            <div className="flex items-center gap-1.5 font-headline-sm text-xs font-bold text-critical">
              <AlertTriangle className="w-4 h-4" />
              <span>Potential Dependency Confusion Vector</span>
            </div>
            <p className="font-body-md text-xs text-on-surface leading-normal">{pkg.confusionFlag.reason}</p>
          </div>
        )}

        {/* Behavioral Threat Signal Alert */}
        {(pkg.behavioralFlag || (pkg.behavioralFlags && pkg.behavioralFlags.length > 0)) && (
          <div className={`flex flex-col gap-2.5 p-4 rounded-lg border ${
            pkg.behavioralFlag?.confidence === 'high'
              ? 'bg-critical/10 border-critical/40'
              : 'bg-warning/10 border-warning/40'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${pkg.behavioralFlag?.confidence === 'high' ? 'text-critical' : 'text-warning'}`} />
                <span className={`font-headline-sm text-xs font-bold uppercase tracking-wider ${
                  pkg.behavioralFlag?.confidence === 'high' ? 'text-critical' : 'text-warning'
                }`}>
                  Behavioral Threat Signal
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-code-sm font-bold uppercase tracking-wider ${
                pkg.behavioralFlag?.confidence === 'high'
                  ? 'bg-critical text-white'
                  : 'bg-warning text-black'
              }`}>
                {pkg.behavioralFlag?.confidence} Confidence
              </span>
            </div>

            <div className="flex flex-col gap-1.5 font-code-sm text-xs">
              <div className="flex items-center gap-2">
                <span className="text-outline">Lifecycle Stage:</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container font-semibold text-on-surface">
                  {pkg.behavioralFlag?.scriptStage}
                </span>
              </div>
              <div>
                <span className="text-outline">Matched Signals:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-on-surface">
                  {pkg.behavioralFlag?.matchedSignals.map((sig, idx) => (
                    <li key={idx} className="font-medium">{sig}</li>
                  ))}
                </ul>
              </div>
            </div>

            {pkg.behavioralFlag?.excerpt && (
              <div className="flex flex-col gap-1 mt-1">
                <span className="font-code-sm text-[10px] uppercase tracking-wider text-outline">Script Excerpt (Static String Analysis)</span>
                <div className="p-2.5 bg-surface-container-lowest rounded border border-outline-variant/30 overflow-x-auto">
                  <code className="font-code-sm text-xs text-on-surface break-all select-all">
                    {pkg.behavioralFlag.excerpt}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Evidence */}
        <div>
          <SectionHeader icon={<CheckCircle className="w-4 h-4 text-primary" />} title="Evidence" />
          <div className="bg-surface-container p-4 rounded-lg flex flex-col gap-2 font-code-sm text-xs">
            <div className="grid grid-cols-[100px_1fr] gap-2 pb-2 border-b border-outline-variant/20">
              <span className="text-outline">Source</span>
              <span className="text-on-surface font-medium">OSV.dev + NVD Feeds</span>
            </div>
            {topVuln && (
              <>
                <div className="grid grid-cols-[100px_1fr] gap-2 pb-2 border-b border-outline-variant/20">
                  <span className="text-outline">Advisory ID</span>
                  <span className="text-on-surface font-medium">{topVuln.id}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 pb-2 border-b border-outline-variant/20">
                  <span className="text-outline">Affected</span>
                  <span className="text-critical font-medium">&lt;= {pkg.version}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 pb-2 border-b border-outline-variant/20">
                  <span className="text-outline">Fixed</span>
                  <span className="text-primary font-medium">{targetVer}</span>
                </div>
              </>
            )}
            {pkg.reputation && (
              <div className="grid grid-cols-[100px_1fr] gap-2 pb-2 border-b border-outline-variant/20">
                <span className="text-outline">Downloads</span>
                <span className="text-on-surface-variant">
                  {pkg.reputation.weeklyDownloads ? `${(pkg.reputation.weeklyDownloads / 1000000).toFixed(1)}M / week` : 'Normal volume'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <span className="text-outline">Registry</span>
              <a
                className="text-primary hover:underline flex items-center gap-1 no-underline"
                href={`https://www.npmjs.com/package/${pkg.name}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>npmjs.com/{pkg.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* 7. Dependency Path */}
        <div>
          <SectionHeader icon={<GitFork className="w-4 h-4 text-tertiary" />} title="Dependency Path" />
          <div className="flex items-center gap-1.5 font-code-sm text-xs bg-surface-container px-4 py-3 rounded-lg text-on-surface-variant flex-wrap">
            {pkg.path.length > 0 ? (
              pkg.path.map((node, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-outline">→</span>}
                  <span className={`font-medium ${i === pkg.path.length - 1 ? (isCritical ? 'text-critical font-semibold' : 'text-primary font-semibold') : 'text-on-surface'}`}>
                    {node}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-on-surface font-medium">{pkg.name} (Direct Dependency)</span>
            )}
          </div>
        </div>

        {/* 8. Downstream Impact */}
        {(pkg.dependentCount !== undefined && pkg.dependentCount > 0) && (
          <div>
            <SectionHeader icon={<Network className="w-4 h-4 text-primary" />} title="Downstream Impact" />
            <div className="bg-surface-container px-4 py-3 rounded-lg font-code-sm text-xs flex items-center gap-2">
              <span className="text-outline">Dependents in graph:</span>
              <span className="text-on-surface font-bold text-sm">{pkg.dependentCount}</span>
              <span className="text-on-surface-variant">package(s) affected</span>
            </div>
          </div>
        )}

        {/* 9. Risk Breakdown */}
        <div>
          <SectionHeader icon={<BarChart3 className="w-4 h-4 text-tertiary" />} title="Risk Breakdown" />
          <div className="flex items-center justify-between mb-2">
            <p className="font-code-sm text-[11px] text-outline">Contextual score from CVEs, CVSS, depth, and fan-out</p>
            <span className={`font-headline-sm text-base font-bold ${isCritical ? 'text-critical' : isMedium ? 'text-warning' : 'text-safe'}`}>
              {pkg.riskScore}<span className="text-outline font-normal text-xs"> / 100</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 bg-surface-container p-4 rounded-lg">
            {(rb ? rb.knownVulnerability > 0 : pkg.vulnerabilities.length > 0) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Known vulnerability (OSV.dev)</span>
                  <span className="text-critical font-semibold">+{rb?.knownVulnerability ?? 40}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-critical h-full w-full"></div>
                </div>
              </div>
            )}
            {(rb ? rb.severityContribution > 0 : pkg.vulnerabilities.length > 0) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">CVSS severity scaling</span>
                  <span className="text-critical font-semibold">+{rb?.severityContribution ?? Math.round(((topVuln?.cvss || 7) / 10) * 20)}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-critical h-full" style={{ width: `${Math.min(100, ((topVuln?.cvss || 7) / 10) * 100)}%` }}></div>
                </div>
              </div>
            )}
            {(rb?.outdatedVersion ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Outdated release (&gt;2 years)</span>
                  <span className="text-warning font-semibold">+{rb!.outdatedVersion}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-warning h-full w-1/3"></div>
                </div>
              </div>
            )}
            {(rb ? rb.transitiveExposure > 0 : !pkg.isDirect) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Transitive exposure</span>
                  <span className="text-warning font-semibold">+{rb?.transitiveExposure ?? 8}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-warning h-full w-1/4"></div>
                </div>
              </div>
            )}
            {(rb ? rb.downstreamImpact > 0 : (pkg.dependentCount ?? 0) >= 3) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Downstream fan-out (≥3 deps)</span>
                  <span className="text-warning font-semibold">+{rb?.downstreamImpact ?? 8}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-warning h-full w-1/4"></div>
                </div>
              </div>
            )}
            {(rb?.typosquatConfusion ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Typosquatting or confusion</span>
                  <span className="text-critical font-semibold">+{rb!.typosquatConfusion}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-critical h-full w-1/2"></div>
                </div>
              </div>
            )}
            {(rb?.behavioralSignal ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-xs mb-1">
                  <span className="text-on-surface">Behavioral Threat Signal ({pkg.behavioralFlag?.confidence || 'detected'})</span>
                  <span className="text-critical font-semibold">+{rb?.behavioralSignal ?? 0}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-critical h-full" style={{ width: `${Math.min(100, ((rb?.behavioralSignal ?? 0) / 25) * 100)}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 10. AI Explanation */}
        <div className="bg-surface-container p-4 rounded-lg border-l-4 border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-code-sm text-[11px] text-primary uppercase font-bold tracking-wider">AI Analysis</span>
            </div>
            <span className="font-code-sm text-[11px] text-outline">Gemini 2.0 Flash</span>
          </div>
          <p className="font-body-md text-sm text-on-surface leading-relaxed">
            {pkg.remediation?.why_risky ||
              `${pkg.name}@${pkg.version} is referenced in the dependency tree. Review security advisories and maintainer notices before applying updates to production.`}
          </p>
        </div>

        {/* 11. Recommended Remediation */}
        <div>
          <SectionHeader icon={<Wrench className="w-4 h-4 text-primary" />} title="Recommended Remediation" />
          <div className="bg-surface-container p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-code-sm text-[10px] uppercase text-outline tracking-wider">Action</span>
              <span className={`font-code-sm text-xs font-medium ${isCritical ? 'text-critical' : 'text-safe'}`}>
                {isCritical ? 'Priority: Immediate' : 'Priority: Scheduled'}
              </span>
            </div>
            <p className="font-body-md text-sm text-on-surface font-medium">
              {pkg.remediation?.fix || `Upgrade ${pkg.name} from ${pkg.version} to ${targetVer}`}
            </p>
            <div className="bg-surface-dim rounded-lg p-3 flex items-center justify-between font-code-sm text-xs">
              <span className="text-on-surface font-mono break-all pr-2 select-all">
                {fixCommand}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-primary hover:text-on-surface font-code-sm text-xs px-2 py-1 rounded-md hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none shrink-0"
                title="Copy to clipboard"
              >
                {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            {!pkg.isDirect && (
              <p className="font-body-md text-[11px] text-outline">
                Transitive note: If <code className="text-primary font-code-sm">npm update {pkg.name} --depth 999</code> does not bump this package, pin it via an <code className="text-primary font-code-sm">"overrides"</code> field in your <code className="text-primary font-code-sm">package.json</code>.
              </p>
            )}

            <button
              onClick={handleCopyPlan}
              className="w-full py-2.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer border-none"
            >
              {copiedPlan ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPlan ? 'Plan Copied ✓' : 'Copy Remediation Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel Footer ── */}
      <div className="p-4 bg-surface-container-highest flex items-center justify-between font-code-sm text-xs border-t border-outline-variant/30 text-outline">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>{isCritical ? 'Risk Level: High' : 'Risk Level: Monitored'}</span>
        </div>
        <button
          onClick={handleCopyPlan}
          className="text-on-surface hover:text-primary transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none"
        >
          <span>Copy Plan</span>
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  )
}

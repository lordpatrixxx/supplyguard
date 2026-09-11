import { useState } from 'react'
import type { PackageNode } from '../types'

interface FindingDetailPanelProps {
  pkg: PackageNode
  onClose?: () => void
}

export function FindingDetailPanel({ pkg, onClose }: FindingDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const [copiedPlan, setCopiedPlan] = useState(false)

  const topVuln = pkg.vulnerabilities[0]
  const fixedVersion = topVuln?.fixedIn || `${pkg.name}@latest`
  const fixCommand = pkg.remediation?.fix_command || `npm install ${pkg.name}@${fixedVersion} --save-exact`

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
      `Action: ${pkg.remediation?.fix || `Upgrade ${pkg.name} to ${fixedVersion}`}`,
      `Command: ${fixCommand}`,
      pkg.remediation?.why_risky ? `Analysis: ${pkg.remediation.why_risky}` : null,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(planText)
    setCopiedPlan(true)
    setTimeout(() => setCopiedPlan(false), 3000)
  }

  const isCritical = pkg.riskTier === 'critical'
  const isMedium = pkg.riskTier === 'medium'

  // Severity color tokens
  const tierBadgeBg = isCritical
    ? 'bg-error-container text-on-error-container'
    : isMedium
    ? 'bg-tertiary-container text-on-tertiary-container'
    : 'bg-primary-container/20 text-primary-container'

  const rb = pkg.riskBreakdown

  return (
    <aside className="w-full bg-surface-container-low rounded-xl shadow-xl flex flex-col overflow-hidden animate-fade-in border border-surface-variant">
      {/* ── Top Header ── */}
      <div className="p-space-lg bg-surface-container flex flex-col gap-space-xs border-b border-surface-variant relative">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase font-bold tracking-wider ${tierBadgeBg}`}>
                {isCritical ? 'CRITICAL RISK' : isMedium ? 'MEDIUM RISK' : 'LOW RISK'} ({pkg.riskScore}/100)
              </span>
              {pkg.advisorySeverity && pkg.advisorySeverity !== 'NONE' && (
                <span className="px-1.5 py-0.5 rounded bg-surface-dim font-code-sm text-[11px] text-secondary border border-surface-variant">
                  CVSS {pkg.advisorySeverity}
                </span>
              )}
              <span className="font-code-sm text-code-sm text-outline">npm package</span>
            </div>
            <h2 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight mt-1 flex items-baseline gap-space-xs">
              {pkg.name}
              <span className={`font-code-md text-code-md font-normal ${isCritical ? 'text-error' : isMedium ? 'text-tertiary' : 'text-primary-container'}`}>
                @{pkg.version}
              </span>
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors cursor-pointer bg-transparent border-none"
              title="Close Inspection"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Dependency Route Pill */}
        <div className="mt-space-xs flex items-center gap-1.5 font-code-sm text-code-sm bg-surface-dim px-space-sm py-1.5 rounded text-on-surface-variant flex-wrap">
          <span className="material-symbols-outlined text-[15px] text-tertiary">fork_right</span>
          <span className="text-outline">Dependency Path:</span>
          {pkg.path.length > 0 ? (
            pkg.path.map((node, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-outline">→</span>}
                <span className={`font-medium ${i === pkg.path.length - 1 ? (isCritical ? 'text-error font-semibold' : 'text-primary font-semibold') : 'text-on-surface'}`}>
                  {node}
                </span>
              </span>
            ))
          ) : (
            <span className="text-on-surface font-medium">{pkg.name} (Direct)</span>
          )}
        </div>

        {/* Downstream Fan-out Reachability Badge */}
        {(pkg.dependentCount !== undefined && pkg.dependentCount > 0) && (
          <div className="mt-1 flex items-center gap-1 font-code-sm text-[12px] text-outline">
            <span className="material-symbols-outlined text-[14px] text-primary-container">account_tree</span>
            <span>Downstream Dependents in Graph: </span>
            <span className="text-on-surface font-semibold">{pkg.dependentCount} package(s)</span>
          </div>
        )}
      </div>

      {/* ── Scrollable Body Sections ── */}
      <div className="p-space-lg flex flex-col gap-space-lg overflow-y-auto max-h-[740px]">
        {/* Why this is risky */}
        <div className={`flex flex-col gap-space-xs bg-surface-container p-space-md rounded-lg border-l-2 ${isCritical ? 'border-error' : isMedium ? 'border-tertiary' : 'border-primary-container'}`}>
          <span className={`font-label-caps text-label-caps uppercase font-bold ${isCritical ? 'text-error' : isMedium ? 'text-tertiary' : 'text-primary-container'}`}>
            Why this is risky
          </span>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
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

        {/* Dependency Confusion Alert if present */}
        {pkg.confusionFlag && (
          <div className="flex flex-col gap-1 p-space-sm bg-error-container/20 border border-error/40 rounded-lg text-error">
            <div className="flex items-center gap-1 font-headline-sm text-[13px] font-bold">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Potential Dependency Confusion Vector</span>
            </div>
            <p className="font-body-sm text-[12px] text-on-surface leading-normal">
              {pkg.confusionFlag.reason}
            </p>
          </div>
        )}

        {/* Itemized Risk Score Breakdown */}
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-tertiary text-[18px]">analytics</span>
              <span>Risk score breakdown</span>
            </h3>
            <span className={`font-headline-sm text-headline-sm font-bold ${isCritical ? 'text-error' : isMedium ? 'text-tertiary' : 'text-primary-container'}`}>
              {pkg.riskScore} <span className="font-code-sm text-code-sm text-outline font-normal">/ 100</span>
            </span>
          </div>

          <p className="font-code-sm text-[11px] text-outline italic">
            SupplyGuard contextual score based on known CVEs, CVSS severity, transitive depth, and topological fan-out.
          </p>

          <div className="flex flex-col gap-2 bg-surface-container p-space-md rounded-lg">
            {/* Known Vuln Match */}
            {(rb ? rb.knownVulnerability > 0 : pkg.vulnerabilities.length > 0) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Known vulnerability match (OSV.dev)</span>
                  <span className="text-error font-semibold">+{rb?.knownVulnerability ?? 40}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-error h-full w-full"></div>
                </div>
              </div>
            )}

            {/* CVSS Scaled Severity */}
            {(rb ? rb.severityContribution > 0 : pkg.vulnerabilities.length > 0) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Severity scaling (CVSS {topVuln?.cvss ? topVuln.cvss.toFixed(1) : '7.0+'})</span>
                  <span className="text-error font-semibold">
                    +{rb?.severityContribution ?? Math.round(((topVuln?.cvss || 7) / 10) * 20)}
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-error h-full" style={{ width: `${Math.min(100, ((topVuln?.cvss || 7) / 10) * 100)}%` }}></div>
                </div>
              </div>
            )}

            {/* Outdated Stale Dependency */}
            {(rb ? rb.outdatedVersion > 0 : false) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Outdated release (&gt;2 years stale)</span>
                  <span className="text-tertiary font-semibold">+{rb.outdatedVersion}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-tertiary-container h-full w-1/3"></div>
                </div>
              </div>
            )}

            {/* Transitive Exposure */}
            {(rb ? rb.transitiveExposure > 0 : !pkg.isDirect) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Transitive exposure</span>
                  <span className="text-tertiary font-semibold">+{rb?.transitiveExposure ?? 8}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-tertiary-container h-full w-1/4"></div>
                </div>
              </div>
            )}

            {/* Downstream Fan-out Reachability */}
            {(rb ? rb.downstreamImpact > 0 : (pkg.dependentCount ?? 0) >= 3) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Downstream fan-out impact (&ge;3 dependents)</span>
                  <span className="text-tertiary font-semibold">+{rb?.downstreamImpact ?? 8}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-tertiary-container h-full w-1/4"></div>
                </div>
              </div>
            )}

            {/* Typosquat / Confusion Similarity */}
            {(rb ? rb.typosquatConfusion > 0 : (!!pkg.typosquatFlag || !!pkg.confusionFlag)) && (
              <div>
                <div className="flex items-center justify-between font-code-sm text-code-sm mb-1">
                  <span className="text-on-surface">Typosquat / Confusion anomaly</span>
                  <span className="text-error font-semibold">+{rb?.typosquatConfusion ?? 15}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                  <div className="bg-error h-full w-3/4"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence Ledger */}
        <div className="flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-[18px]">verified</span>
            <span>Evidence Ledger</span>
          </h3>
          <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-space-sm font-code-sm text-code-sm">
            <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
              <span className="text-outline">Source</span>
              <span className="col-span-2 text-on-surface font-medium">OSV.dev + NVD Feeds</span>
            </div>
            {topVuln && (
              <>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Advisory ID</span>
                  <span className="col-span-2 text-on-surface font-medium">{topVuln.id}</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Affected</span>
                  <span className="col-span-2 text-error font-medium">&lt;= {pkg.version}</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Fixed Release</span>
                  <span className="col-span-2 text-primary-container font-medium">{fixedVersion}</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
              <span className="text-outline">Dependency path</span>
              <span className="col-span-2 text-on-surface">{pkg.path.join(' → ') || pkg.name}</span>
            </div>
            {pkg.provenance && (
              <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                <span className="text-outline">Provenance</span>
                <span className="col-span-2 text-on-surface">
                  {pkg.provenance.lockfileIntegrity === 'Present' ? 'Lockfile SHA Integrity Verified' : 'Standard Registry Tarball'}
                  <span className="block text-[11px] text-outline mt-0.5">Attestation: {pkg.provenance.buildAttestation}</span>
                </span>
              </div>
            )}
            {pkg.reputation && (
              <>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Last published</span>
                  <span className="col-span-2 text-on-surface-variant">{pkg.reputation.lastPublished || 'Recently updated'}</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Maintainers</span>
                  <span className="col-span-2 text-on-surface-variant">{pkg.reputation.maintainerCount} maintainer(s)</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs pb-space-xs border-b border-surface-variant">
                  <span className="text-outline">Downloads</span>
                  <span className="col-span-2 text-on-surface-variant">
                    {pkg.reputation.weeklyDownloads ? `${(pkg.reputation.weeklyDownloads / 1000000).toFixed(1)}M / week` : 'Normal volume'}
                  </span>
                </div>
              </>
            )}
            <div className="grid grid-cols-3 gap-space-xs">
              <span className="text-outline">Registry Link</span>
              <div className="col-span-2">
                <a
                  className="text-primary hover:underline flex items-center gap-1 no-underline"
                  href={`https://www.npmjs.com/package/${pkg.name}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>npmjs.com/package/{pkg.name}</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* AI Security Summary */}
        <div className="bg-surface-container p-space-md rounded-lg border-l-4 border-primary-container relative">
          <div className="flex items-center justify-between mb-space-xs">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-[18px]">psychology</span>
              <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">AI Remediation Analysis</span>
            </div>
            <span className="font-code-sm text-code-sm text-outline">Gemini 2.0 Flash</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
            {pkg.remediation?.why_risky ||
              `${pkg.name}@${pkg.version} is referenced in the dependency tree. Review security advisories and maintainer notices before applying updates to production.`}
          </p>
        </div>

        {/* Recommended Remediation */}
        <div className="flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">build_circle</span>
            <span>Recommended Remediation</span>
          </h3>
          <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase text-outline">Action</span>
              <span className={`font-code-sm text-code-sm font-medium ${isCritical ? 'text-error' : 'text-primary-container'}`}>
                {isCritical ? 'Priority: Immediate' : 'Priority: Scheduled'}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface font-medium">
              {pkg.remediation?.fix || `Upgrade ${pkg.name} from ${pkg.version} to ${fixedVersion}`}
            </p>
            <div className="bg-surface-dim rounded p-space-sm flex items-center justify-between font-code-sm text-code-sm relative">
              <span className="text-on-surface selection:bg-primary-container select-all font-mono break-all pr-2">
                {fixCommand}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-primary-container hover:text-primary font-code-sm text-code-sm px-2 py-1 rounded hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none shrink-0"
                title="Copy to clipboard"
              >
                <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'content_copy'}</span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={handleCopyPlan}
              className="mt-1 w-full py-2 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-headline-sm rounded font-semibold flex items-center justify-center gap-space-xs transition-colors shadow-sm cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[18px]">{copiedPlan ? 'done_all' : 'assignment'}</span>
              <span>{copiedPlan ? 'Remediation Plan Copied' : 'Copy Step-by-Step Remediation Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel Footer ── */}
      <div className="p-space-md bg-surface-container-highest flex items-center justify-between font-code-sm text-code-sm border-t border-surface-variant text-outline">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          <span>{isCritical ? 'Policy Alert: High Risk Node' : 'Policy Status: Pass / Monitored'}</span>
        </div>
        <button
          onClick={handleCopyPlan}
          className="text-on-surface hover:text-primary transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none"
        >
          <span>Copy Plan</span>
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        </button>
      </div>
    </aside>
  )
}

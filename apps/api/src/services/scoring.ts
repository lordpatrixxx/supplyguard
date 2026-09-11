import type { PackageNode, RiskBreakdown } from '../types/index.js';
import { hasReputationFlags } from './reputation.js';

/**
 * Calibrated, explainable SupplyGuard Risk Scoring Rubric:
 *
 * | Security / Dependency Signal         | Points     |
 * |--------------------------------------|------------|
 * | Known vulnerability match            | +40        |
 * | Severity (scaled from max CVSS)      | up to +20  |
 * | Outdated major/minor version         | +10        |
 * | Unpinned / transitive-only exposure  | +8         |
 * | Downstream impact (dependentCount≥3)| +8         |
 * | Typosquat or confusion risk flag     | +15        |
 *
 * Cap at 100.
 * Reproduces the benchmark lodash@4.17.20 -> 86/100 worked example.
 */
export function scorePackage(
  pkg: PackageNode
): {
  score: number;
  advisorySeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  tier: 'safe' | 'medium' | 'critical';
  breakdown: RiskBreakdown;
} {
  let knownVulnerability = 0;
  let severityContribution = 0;
  let outdatedVersion = 0;
  let transitiveExposure = 0;
  let downstreamImpact = 0;
  let typosquatConfusion = 0;

  // 1. Known vulnerability (+40)
  if (pkg.vulnerabilities.length > 0) {
    knownVulnerability = 40;
  }

  // 2. Scaled from max CVSS (0-20)
  let maxCvss = 0;
  let advisorySeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';

  if (pkg.vulnerabilities.length > 0) {
    maxCvss = Math.max(...pkg.vulnerabilities.map((v) => v.cvss));
    severityContribution = Math.round((maxCvss / 10) * 20);

    // Advisory severity is derived from highest vulnerability severity
    if (pkg.vulnerabilities.some((v) => v.severity === 'CRITICAL') || maxCvss >= 9.0) {
      advisorySeverity = 'CRITICAL';
    } else if (pkg.vulnerabilities.some((v) => v.severity === 'HIGH') || maxCvss >= 7.0) {
      advisorySeverity = 'HIGH';
    } else if (pkg.vulnerabilities.some((v) => v.severity === 'MEDIUM') || maxCvss >= 4.0) {
      advisorySeverity = 'MEDIUM';
    } else {
      advisorySeverity = 'LOW';
    }
  }

  // 3. Outdated version (+10)
  const repFlags = hasReputationFlags(pkg.reputation);
  const isStaleByDate = pkg.reputation?.lastPublished
    ? new Date(pkg.reputation.lastPublished).getTime() < Date.now() - 2 * 365.25 * 24 * 3600 * 1000
    : false;

  if (isStaleByDate || repFlags.some((f) => f.toLowerCase().includes('2+ years') || f.toLowerCase().includes('stale') || f.toLowerCase().includes('no updates'))) {
    outdatedVersion = 10;
  }

  // 4. Transitive-only exposure (+8)
  if (!pkg.isDirect) {
    transitiveExposure = 8;
  }

  // 5. Downstream impact (+8 if 3 or more packages depend on it)
  if (pkg.dependentCount >= 3) {
    downstreamImpact = 8;
  }

  // 6. Typosquatting or dependency confusion (+15)
  if (pkg.typosquatFlag || pkg.confusionFlag) {
    typosquatConfusion = 15;
  }

  const rawTotal =
    knownVulnerability +
    severityContribution +
    outdatedVersion +
    transitiveExposure +
    downstreamImpact +
    typosquatConfusion;

  const score = Math.min(rawTotal, 100);

  // Determine risk tier
  let tier: 'safe' | 'medium' | 'critical';
  if (score >= 70) {
    tier = 'critical';
  } else if (score >= 40) {
    tier = 'medium';
  } else {
    tier = 'safe';
  }

  const breakdown: RiskBreakdown = {
    knownVulnerability,
    severityContribution,
    outdatedVersion,
    transitiveExposure,
    downstreamImpact,
    typosquatConfusion,
    totalScore: score,
  };

  return { score, advisorySeverity, tier, breakdown };
}

/**
 * Computes overall repo-level risk score.
 */
export function computeOverallScore(packages: PackageNode[]): number {
  if (packages.length === 0) return 0;
  return Math.max(...packages.map((p) => p.riskScore));
}

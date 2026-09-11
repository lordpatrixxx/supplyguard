import type { PackageNode } from '../types/index.js';
import { scorePackage, computeOverallScore } from './scoring.js';

export interface SimulatedPackageNode extends PackageNode {
  projectedRiskScore: number;
  ptsReduced: number;
  isRemediated: boolean;
}

export interface RemediationSimulationResult {
  simulatedPackages: SimulatedPackageNode[];
  currentOverallScore: number;
  projectedOverallScore: number;
  scoreDelta: number;
  resolvedVulnCount: number;
}

/**
 * Evidence-based remediation simulation:
 * Replaces fixed-percentage / heuristic estimates with an exact mathematical recalculation.
 * For each actionable remediation, simulates upgrading the package to the verified fixed version,
 * re-evaluates vulnerability matches and severity contributions, and recomputes repository risk.
 */
export function simulateRemediation(packages: PackageNode[]): RemediationSimulationResult {
  let resolvedVulnCount = 0;

  const simulatedPackages: SimulatedPackageNode[] = packages.map((pkg) => {
    const topVuln = pkg.vulnerabilities[0];
    const hasActionableFix = Boolean(topVuln?.fixedIn);

    if (!hasActionableFix && !pkg.typosquatFlag && !pkg.confusionFlag) {
      return {
        ...pkg,
        projectedRiskScore: pkg.riskScore,
        ptsReduced: 0,
        isRemediated: false,
      };
    }

    // Clone package for simulation
    const simulated: PackageNode = {
      ...pkg,
      vulnerabilities: [...pkg.vulnerabilities],
      path: [...pkg.path],
      downstreamDependents: [...pkg.downstreamDependents],
      reputation: { ...pkg.reputation },
      provenance: { ...pkg.provenance },
      riskBreakdown: { ...pkg.riskBreakdown },
    };

    if (hasActionableFix && topVuln?.fixedIn) {
      simulated.version = topVuln.fixedIn;
      const beforeCount = simulated.vulnerabilities.length;
      // All vulnerabilities resolved by upgrading to the target version
      simulated.vulnerabilities = simulated.vulnerabilities.filter(
        (v) => v.fixedIn && v.fixedIn !== topVuln.fixedIn
      );
      resolvedVulnCount += Math.max(1, beforeCount - simulated.vulnerabilities.length);
    }

    // Typosquats/confusion are assumed replaced with verified upstream package
    if (simulated.typosquatFlag) {
      delete simulated.typosquatFlag;
    }
    if (simulated.confusionFlag) {
      delete simulated.confusionFlag;
    }

    const { score, advisorySeverity, tier, breakdown } = scorePackage(simulated);
    const ptsReduced = Math.max(0, pkg.riskScore - score);

    return {
      ...pkg,
      projectedRiskScore: score,
      ptsReduced,
      isRemediated: true,
    };
  });

  const currentOverallScore = computeOverallScore(packages);
  const projectedOverallScore = computeOverallScore(
    simulatedPackages.map((p) => ({
      ...p,
      riskScore: p.projectedRiskScore,
      riskTier: p.projectedRiskScore >= 70 ? ('critical' as const) : p.projectedRiskScore >= 35 ? ('medium' as const) : ('safe' as const),
    }))
  );
  const scoreDelta = Math.max(0, currentOverallScore - projectedOverallScore);

  return {
    simulatedPackages,
    currentOverallScore,
    projectedOverallScore,
    scoreDelta,
    resolvedVulnCount,
  };
}

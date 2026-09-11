import type { ScanResult } from '../types/index.js';
import { fetchManifests } from './github.js';
import { parseLockfile } from './dependencyTree.js';
import { queryVulnerabilities } from './osv.js';
import { detectTyposquats } from './typosquat.js';
import { checkDependencyConfusion } from './dependencyConfusion.js';
import { getReputationSignals } from './reputation.js';
import { scorePackage, computeOverallScore } from './scoring.js';
import { generateRemediation } from './ai.js';
import { persistScanToSupabase } from './supabasePersistence.js';

/**
 * Runs the full SupplyGuard scan pipeline asynchronously.
 * Updates the scan record in-place at each stage.
 */
export async function processScan(
  scan: ScanResult,
  store: Map<string, ScanResult>
): Promise<void> {
  const update = () => {
    store.set(scan.scanId, { ...scan });
    // Also update Supabase status asynchronously if available
    persistScanToSupabase(scan).catch(() => {});
  };

  try {
    // Stage 1: Fetch manifests from GitHub
    scan.status = 'running';
    scan.statusMessage = scan.subpath
      ? `Fetching manifests from GitHub (${scan.subpath})...`
      : 'Fetching manifests from GitHub...';
    update();

    const manifests = await fetchManifests(scan.repoUrl, scan.branch, scan.subpath);
    scan.owner = manifests.owner;
    scan.repo = manifests.repo;
    scan.branch = manifests.branch;

    if (!manifests.lockfile) {
      scan.status = 'failed';
      scan.statusMessage = manifests.packageJson
        ? 'package-lock.json not found in repository. An npm v7+ lockfile is required for dependency resolution.'
        : `No package.json found at target path (${scan.subpath || 'root'}). Verify repository path and branch.`;
      update();
      return;
    }

    // Stage 2: Parse dependency tree into unique nodes and edges
    scan.statusMessage = 'Parsing dependency tree and calculating graph topology...';
    update();

    const { packages, edges } = parseLockfile(manifests.lockfile, manifests.packageJson);
    scan.packages = packages;
    scan.edges = edges;

    // Stage 3: Vulnerability lookup via OSV.dev batch API
    scan.statusMessage = `Querying OSV.dev for vulnerabilities across ${packages.length} packages...`;
    update();

    const vulnMap = await queryVulnerabilities(
      packages.map((p) => ({ name: p.name, version: p.version }))
    );

    for (const pkg of packages) {
      const key = `${pkg.name}@${pkg.version}`;
      pkg.vulnerabilities = vulnMap.get(key) || [];
    }

    // Stage 4: Typosquatting and Dependency Confusion detection
    scan.statusMessage = 'Running typosquatting and dependency confusion analysis...';
    update();

    const allPkgNames = Array.from(new Set(packages.map((p) => p.name)));
    const typosquatResults = detectTyposquats(allPkgNames);

    for (const pkg of packages) {
      if (typosquatResults.has(pkg.name)) {
        pkg.typosquatFlag = typosquatResults.get(pkg.name);
      }
      const confusion = checkDependencyConfusion(pkg.name, scan.owner);
      if (confusion) {
        pkg.confusionFlag = confusion;
      }
    }

    // Stage 5: Package reputation signals
    scan.statusMessage = 'Auditing package reputation and release recency...';
    update();

    const flaggedOrDirect = packages.filter(
      (p) => p.isDirect || p.vulnerabilities.length > 0 || p.typosquatFlag || p.confusionFlag
    );
    const uniqueRepNames = Array.from(new Set(flaggedOrDirect.map((p) => p.name)));

    const repBatchSize = 10;
    for (let i = 0; i < uniqueRepNames.length; i += repBatchSize) {
      const chunk = uniqueRepNames.slice(i, i + repBatchSize);
      await Promise.all(chunk.map((name) => getReputationSignals(name)));
    }

    for (const pkg of flaggedOrDirect) {
      const { data: repData, repoUrl } = await getReputationSignals(pkg.name);
      pkg.reputation = repData;
      if (repoUrl && pkg.provenance.sourceRepo === 'Missing') {
        pkg.provenance.sourceRepo = 'Available';
        pkg.provenance.sourceRepoUrl = repoUrl;
      }
    }

    // Stage 6: Explainable Risk Scoring
    scan.statusMessage = 'Calculating explainable SupplyGuard risk scores...';
    update();

    for (const pkg of packages) {
      const { score, advisorySeverity, tier, breakdown } = scorePackage(pkg);
      pkg.riskScore = score;
      pkg.advisorySeverity = advisorySeverity;
      pkg.riskTier = tier;
      pkg.riskBreakdown = breakdown;
    }

    // Stage 7: AI Remediation for prioritized packages (score >= 40)
    const flaggedPackages = packages.filter((p) => p.riskScore >= 40);
    if (flaggedPackages.length > 0) {
      scan.statusMessage = `Synthesizing developer remediation for ${flaggedPackages.length} prioritized packages...`;
      update();

      const batchSize = 5;
      for (let i = 0; i < flaggedPackages.length; i += batchSize) {
        const batch = flaggedPackages.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (pkg) => {
            try {
              pkg.remediation = await generateRemediation(pkg);
            } catch {
              // Non-fatal fallback inside generateRemediation
            }
          })
        );
      }
    }

    // Completion
    scan.overallRiskScore = computeOverallScore(packages);
    scan.status = 'complete';
    scan.statusMessage = 'Scan completed successfully.';
    scan.completedAt = new Date().toISOString();
    update();
  } catch (err) {
    scan.status = 'failed';
    scan.statusMessage = err instanceof Error ? err.message : 'Unknown error during scan execution';
    update();
    throw err;
  }
}

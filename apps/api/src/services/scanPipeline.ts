import type { ScanResult } from '../types/index.js';
import { fetchManifests } from './github.js';
import { parseLockfile, parsePackageJsonDirect } from './dependencyTree.js';
import { queryVulnerabilities } from './osv.js';
import { detectTyposquats } from './typosquat.js';
import { checkDependencyConfusion } from './dependencyConfusion.js';
import { getReputationSignals } from './reputation.js';
import { scorePackage, computeOverallScore } from './scoring.js';
import { generateRemediation } from './ai.js';
import { persistScanToSupabase, persistScanProgress } from './supabasePersistence.js';
import { simulateRemediation } from './simulation.js';
import { analyzeBehavioralThreats } from './behavioralAnalysis.js';

/**
 * Runs the full SupplyGuard scan pipeline asynchronously.
 * Updates the in-memory scan record in-place at each stage,
 * sends lightweight status patches to Supabase, and persists
 * the complete raw result only upon completion or failure.
 */
export async function processScan(
  scan: ScanResult,
  store: Map<string, ScanResult>
): Promise<void> {
  const updateProgress = (message: string) => {
    scan.statusMessage = message;
    store.set(scan.scanId, { ...scan });
    // Lightweight patch only to status and status_message (no heavy raw_result)
    persistScanProgress(scan.scanId, scan.userId, scan.status, message).catch(() => {});
  };

  try {
    // Stage 1: Fetch manifests from GitHub
    scan.status = 'running';
    updateProgress(
      scan.subpath
        ? `Fetching manifests from GitHub (${scan.subpath})...`
        : 'Fetching manifests from GitHub...'
    );

    const manifests = await fetchManifests(scan.repoUrl, scan.branch, scan.subpath);
    scan.owner = manifests.owner;
    scan.repo = manifests.repo;
    scan.branch = manifests.branch;

    if (!manifests.lockfile) {
      if (manifests.packageJson) {
        // Fallback: package.json direct dependency auditing when lockfile is absent upstream
        scan.limitations = [
          'transitive_analysis_incomplete: Audited direct dependencies from package.json (transitive lockfile not committed upstream)'
        ];
        updateProgress('package-lock.json absent; resolving direct dependencies from package.json...');
        const { packages, edges } = parsePackageJsonDirect(manifests.packageJson);
        scan.packages = packages;
        scan.edges = edges;
      } else {
        scan.status = 'failed';
        scan.statusMessage = `No package.json or package-lock.json found at target path (${scan.subpath || 'root'}). Verify repository path and branch.`;
        store.set(scan.scanId, { ...scan });
        await persistScanToSupabase(scan).catch(() => {});
        return;
      }
    } else {
      // Stage 2: Parse dependency tree into unique nodes and edges
      updateProgress('Parsing dependency tree and calculating graph topology...');
      const { packages, edges } = parseLockfile(manifests.lockfile, manifests.packageJson);
      scan.packages = packages;
      scan.edges = edges;
    }

    const packages = scan.packages;

    // Stage 3: Vulnerability lookup via OSV.dev batch API
    updateProgress(`Querying OSV.dev for vulnerabilities across ${packages.length} packages...`);

    const vulnMap = await queryVulnerabilities(
      packages.map((p) => ({ name: p.name, version: p.version }))
    );

    for (const pkg of packages) {
      const key = `${pkg.name}@${pkg.version}`;
      pkg.vulnerabilities = vulnMap.get(key) || [];
    }

    // Stage 4: Typosquatting and Dependency Confusion detection
    updateProgress('Running typosquatting and dependency confusion analysis...');

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

    // Stage 4.5: Behavioral Threat Signals (static install script analysis)
    updateProgress('Analyzing install scripts for behavioral risk signals...');
    const { metrics: behavioralMetrics } = await analyzeBehavioralThreats(packages);
    scan.behavioralMetrics = behavioralMetrics;

    // Stage 5: Package reputation signals
    updateProgress('Auditing package reputation and release recency...');

    const flaggedOrDirect = packages.filter(
      (p) => p.isDirect || p.vulnerabilities.length > 0 || p.typosquatFlag || p.confusionFlag || p.behavioralFlag
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
    updateProgress('Calculating explainable SupplyGuard risk scores...');

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
      updateProgress(`Synthesizing developer remediation for ${flaggedPackages.length} prioritized packages...`);

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

    // Stage 8: Evidence-based Remediation Simulation
    const simulation = simulateRemediation(packages);
    scan.projectedOverallRiskScore = simulation.projectedOverallScore;
    for (const simPkg of simulation.simulatedPackages) {
      const target = packages.find((p) => p.id === simPkg.id);
      if (target) {
        target.projectedRiskScore = simPkg.projectedRiskScore;
        target.ptsReduced = simPkg.ptsReduced;
      }
    }

    // Completion
    scan.overallRiskScore = computeOverallScore(packages);
    scan.status = 'complete';
    scan.statusMessage = scan.limitations && scan.limitations.length > 0
      ? 'Scan completed with limitations (direct dependencies audited).'
      : 'Scan completed successfully.';
    scan.completedAt = new Date().toISOString();

    store.set(scan.scanId, { ...scan });
    // Await single final write of full result to Supabase
    await persistScanToSupabase(scan);
  } catch (err) {
    scan.status = 'failed';
    scan.statusMessage = err instanceof Error ? err.message : 'Unknown error during scan execution';
    store.set(scan.scanId, { ...scan });
    await persistScanToSupabase(scan).catch(() => {});
    throw err;
  }
}

import type { ScanResult } from '../types/index.js';
import { fetchManifests } from './github.js';
import { aggregateProjectManifests } from './dependencyTree.js';
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
    // Stage 1: Fetch manifests from GitHub recursively
    scan.status = 'running';
    updateProgress(
      scan.subpath
        ? `Recursively scanning manifests from GitHub (${scan.subpath})...`
        : 'Recursively scanning manifests across all repository directories...'
    );

    const manifests = await fetchManifests(scan.repoUrl, scan.branch, scan.subpath);
    scan.owner = manifests.owner;
    scan.repo = manifests.repo;
    scan.branch = manifests.branch;
    scan.detectedFiles = manifests.detectedFiles;
    scan.treeCompleteness = manifests.treeCompleteness;

    updateProgress(
      `Discovered ${manifests.detectedFiles.length} dependency manifest(s). Resolving dependency trees...`
    );

    // Stage 2: Aggregate all project manifests, apply lockfile precedence, and separate occurrences
    const { packages, edges, projectSummaries, parsingErrors } = aggregateProjectManifests(manifests.manifests);
    scan.packages = packages;
    scan.edges = edges;
    scan.projectSummaries = projectSummaries;

    if (parsingErrors.length > 0) {
      scan.parsingErrors = parsingErrors;
    }

    if (packages.length === 0) {
      scan.status = 'complete';
      if (parsingErrors.length > 0) {
        scan.statusMessage = `Failed to parse manifests:\n${parsingErrors.map((e) => `• ${e.file}: ${e.error}`).join('\n')}`;
      } else {
        scan.statusMessage = `No dependencies declared across discovered manifests (${manifests.detectedFiles.join(', ')}).`;
      }
      scan.limitations = [
        `no_dependencies_found: No dependencies found in discovered manifests: ${manifests.detectedFiles.join(', ')}.`
      ];
      store.set(scan.scanId, { ...scan });
      await persistScanToSupabase(scan).catch(() => {});
      return;
    }

    // Set semantic limitations for unpinned/unlocked manifests or truncated tree
    const limitations: string[] = [];
    if (manifests.treeCompleteness === 'truncated') {
      limitations.push('Repository tree was truncated by GitHub (>100k files); conventions scanned.');
    }
    for (const pSummary of projectSummaries) {
      if (pSummary.resolutionStatus === 'declared_direct_only') {
        limitations.push(
          `${pSummary.projectName}: Audited direct dependencies from ${pSummary.manifestFiles.join(', ')} (lockfile not committed upstream; transitive dependencies not modeled).`
        );
      }
    }
    if (limitations.length > 0) {
      scan.limitations = limitations;
    }

    // Stage 3: Vulnerability lookup via OSV.dev batch API across all ecosystems
    updateProgress(`Querying OSV.dev for vulnerabilities across ${packages.length} packages...`);

    // Filter out wildcards and unpinned ranges that OSV batch queries cannot match
    const osvCandidates = packages
      .filter((p) => p.version && !p.version.includes('*') && !p.version.startsWith('>') && !p.version.startsWith('<'))
      .map((p) => ({ name: p.name, version: p.version, ecosystem: p.ecosystem }));

    const vulnMap = await queryVulnerabilities(osvCandidates);

    for (const pkg of packages) {
      const ecoKey = `${pkg.ecosystem || 'npm'}:${pkg.name}@${pkg.version}`;
      const nameKey = `${pkg.name}@${pkg.version}`;
      const rawVulns = vulnMap.get(ecoKey) || vulnMap.get(nameKey) || [];
      pkg.vulnerabilities = rawVulns.map((v) => ({
        ...v,
        dependencyPath: pkg.path,
        isDirect: pkg.isDirect,
        ecosystem: pkg.ecosystem || 'npm',
      }));
    }

    // Stage 4: Typosquatting and Dependency Confusion detection (npm)
    updateProgress('Running typosquatting and dependency confusion analysis...');

    const npmPackages = packages.filter((p) => (p.ecosystem || 'npm') === 'npm');
    const allNpmPkgNames = Array.from(new Set(npmPackages.map((p) => p.name)));
    const typosquatResults = detectTyposquats(allNpmPkgNames);

    for (const pkg of packages) {
      if ((pkg.ecosystem || 'npm') === 'npm') {
        if (typosquatResults.has(pkg.name)) {
          pkg.typosquatFlag = typosquatResults.get(pkg.name);
        }
        const confusion = checkDependencyConfusion(pkg.name, scan.owner);
        if (confusion) {
          pkg.confusionFlag = confusion;
        }
      }
    }

    // Stage 4.5: Behavioral Threat Signals (static install script analysis on npm packages)
    updateProgress('Analyzing install scripts for behavioral risk signals...');
    const { metrics: behavioralMetrics } = await analyzeBehavioralThreats(npmPackages);
    scan.behavioralMetrics = behavioralMetrics;

    // Stage 5: Package reputation signals
    updateProgress('Auditing package reputation and release recency...');

    const flaggedOrDirectNpm = npmPackages.filter(
      (p) => p.isDirect || p.vulnerabilities.length > 0 || p.typosquatFlag || p.confusionFlag || p.behavioralFlag
    );
    const uniqueRepNames = Array.from(new Set(flaggedOrDirectNpm.map((p) => p.name)));

    const repBatchSize = 10;
    for (let i = 0; i < uniqueRepNames.length; i += repBatchSize) {
      const chunk = uniqueRepNames.slice(i, i + repBatchSize);
      await Promise.all(chunk.map((name) => getReputationSignals(name)));
    }

    for (const pkg of flaggedOrDirectNpm) {
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

    if (packages.length === 0) {
      if (!scan.limitations) scan.limitations = [];
      scan.limitations.push('no_dependencies_found: No dependencies were declared in the audited manifests.');
      scan.statusMessage = 'No dependencies detected in manifest files.';
    } else if (scan.limitations && scan.limitations.length > 0) {
      scan.statusMessage = 'Scan completed with scope limitations (direct dependencies audited).';
    } else {
      scan.statusMessage = 'Scan completed successfully.';
    }
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

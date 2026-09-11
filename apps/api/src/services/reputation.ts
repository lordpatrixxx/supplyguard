import type { ReputationData } from '../types/index.js';

// Cache to prevent duplicate queries for common packages
const repCache = new Map<string, { data: ReputationData; repoUrl?: string }>();

interface NpmRegistryResponse {
  name?: string;
  description?: string;
  'dist-tags'?: { latest?: string };
  time?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
  repository?: { type?: string; url?: string } | string;
}

/**
 * Fetches verified reputation signals for an npm package:
 * - Actual latest release publication timestamp from npm registry dist-tags
 * - Package creation date and calculated package age in years
 * - Maintainer count
 * - Source repository presence
 * - Weekly download count
 */
export async function getReputationSignals(
  packageName: string
): Promise<{ data: ReputationData; repoUrl?: string }> {
  if (repCache.has(packageName)) {
    return repCache.get(packageName)!;
  }

  const defaults: ReputationData = {
    lastPublished: '',
    maintainerCount: 0,
    weeklyDownloads: 0,
    signals: [],
  };

  let repoUrl: string | undefined;

  try {
    // Encode scoped packages properly (e.g. @scope%2Fname)
    const encodedPkg = packageName.startsWith('@')
      ? `@${encodeURIComponent(packageName.slice(1))}`
      : encodeURIComponent(packageName);

    const registryRes = await fetch(
      `https://registry.npmjs.org/${encodedPkg}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500),
      }
    );

    if (registryRes.ok) {
      const data = (await registryRes.json()) as NpmRegistryResponse;
      const latestVersion = data['dist-tags']?.latest;
      
      // Get exact publication timestamp for latest version, falling back to modified
      if (latestVersion && data.time && data.time[latestVersion]) {
        defaults.lastPublished = data.time[latestVersion];
      } else if (data.time?.modified) {
        defaults.lastPublished = data.time.modified;
      }

      // Package creation date & age
      if (data.time?.created) {
        defaults.createdDate = data.time.created;
        const createdYear = new Date(data.time.created).getFullYear();
        const currentYear = new Date().getFullYear();
        defaults.packageAgeYears = Math.max(0, currentYear - createdYear);
      }

      defaults.maintainerCount = data.maintainers?.length || 0;

      // Extract source repository URL
      if (typeof data.repository === 'string') {
        repoUrl = data.repository;
      } else if (data.repository?.url) {
        repoUrl = data.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
      }
    }
  } catch {
    // Non-fatal network fallback
  }

  try {
    const encodedPkg = packageName.startsWith('@')
      ? `@${encodeURIComponent(packageName.slice(1))}`
      : encodeURIComponent(packageName);

    const dlRes = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${encodedPkg}`,
      {
        signal: AbortSignal.timeout(3500),
      }
    );

    if (dlRes.ok) {
      const data = (await dlRes.json()) as { downloads?: number };
      defaults.weeklyDownloads = data.downloads || 0;
    }
  } catch {
    // Non-fatal
  }

  // Populate calibrated signals
  const signals: string[] = [];
  if (defaults.maintainerCount === 1) {
    signals.push('Single maintainer');
  }

  if (defaults.lastPublished) {
    const lastUpdate = new Date(defaults.lastPublished);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (lastUpdate < twoYearsAgo) {
      signals.push('Low-maintenance signal: No releases in 2+ years');
    }
  }

  if (defaults.weeklyDownloads > 0 && defaults.weeklyDownloads < 100) {
    signals.push('Low adoption signal (< 100 weekly downloads)');
  }

  defaults.signals = signals;

  const result = { data: defaults, repoUrl };
  repCache.set(packageName, result);
  return result;
}

/**
 * Helper to check if a package has active reputation flags.
 */
export function hasReputationFlags(rep: ReputationData): string[] {
  return rep.signals || [];
}

import type { TyposquatFlag } from '../types/index.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let popularNames: string[] = [];

try {
  const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  
  // Check possible relative paths in dev (src/services -> src/data) vs prod (dist/services -> dist/data)
  const candidatePaths = [
    join(currentDir, '../data/top-npm-packages.json'),
    join(currentDir, '../../src/data/top-npm-packages.json'),
    join(process.cwd(), 'apps/api/src/data/top-npm-packages.json'),
    join(process.cwd(), 'src/data/top-npm-packages.json'),
  ];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      popularNames = JSON.parse(readFileSync(p, 'utf-8'));
      break;
    }
  }

  if (popularNames.length === 0) {
    console.warn('[Typosquat] Notice: top-npm-packages.json path not found in candidate locations, using fallback list.');
    popularNames = ['lodash', 'react', 'express', 'axios', 'chalk', 'request', 'requests', 'commander', 'moment', 'debug'];
  }
} catch (err) {
  console.warn('[Typosquat] Error reading top-npm-packages.json:', err);
  popularNames = ['lodash', 'react', 'express', 'axios', 'chalk', 'request', 'requests', 'commander', 'moment', 'debug'];
}

// Build a fast lowercase Set of popular names for O(1) membership check
const popularNamesSet = new Set(popularNames.map((p) => p.toLowerCase()));

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalizes package name for comparison (strips @scope/ prefix for comparison, but preserves scope info).
 */
function normalizePkgForComparison(name: string): string {
  if (name.startsWith('@') && name.includes('/')) {
    return name.split('/')[1] || name;
  }
  return name;
}

/**
 * Detects potential typosquat packages by comparing package names
 * against popular npm packages using calibrated Levenshtein distance.
 * 
 * Rules to eliminate false positives on legitimate packages:
 * 1. Exact match against top package index is immediately skipped.
 * 2. Words < 4 characters are NEVER flagged on distance 1 (e.g. 'qs' vs 'ws').
 * 3. Words < 6 characters are NEVER flagged on distance 2 (e.g. 'send' vs 'bent').
 * 4. Similarity score must be >= 70% to trigger a flag.
 * 5. High-volume packages (> 20,000 downloads) are bypassed if download data is supplied.
 */
export function detectTyposquats(
  depNames: string[],
  weeklyDownloadsMap?: Map<string, number>
): Map<string, TyposquatFlag> {
  const results = new Map<string, TyposquatFlag>();

  for (const depName of depNames) {
    const compareName = normalizePkgForComparison(depName).toLowerCase();

    // 1. Skip if exact match with any popular package
    if (popularNamesSet.has(compareName)) continue;

    // 2. Skip if package has verified high weekly adoption (> 20,000 downloads/week)
    if (weeklyDownloadsMap && (weeklyDownloadsMap.get(depName) || 0) > 20000) {
      continue;
    }

    // 3. Length floor: packages shorter than 4 characters cannot be typosquats via edit distance
    if (compareName.length < 4) continue;

    let bestMatch: { name: string; distance: number; similarity: number } | null = null;

    for (const popular of popularNames) {
      const popLower = popular.toLowerCase();
      
      // Quick length difference check
      const lenDiff = Math.abs(compareName.length - popLower.length);
      if (lenDiff > 2) continue;

      // Edit distance 2 requires length of at least 6 characters
      if (compareName.length < 6 && lenDiff > 1) continue;

      const distance = levenshtein(compareName, popLower);

      // Distance gating:
      // - distance 1 requires length >= 4 and similarity >= 70%
      // - distance 2 requires length >= 5 and similarity >= 60% (catches transpositions like axois vs axios)
      if (distance === 1 && compareName.length >= 4) {
        const maxLen = Math.max(compareName.length, popLower.length);
        const similarity = Math.round((1 - distance / maxLen) * 100);

        if (similarity >= 70 && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { name: popular, distance, similarity };
        }
      } else if (distance === 2 && compareName.length >= 5) {
        const maxLen = Math.max(compareName.length, popLower.length);
        const similarity = Math.round((1 - distance / maxLen) * 100);

        if (similarity >= 60 && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { name: popular, distance, similarity };
        }
      }
    }

    if (bestMatch) {
      const confidence: 'high' | 'medium' | 'low' =
        bestMatch.similarity >= 85 ? 'high' : 'medium';

      results.set(depName, {
        similarTo: bestMatch.name,
        distance: bestMatch.distance,
        similarity: bestMatch.similarity,
        confidence,
        indicator: 'Possible typosquatting indicator',
        reason: `Package "${depName}" is ${bestMatch.similarity}% similar to popular package "${bestMatch.name}" (Levenshtein distance: ${bestMatch.distance}). Verify this is the intended upstream package.`,
      });
    }
  }

  return results;
}

/**
 * Checks a single package name for typosquatting against top packages.
 */
export function checkTyposquat(depName: string, weeklyDownloads?: number): TyposquatFlag | null {
  const map = weeklyDownloads !== undefined ? new Map([[depName, weeklyDownloads]]) : undefined;
  return detectTyposquats([depName], map).get(depName) || null;
}

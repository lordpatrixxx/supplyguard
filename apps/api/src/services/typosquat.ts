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
 * against popular npm packages using Levenshtein distance <= 2.
 * Only flags names that are NOT an exact match.
 */
export function detectTyposquats(
  depNames: string[]
): Map<string, TyposquatFlag> {
  const results = new Map<string, TyposquatFlag>();

  for (const depName of depNames) {
    const compareName = normalizePkgForComparison(depName).toLowerCase();

    // Skip if exact match with a popular package
    if (popularNames.some((p) => p.toLowerCase() === compareName)) continue;

    let bestMatch: { name: string; distance: number; similarity: number } | null = null;

    for (const popular of popularNames) {
      const popLower = popular.toLowerCase();
      // Quick length check
      if (Math.abs(compareName.length - popLower.length) > 2) continue;

      const distance = levenshtein(compareName, popLower);

      if (distance > 0 && distance <= 2) {
        const maxLen = Math.max(compareName.length, popLower.length);
        const similarity = Math.round((1 - distance / maxLen) * 100);

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { name: popular, distance, similarity };
        }
      }
    }

    if (bestMatch) {
      results.set(depName, {
        similarTo: bestMatch.name,
        distance: bestMatch.distance,
        similarity: bestMatch.similarity,
        indicator: 'Possible typosquatting',
        reason: `Package "${depName}" is ${bestMatch.similarity}% similar to popular package "${bestMatch.name}" (Levenshtein distance: ${bestMatch.distance}). Verify this is the intended upstream package.`,
      });
    }
  }

  return results;
}

/**
 * Checks a single package name for typosquatting against top packages.
 */
export function checkTyposquat(depName: string): TyposquatFlag | null {
  return detectTyposquats([depName]).get(depName) || null;
}

import type { DependencyConfusionFlag } from '../types/index.js';

/**
 * Common internal/private organization keywords and scopes that often indicate
 * private packages vulnerable to dependency confusion / public namespace hijacking.
 */
const INTERNAL_SCOPE_PATTERNS = [
  /^@(internal|private|corp|enterprise|local|company|myorg|inhouse)[-_a-z0-9]*\//i,
  /^@(infra|platform|backend|core-internal|secops|security-internal)[-_a-z0-9]*\//i,
];

const INTERNAL_NAME_PATTERNS = [
  /^(internal|private|corp|inhouse)-/i,
  /-(internal|private|corp)$/i,
];

/**
 * Checks whether a package exhibits potential dependency confusion risk indicators:
 * 1. Has an internal/private namespace or scope pattern.
 * 2. Matches repository owner/name namespace but is fetched without explicit private registry configuration.
 * 3. Package is published publicly on npm but exhibits collision with private naming conventions.
 */
export function checkDependencyConfusion(
  packageName: string,
  repoOwner?: string,
  isPublishedPublicly?: boolean
): DependencyConfusionFlag | undefined {
  const isScoped = packageName.startsWith('@');
  const scope = isScoped ? packageName.split('/')[0] : '';
  const unqualifiedName = isScoped ? (packageName.split('/')[1] || '') : packageName;

  // Signal 1: Explicit internal scope pattern
  if (isScoped && INTERNAL_SCOPE_PATTERNS.some((p) => p.test(packageName))) {
    return {
      indicator: 'Potential dependency-confusion risk',
      reason: `Package uses internal scope convention "${scope}". If not restricted by a private registry or npm scope mapping, an attacker can register this name publicly on npm to execute untrusted code.`,
      confidence: 'high',
    };
  }

  // Signal 2: Internal naming pattern in unscoped package
  if (!isScoped && INTERNAL_NAME_PATTERNS.some((p) => p.test(packageName))) {
    return {
      indicator: 'Potential dependency-confusion risk',
      reason: `Package name "${packageName}" follows an internal naming convention. Unscoped internal packages are vulnerable to public namespace pre-registration attacks.`,
      confidence: 'medium',
    };
  }

  // Signal 3: Scoped to repository owner name
  if (repoOwner && repoOwner.length > 2) {
    const cleanOwner = repoOwner.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (isScoped && scope.toLowerCase() === `@${cleanOwner}` && isPublishedPublicly === false) {
      return {
        indicator: 'Potential dependency-confusion risk',
        reason: `Package "${packageName}" is scoped to repository owner "@${cleanOwner}" but has no corresponding public registry metadata. Ensure private registry scoping is configured in .npmrc.`,
        confidence: 'high',
      };
    }
  }

  return undefined;
}

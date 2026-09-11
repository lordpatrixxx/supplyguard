import type { PackageNode, BehavioralFlag, BehavioralMetrics } from '../types/index.js';

export const MAX_SCRIPT_INPUT_BYTES = 50 * 1024; // 50 KB max input guard for static analysis

export interface ScriptAnalysisResult {
  isSuspicious: boolean;
  flag?: BehavioralFlag;
  indicators: string[];
  matchedSignals: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  excerpt: string;
  explanation: string;
  isAllowListed?: boolean;
}

export interface PackageLifecycleScripts {
  preinstall?: string;
  install?: string;
  postinstall?: string;
}

// Scan-level in-memory cache to avoid duplicate HTTP calls for identical name@version
const registryScriptsCache = new Map<string, PackageLifecycleScripts>();

/**
 * Strict allow-list patterns for recognized legitimate build tooling.
 * Only matches whole commands or standard build pipelines; never suppresses if strong
 * external commands (e.g. pipe-to-shell or outbound exfiltration) are appended.
 */
const LEGITIMATE_TOOL_PATTERNS: RegExp[] = [
  /^\s*(?:npx\s+)?husky(?:\s+install)?\s*$/i,
  /^\s*(?:npx\s+)?patch-package\s*$/i,
  /^\s*node-gyp\s+rebuild\s*$/i,
  /^\s*prebuild-install(?:\s+-[a-zA-Z0-9_-]+)*\s*$/i,
  /^\s*(?:npx\s+)?electron-builder\s+install-app-deps\s*$/i,
  /^\s*opencollective-postinstall\s*$/i,
  /^\s*(?:npx\s+)?electron-rebuild(?:\s+-[a-zA-Z0-9_-]+)*\s*$/i,
  /^\s*node\s+install(?:\.m?js)?\s*$/i,
  /^\s*(?:node\s+install(?:\.m?js)?\s*(?:&&|;)\s*)?(?:npx\s+)?esbuild(?:\s+.*)?$/i,
];

/**
 * Checks if a script matches a known legitimate tooling pattern.
 */
export function isLegitimateTooling(scriptText: string): boolean {
  if (!scriptText || typeof scriptText !== 'string') return false;
  const trimmed = scriptText.trim();
  return LEGITIMATE_TOOL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Safely generates a truncated, normalized plain-text excerpt of up to 120 characters.
 * Truncates around the primary suspicious signal if present, otherwise takes head.
 */
export function generateSafeExcerpt(scriptText: string, focusKeyword?: string): string {
  if (!scriptText) return '';
  const sanitized = scriptText.replace(/[\r\n\t]+/g, ' ').trim();
  if (sanitized.length <= 120) return sanitized;

  if (focusKeyword) {
    const idx = sanitized.toLowerCase().indexOf(focusKeyword.toLowerCase());
    if (idx !== -1) {
      const start = Math.max(0, idx - 30);
      const end = Math.min(sanitized.length, start + 117);
      const prefix = start > 0 ? '...' : '';
      const suffix = end < sanitized.length ? '...' : '';
      return `${prefix}${sanitized.slice(start, end).trim()}${suffix}`;
    }
  }

  return `${sanitized.slice(0, 117).trim()}...`;
}

/**
 * Statically analyzes a single package lifecycle script (e.g. preinstall, install, postinstall)
 * using string/regex heuristics.
 *
 * CRITICAL SAFETY REQUIREMENT:
 * This function NEVER executes, evals, runs subprocesses, or imports the script content.
 */
export function analyzeScriptContent(
  stage: 'preinstall' | 'install' | 'postinstall',
  scriptText: string
): ScriptAnalysisResult {
  if (!scriptText || typeof scriptText !== 'string' || !scriptText.trim()) {
    return {
      isSuspicious: false,
      confidence: 'none',
      indicators: [],
      matchedSignals: [],
      excerpt: '',
      explanation: 'No script content provided.',
    };
  }

  // Enforce strict 50 KB input limit
  if (Buffer.byteLength(scriptText, 'utf8') > MAX_SCRIPT_INPUT_BYTES) {
    return {
      isSuspicious: false,
      confidence: 'none',
      indicators: [],
      matchedSignals: ['Input exceeds maximum length (50 KB)'],
      excerpt: scriptText.slice(0, 100) + '...',
      explanation: 'Input exceeded maximum static analysis limit (50 KB) and was skipped.',
    };
  }

  // 1. Static Regex Signal Definitions
  const pipeToShellRegex = /\|\s*(?:bash|sh|node|python[23]?)\b/i;
  const strongNetworkRegex = /\b(?:curl|wget|fetch\s*\(|https?\.(?:get|request)\s*\(|http\.(?:get|request)\s*\(|XMLHttpRequest\b)/i;
  const weakUrlRegex = /https?:\/\/[^\s'"]+/i;
  const obfuscationEvalRegex = /\b(?:eval\s*\(|new\s+Function\s*\()/i;
  const obfuscationBase64Regex = /['"][A-Za-z0-9+/]{20,}={0,2}['"]|Buffer\.from\([^)]*base64/i;
  const sensitivePathRegex = /(?:\.ssh|\.aws|\.npmrc)/i;
  const processEnvRegex = /\bprocess\.env\b/i;

  // 2. Evaluate Signals Statically
  const hasPipeToShell = pipeToShellRegex.test(scriptText);
  const hasStrongNetwork = strongNetworkRegex.test(scriptText);
  const hasWeakUrl = weakUrlRegex.test(scriptText);
  const hasEval = obfuscationEvalRegex.test(scriptText);
  const hasBase64 = obfuscationBase64Regex.test(scriptText);
  const hasObfuscation = hasEval || hasBase64;
  const hasSensitivePath = sensitivePathRegex.test(scriptText);
  const hasProcessEnv = processEnvRegex.test(scriptText);

  // 3. Check for recognized legitimate tooling allow-list
  // CRITICAL: An allow-listed pattern only suppresses if NO strong threats (pipe-to-shell or network downloads) exist
  const isAllowListed = isLegitimateTooling(scriptText);
  if (isAllowListed && !hasPipeToShell && !hasStrongNetwork && !hasObfuscation && !hasSensitivePath) {
    return {
      isSuspicious: false,
      isAllowListed: true,
      confidence: 'none',
      indicators: [],
      matchedSignals: ['Recognized Legitimate Tooling'],
      excerpt: generateSafeExcerpt(scriptText),
      explanation: 'Script matches recognized legitimate build tooling without suspicious commands.',
    };
  }

  const indicators: string[] = [];
  const matchedSignals: string[] = [];
  let primaryFocus: string | undefined;

  if (hasPipeToShell) {
    indicators.push('pipe-to-shell');
    matchedSignals.push('Pipe-to-shell behavior');
    primaryFocus = 'bash';
  }
  if (hasStrongNetwork) {
    indicators.push('network-activity');
    matchedSignals.push(`Network call in ${stage}`);
    primaryFocus = primaryFocus || 'curl';
  }
  if (hasObfuscation) {
    indicators.push('obfuscated-execution');
    matchedSignals.push('Obfuscated payload or eval execution');
    primaryFocus = primaryFocus || 'eval';
  }
  if (hasSensitivePath) {
    indicators.push('sensitive-path');
    matchedSignals.push('Sensitive credential or configuration file access');
    primaryFocus = primaryFocus || '.npmrc';
  }
  if (hasProcessEnv && (hasStrongNetwork || hasSensitivePath)) {
    indicators.push('env-access');
    matchedSignals.push('Environment variable access with outbound network or file correlation');
  }

  // 4. Resolve Confidence Level
  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

  if (
    hasPipeToShell ||
    (hasEval && hasBase64) ||
    (hasSensitivePath && (hasStrongNetwork || hasPipeToShell)) ||
    (hasStrongNetwork && hasObfuscation)
  ) {
    confidence = 'high';
  } else if (hasStrongNetwork || hasObfuscation || hasSensitivePath) {
    confidence = 'medium';
  } else if (hasWeakUrl && hasProcessEnv) {
    confidence = 'low';
  }

  // Isolated weak strings (e.g. process.env alone or a documentation URL alone) are suppressed
  if (confidence === 'none' || confidence === 'low') {
    return {
      isSuspicious: false,
      confidence: 'none',
      indicators: [],
      matchedSignals: [],
      excerpt: generateSafeExcerpt(scriptText),
      explanation: 'Script contains no high or medium behavioral threat patterns.',
    };
  }

  const excerpt = generateSafeExcerpt(scriptText, primaryFocus);

  const flag: BehavioralFlag = {
    indicator: 'Suspicious install-script behavior',
    matchedSignals,
    indicators,
    scriptStage: stage,
    confidence,
    excerpt,
    rawScript: scriptText.slice(0, 500),
  };

  let explanation = `This dependency's ${stage} script exhibits suspicious install-time behavior (${matchedSignals.join(', ')}).`;
  if (confidence === 'high') {
    explanation += ' High-confidence signals suggest potential remote code retrieval or sensitive environment access.';
  } else {
    explanation += ' Manual inspection of the lifecycle script is recommended before execution.';
  }

  return {
    isSuspicious: true,
    isAllowListed: false,
    flag,
    indicators,
    matchedSignals,
    confidence,
    excerpt,
    explanation,
  };
}

/**
 * Analyzes all lifecycle scripts in a package manifest's scripts object.
 */
export function analyzePackageScripts(scripts?: PackageLifecycleScripts): {
  behavioralFlags: BehavioralFlag[];
  primaryFlag?: BehavioralFlag;
  hasLifecycleScripts: boolean;
  isAllowListedTooling: boolean;
} {
  if (!scripts || typeof scripts !== 'object') {
    return {
      behavioralFlags: [],
      hasLifecycleScripts: false,
      isAllowListedTooling: false,
    };
  }

  const stages: ('preinstall' | 'install' | 'postinstall')[] = ['preinstall', 'install', 'postinstall'];
  const behavioralFlags: BehavioralFlag[] = [];
  let hasScripts = false;
  let isAllowListed = false;

  for (const stage of stages) {
    const script = scripts[stage];
    if (script && typeof script === 'string' && script.trim().length > 0) {
      hasScripts = true;
      const result = analyzeScriptContent(stage, script);
      if (result.isAllowListed) {
        isAllowListed = true;
      }
      if (result.isSuspicious && result.flag) {
        behavioralFlags.push(result.flag);
      }
    }
  }

  // Pick primary flag: high confidence first, then medium
  const primaryFlag =
    behavioralFlags.find((f) => f.confidence === 'high') ||
    behavioralFlags.find((f) => f.confidence === 'medium') ||
    behavioralFlags[0];

  return {
    behavioralFlags,
    primaryFlag,
    hasLifecycleScripts: hasScripts,
    isAllowListedTooling: isAllowListed && behavioralFlags.length === 0,
  };
}

/**
 * Safely fetches package version manifest from registry.npmjs.org with caching and URL encoding.
 */
export async function fetchPackageLifecycleScripts(
  name: string,
  version: string
): Promise<PackageLifecycleScripts | null> {
  const cacheKey = `${name}@${version}`;
  if (registryScriptsCache.has(cacheKey)) {
    return registryScriptsCache.get(cacheKey)!;
  }

  try {
    // Format scoped package name properly: @scope%2Fpackage
    const encodedName = name.startsWith('@')
      ? '@' + encodeURIComponent(name.slice(1))
      : encodeURIComponent(name);

    const cleanVer = version.replace(/^[~^>=<v\s]+/, '').split(' ')[0] || version;
    const url = `https://registry.npmjs.org/${encodedName}/${encodeURIComponent(cleanVer)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      registryScriptsCache.set(cacheKey, {});
      return null;
    }

    const data = (await res.json()) as { scripts?: PackageLifecycleScripts };
    const scripts: PackageLifecycleScripts = {
      preinstall: data.scripts?.preinstall,
      install: data.scripts?.install,
      postinstall: data.scripts?.postinstall,
    };

    registryScriptsCache.set(cacheKey, scripts);
    return scripts;
  } catch {
    registryScriptsCache.set(cacheKey, {});
    return null;
  }
}

/**
 * Orchestrates behavioral threat analysis across scan dependency nodes.
 * Targets high-risk/high-impact packages with capped concurrency.
 */
export async function analyzeBehavioralThreats(
  packages: PackageNode[]
): Promise<{
  packages: PackageNode[];
  metrics: BehavioralMetrics;
}> {
  const HIGH_IMPACT_THRESHOLD = 3;

  // Select target packages (direct, vulnerable, typosquats, confusion, or high fan-out)
  const targets = packages.filter(
    (p) =>
      p.isDirect ||
      p.vulnerabilities.length > 0 ||
      p.typosquatFlag ||
      p.confusionFlag ||
      p.dependentCount >= HIGH_IMPACT_THRESHOLD
  );

  let lifecycleScriptsInspected = 0;
  let highSignals = 0;
  let mediumSignals = 0;
  let lowSignals = 0;
  let allowListedToolingCount = 0;

  // Process in batches of 10 concurrent requests
  const BATCH_SIZE = 10;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (pkg) => {
        const scripts = await fetchPackageLifecycleScripts(pkg.name, pkg.version);
        if (!scripts) return;

        const { behavioralFlags, primaryFlag, hasLifecycleScripts, isAllowListedTooling } =
          analyzePackageScripts(scripts);

        if (hasLifecycleScripts) {
          lifecycleScriptsInspected++;
        }

        if (isAllowListedTooling) {
          allowListedToolingCount++;
        }

        if (behavioralFlags.length > 0) {
          pkg.behavioralFlags = behavioralFlags;
          pkg.behavioralFlag = primaryFlag;

          for (const flag of behavioralFlags) {
            if (flag.confidence === 'high') highSignals++;
            else if (flag.confidence === 'medium') mediumSignals++;
            else if (flag.confidence === 'low') lowSignals++;
          }
        }
      })
    );
  }

  const metrics: BehavioralMetrics = {
    totalDependencies: packages.length,
    behavioralTargets: targets.length,
    lifecycleScriptsInspected,
    highConfidenceSignals: highSignals,
    mediumConfidenceSignals: mediumSignals,
    lowConfidenceSignals: lowSignals,
    allowListedTooling: allowListedToolingCount,
  };

  return { packages, metrics };
}

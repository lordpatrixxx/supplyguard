import type { Vulnerability } from '../types/index.js';

interface OsvQuery {
  package: { name: string; ecosystem: string };
  version: string;
}

interface OsvVulnDetail {
  id: string;
  summary?: string;
  details?: string;
  database_specific?: {
    severity?: string;
  };
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    package?: { name: string };
    ranges?: Array<{
      type?: string;
      events?: Array<{ introduced?: string; fixed?: string; last_affected?: string }>;
    }>;
  }>;
}

interface OsvBatchResponse {
  results: Array<{ vulns?: Array<{ id: string; modified?: string }> }>;
}

// In-memory cache for vulnerability details to avoid re-fetching
const vulnDetailCache = new Map<string, OsvVulnDetail>();

async function fetchVulnDetail(id: string): Promise<OsvVulnDetail | null> {
  if (vulnDetailCache.has(id)) {
    return vulnDetailCache.get(id)!;
  }

  try {
    const res = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`);
    if (res.ok) {
      const detail = (await res.json()) as OsvVulnDetail;
      vulnDetailCache.set(id, detail);
      return detail;
    }
  } catch (err) {
    console.error(`[OSV] Failed to fetch details for ${id}:`, err);
  }
  return null;
}

/**
 * Safely parses package key into name and version without breaking scoped packages like @scope/package@1.0.0
 */
export function parsePackageKey(key: string): { name: string; version: string } {
  const lastAt = key.lastIndexOf('@');
  if (lastAt <= 0) {
    return { name: key, version: '*' };
  }
  return {
    name: key.slice(0, lastAt),
    version: key.slice(lastAt + 1),
  };
}

/**
 * Batch-query OSV.dev for known vulnerabilities across all packages,
 * then enriches flagged vulnerabilities with summary, CVSS, severity, and fixed version.
 * Returns a Map from "name@version" to Vulnerability[].
 */
export async function queryVulnerabilities(
  packages: { name: string; version: string }[]
): Promise<Map<string, Vulnerability[]>> {
  const result = new Map<string, Vulnerability[]>();

  if (packages.length === 0) return result;

  const batchSize = 1000;
  const packageVulnIds = new Map<string, string[]>();
  const allVulnIds = new Set<string>();

  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);

    const queries: { queries: OsvQuery[] } = {
      queries: batch.map((pkg) => ({
        package: { name: pkg.name, ecosystem: 'npm' },
        version: pkg.version,
      })),
    };

    try {
      const res = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queries),
      });

      if (!res.ok) {
        console.error(`[OSV] Batch query failed: ${res.status} ${res.statusText}`);
        continue;
      }

      const data = (await res.json()) as OsvBatchResponse;

      for (let j = 0; j < batch.length; j++) {
        const pkg = batch[j];
        const key = `${pkg.name}@${pkg.version}`;
        const vulns = data.results[j]?.vulns || [];

        if (vulns.length > 0) {
          const ids = vulns.map((v) => v.id);
          packageVulnIds.set(key, ids);
          ids.forEach((id) => allVulnIds.add(id));
        }
      }
    } catch (err) {
      console.error('[OSV] Batch query error:', err);
    }
  }

  // Fetch details for all unique vuln IDs in parallel batches of 10
  const uniqueIds = Array.from(allVulnIds);
  const detailFetchBatchSize = 10;
  for (let i = 0; i < uniqueIds.length; i += detailFetchBatchSize) {
    const chunk = uniqueIds.slice(i, i + detailFetchBatchSize);
    await Promise.all(chunk.map((id) => fetchVulnDetail(id)));
  }

  // Map enriched details back to each package
  for (const [key, ids] of packageVulnIds) {
    const { name: pkgName } = parsePackageKey(key);
    const enrichedList: Vulnerability[] = [];

    for (const id of ids) {
      const detail = vulnDetailCache.get(id);
      if (detail) {
        const cvss = extractCvss(detail);
        const severity = determineSeverity(cvss, detail);
        enrichedList.push({
          id,
          source: id.startsWith('GHSA') ? 'GHSA' : 'OSV',
          summary: detail.summary || detail.details?.slice(0, 180) || 'Known security vulnerability',
          cvss,
          severity,
          fixedIn: extractFixedVersion(detail, pkgName),
        });
      } else {
        enrichedList.push({
          id,
          source: 'OSV',
          summary: 'Known security vulnerability',
          cvss: 5.0,
          severity: 'MEDIUM',
        });
      }
    }

    result.set(key, enrichedList);
  }

  return result;
}

function determineSeverity(
  cvss: number,
  detail: OsvVulnDetail
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const dbSev = detail.database_specific?.severity?.toUpperCase();
  if (dbSev === 'CRITICAL' || cvss >= 9.0) return 'CRITICAL';
  if (dbSev === 'HIGH' || cvss >= 7.0) return 'HIGH';
  if (dbSev === 'MODERATE' || cvss >= 4.0) return 'MEDIUM';
  if (dbSev === 'LOW' || cvss > 0) return 'LOW';
  return 'MEDIUM';
}

/**
 * Parses a standard CVSS v3.1 / v3.0 vector string and calculates the exact base score (0.0 - 10.0).
 * Conforms to the FIRST CVSS v3.1 specification.
 */
export function parseCvssVector(vector: string): number {
  if (!vector || typeof vector !== 'string') return 5.0;

  const parts: Record<string, string> = {};
  vector.split('/').forEach((part) => {
    const [k, v] = part.split(':');
    if (k && v) parts[k.trim().toUpperCase()] = v.trim().toUpperCase();
  });

  const avMap: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
  const acMap: Record<string, number> = { L: 0.77, H: 0.44 };
  const uiMap: Record<string, number> = { N: 0.85, R: 0.62 };
  const cMap: Record<string, number> = { N: 0.0, L: 0.22, H: 0.56 };
  const iMap: Record<string, number> = { N: 0.0, L: 0.22, H: 0.56 };
  const aMap: Record<string, number> = { N: 0.0, L: 0.22, H: 0.56 };

  const scopeChanged = parts.S === 'C';
  const prMap: Record<string, number> = scopeChanged
    ? { N: 0.85, L: 0.68, H: 0.5 }
    : { N: 0.85, L: 0.62, H: 0.27 };

  const av = avMap[parts.AV] ?? 0.85;
  const ac = acMap[parts.AC] ?? 0.77;
  const pr = prMap[parts.PR] ?? 0.85;
  const ui = uiMap[parts.UI] ?? 0.85;
  const c = cMap[parts.C] ?? 0.0;
  const i = iMap[parts.I] ?? 0.0;
  const a = aMap[parts.A] ?? 0.0;

  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  let impact = 0;
  if (scopeChanged) {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  } else {
    impact = 6.42 * iss;
  }

  const exploitability = 8.22 * av * ac * pr * ui;
  if (impact <= 0) return 0.0;

  let baseScore = 0;
  if (scopeChanged) {
    baseScore = Math.min(1.08 * (impact + exploitability), 10);
  } else {
    baseScore = Math.min(impact + exploitability, 10);
  }

  return Math.ceil(baseScore * 10) / 10;
}

export function extractCvss(vuln: OsvVulnDetail): number {
  // 1. Check severity array from OSV
  if (vuln.severity && vuln.severity.length > 0) {
    for (const sev of vuln.severity) {
      if (!sev.score) continue;
      // If already numeric
      const numericScore = parseFloat(sev.score);
      if (!isNaN(numericScore) && numericScore <= 10 && numericScore > 0) {
        return numericScore;
      }
      // If CVSS:3.1 or CVSS:3.0 vector
      if (typeof sev.score === 'string' && /^CVSS:3\.[01]\//i.test(sev.score)) {
        const calculated = parseCvssVector(sev.score);
        if (calculated > 0) return calculated;
      }
    }
  }

  // 2. Map from database_specific severity string (GHSA)
  const dbSev = vuln.database_specific?.severity?.toUpperCase();
  if (dbSev === 'CRITICAL') return 9.5;
  if (dbSev === 'HIGH') return 8.5;
  if (dbSev === 'MODERATE') return 5.5;
  if (dbSev === 'LOW') return 3.0;

  // 3. Fallback
  return 5.0;
}

function extractFixedVersion(vuln: OsvVulnDetail, pkgName?: string): string | undefined {
  if (!vuln.affected) return undefined;

  for (const aff of vuln.affected) {
    // Prefer matching package if available
    if (pkgName && aff.package?.name && aff.package.name !== pkgName) {
      continue;
    }

    if (aff.ranges) {
      for (const range of aff.ranges) {
        if (range.events) {
          for (const event of range.events) {
            if (event.fixed) return event.fixed;
          }
        }
      }
    }
  }

  // Fallback check across all affected entries
  for (const aff of vuln.affected) {
    if (aff.ranges) {
      for (const range of aff.ranges) {
        if (range.events) {
          for (const event of range.events) {
            if (event.fixed) return event.fixed;
          }
        }
      }
    }
  }

  return undefined;
}

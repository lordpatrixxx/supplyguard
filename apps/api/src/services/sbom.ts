import type { ScanResult } from '../types/index.js';

interface CycloneDXComponent {
  type: 'library' | 'application';
  name: string;
  version: string;
  purl: string;
  scope?: 'required' | 'optional';
  hashes?: Array<{ alg: string; content: string }>;
}

interface CycloneDXVulnerability {
  id: string;
  source?: { name: string };
  ratings?: Array<{
    score?: number;
    severity?: string;
    method?: string;
  }>;
  description?: string;
  affects?: Array<{ ref: string }>;
}

interface CycloneDXDocument {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: 'application';
      name: string;
      version: string;
    };
  };
  components: CycloneDXComponent[];
  dependencies: Array<{ ref: string; dependsOn: string[] }>;
  vulnerabilities: CycloneDXVulnerability[];
}

/**
 * Generates a valid CycloneDX v1.5 JSON Software Bill of Materials (SBOM)
 * from a completed SupplyGuard scan result.
 */
export function generateCycloneDxSbom(scan: ScanResult): CycloneDXDocument {
  const repoName = scan.repo || scan.repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'repository';

  const components: CycloneDXComponent[] = scan.packages.map((pkg) => {
    // Encode scoped package names properly for purl
    const encodedName = pkg.name.startsWith('@')
      ? `@${encodeURIComponent(pkg.name.slice(1))}`
      : encodeURIComponent(pkg.name);
    const purl = `pkg:npm/${encodedName}@${pkg.version}`;

    return {
      type: 'library',
      name: pkg.name,
      version: pkg.version,
      purl,
      scope: pkg.isDirect ? 'required' : 'optional',
    };
  });

  // Build dependency map for CycloneDX
  const depMap = new Map<string, Set<string>>();
  for (const edge of scan.edges) {
    if (!depMap.has(edge.from)) {
      depMap.set(edge.from, new Set());
    }
    depMap.get(edge.from)!.add(edge.to);
  }

  const dependencies = Array.from(depMap.entries()).map(([ref, targetSet]) => ({
    ref,
    dependsOn: Array.from(targetSet),
  }));

  // Map vulnerabilities
  const vulnerabilities: CycloneDXVulnerability[] = [];
  for (const pkg of scan.packages) {
    for (const vuln of pkg.vulnerabilities) {
      vulnerabilities.push({
        id: vuln.id,
        source: { name: vuln.source },
        ratings: [
          {
            score: vuln.cvss,
            severity: vuln.severity.toLowerCase(),
            method: 'CVSSv3',
          },
        ],
        description: vuln.summary,
        affects: [{ ref: pkg.id }],
      });
    }
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${scan.scanId}`,
    version: 1,
    metadata: {
      timestamp: scan.completedAt || scan.createdAt,
      tools: [
        {
          vendor: 'SupplyGuard',
          name: 'SupplyGuard Supply-Chain Defense Engine',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: repoName,
        version: scan.branch || 'HEAD',
      },
    },
    components,
    dependencies,
    vulnerabilities,
  };
}

export const generateCycloneDXSBOM = generateCycloneDxSbom;

import type { PackageNode, GraphEdge, PackageOccurrence, ProjectDependencySummary } from '../types/index.js';
import { evaluateProvenance } from './provenance.js';
import { type RawManifestFile, classifyManifestFile } from './github.js';

interface LockfilePackageEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface LockfileV7 {
  lockfileVersion?: number;
  packages?: Record<string, LockfilePackageEntry>;
  dependencies?: Record<string, LockfileV1PackageEntry>;
}

interface LockfileV1PackageEntry {
  version: string;
  integrity?: string;
  resolved?: string;
  dev?: boolean;
  requires?: Record<string, string>;
  dependencies?: Record<string, LockfileV1PackageEntry>;
}

/**
 * Extracts clean package name from a node_modules path.
 * Handles:
 * "node_modules/lodash" -> "lodash"
 * "node_modules/@scope/pkg" -> "@scope/pkg"
 * "node_modules/express/node_modules/debug" -> "debug"
 * "node_modules/express/node_modules/@scope/pkg" -> "@scope/pkg"
 */
export function extractPackageNameFromPath(pkgPath: string): string {
  const parts = pkgPath.split('node_modules/').filter(Boolean);
  const lastPart = parts[parts.length - 1];
  return lastPart ? lastPart.replace(/\/$/, '') : '';
}

/**
 * Normalizes Python package name according to PEP 503
 */
export function normalizePythonPackageName(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

/**
 * Creates unique dependency identifier: `${name}@${version}#${pkgPath}`
 */
export function createUniqueNodeId(name: string, version: string, pkgPath = ''): string {
  return `${name}@${version}#${pkgPath}`;
}

/**
 * Parses npm v7+ (lockfileVersion 2/3) package-lock.json or npm-shrinkwrap.json
 */
function parseNpmV7Packages(
  packagesMap: Record<string, LockfilePackageEntry>,
  packageJson: Record<string, unknown> | null,
  project: string,
  manifestFile: string
): { packages: PackageNode[]; edges: GraphEdge[] } {
  // Identify direct dependencies from root package.json or root package entry
  const directDepNames = new Set<string>();
  if (packageJson) {
    const deps = packageJson.dependencies as Record<string, string> | undefined;
    const devDeps = packageJson.devDependencies as Record<string, string> | undefined;
    if (deps) Object.keys(deps).forEach((d) => directDepNames.add(d));
    if (devDeps) Object.keys(devDeps).forEach((d) => directDepNames.add(d));
  }

  // Also check root entry in lockfile ("")
  const rootEntry = packagesMap[''];
  if (rootEntry) {
    const rootDeps = { ...(rootEntry.dependencies || {}), ...(rootEntry.devDependencies || {}) };
    Object.keys(rootDeps).forEach((d) => directDepNames.add(d));
  }

  const nodes: PackageNode[] = [];
  const pathToNodeMap = new Map<string, PackageNode>();
  const nameToNodesMap = new Map<string, PackageNode[]>();

  for (const [pkgPath, pkgData] of Object.entries(packagesMap)) {
    // Skip the root application node
    if (pkgPath === '') continue;

    const name = extractPackageNameFromPath(pkgPath);
    const version = pkgData.version || '0.0.0';

    if (!name) continue;

    const segments = pkgPath.split('node_modules/').filter(Boolean).map((s) => s.replace(/\/$/, ''));
    const isDirect = directDepNames.has(name) && segments.length === 1;
    const depth = segments.length;
    const id = createUniqueNodeId(name, version, pkgPath);

    const occurrence: PackageOccurrence = {
      project,
      manifestFile,
      isDirect,
      resolvedVersion: version,
      dependencyPath: segments,
      depth,
    };

    const provenance = evaluateProvenance(
      { resolved: pkgData.resolved, integrity: pkgData.integrity },
      { hasRegistryMeta: true }
    );

    const node: PackageNode = {
      id,
      name,
      version,
      ecosystem: 'npm',
      project,
      manifestFile,
      occurrences: [occurrence],
      projects: [project],
      isDirect,
      path: segments,
      depth,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: {
        lastPublished: '',
        maintainerCount: 0,
        weeklyDownloads: 0,
        signals: [],
      },
      provenance,
    };

    nodes.push(node);
    pathToNodeMap.set(pkgPath, node);

    if (!nameToNodesMap.has(name)) {
      nameToNodesMap.set(name, []);
    }
    nameToNodesMap.get(name)!.push(node);
  }

  // Build graph edges
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  if (rootEntry) {
    const rootDirects = { ...(rootEntry.dependencies || {}), ...(rootEntry.devDependencies || {}) };
    for (const depName of Object.keys(rootDirects)) {
      const directPath = `node_modules/${depName}`;
      const targetNode = pathToNodeMap.get(directPath) || nameToNodesMap.get(depName)?.[0];
      if (targetNode) {
        const edgeKey = `root→${targetNode.id}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({ from: 'root', to: targetNode.id });
        }
      }
    }
  }

  for (const [pkgPath, pkgData] of Object.entries(packagesMap)) {
    if (pkgPath === '') continue;

    const sourceNode = pathToNodeMap.get(pkgPath);
    if (!sourceNode) continue;

    const declaredDeps = {
      ...(pkgData.dependencies || {}),
    };

    for (const [depName] of Object.entries(declaredDeps)) {
      const nestedPath = `${pkgPath}/node_modules/${depName}`;
      let targetNode = pathToNodeMap.get(nestedPath);

      if (!targetNode) {
        targetNode = pathToNodeMap.get(`node_modules/${depName}`);
      }

      if (!targetNode) {
        const candidates = nameToNodesMap.get(depName) || [];
        targetNode = candidates[0];
      }

      if (targetNode && targetNode.id !== sourceNode.id) {
        const edgeKey = `${sourceNode.id}→${targetNode.id}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({ from: sourceNode.id, to: targetNode.id });
        }
      }
    }
  }

  return { packages: nodes, edges };
}

/**
 * Parses npm v5/v6 (lockfileVersion 1) package-lock.json with recursive dependencies
 */
function parseNpmV1Dependencies(
  depsMap: Record<string, LockfileV1PackageEntry>,
  packageJson: Record<string, unknown> | null,
  project: string,
  manifestFile: string
): { packages: PackageNode[]; edges: GraphEdge[] } {
  const directDepNames = new Set<string>();
  if (packageJson) {
    const deps = packageJson.dependencies as Record<string, string> | undefined;
    const devDeps = packageJson.devDependencies as Record<string, string> | undefined;
    if (deps) Object.keys(deps).forEach((d) => directDepNames.add(d));
    if (devDeps) Object.keys(devDeps).forEach((d) => directDepNames.add(d));
  }

  const nodes: PackageNode[] = [];
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  function walk(
    currentDeps: Record<string, LockfileV1PackageEntry>,
    parentPath: string[],
    parentSourceId: string | null
  ) {
    for (const [name, entry] of Object.entries(currentDeps)) {
      const version = entry.version || '0.0.0';
      const currentPath = [...parentPath, name];
      const isDirect = parentPath.length === 0 && (directDepNames.size === 0 || directDepNames.has(name));
      const depth = currentPath.length;
      const pkgPathStr = `node_modules/${currentPath.join('/node_modules/')}`;
      const id = createUniqueNodeId(name, version, pkgPathStr);

      const occurrence: PackageOccurrence = {
        project,
        manifestFile,
        isDirect,
        resolvedVersion: version,
        dependencyPath: currentPath,
        depth,
      };

      const provenance = evaluateProvenance(
        { resolved: entry.resolved, integrity: entry.integrity },
        { hasRegistryMeta: true }
      );

      const node: PackageNode = {
        id,
        name,
        version,
        ecosystem: 'npm',
        project,
        manifestFile,
        occurrences: [occurrence],
        projects: [project],
        isDirect,
        path: currentPath,
        depth,
        dependentCount: 0,
        downstreamDependents: [],
        riskScore: 0,
        advisorySeverity: 'NONE',
        riskTier: 'safe',
        riskBreakdown: {
          knownVulnerability: 0,
          severityContribution: 0,
          outdatedVersion: 0,
          transitiveExposure: 0,
          downstreamImpact: 0,
          typosquatConfusion: 0,
          behavioralSignal: 0,
          totalScore: 0,
        },
        vulnerabilities: [],
        reputation: {
          lastPublished: '',
          maintainerCount: 0,
          weeklyDownloads: 0,
          signals: [],
        },
        provenance,
      };

      nodes.push(node);

      if (parentSourceId) {
        const edgeKey = `${parentSourceId}→${id}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({ from: parentSourceId, to: id });
        }
      } else if (isDirect) {
        const edgeKey = `root→${id}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({ from: 'root', to: id });
        }
      }

      if (entry.dependencies) {
        walk(entry.dependencies, currentPath, id);
      }
    }
  }

  walk(depsMap, [], null);
  return { packages: nodes, edges };
}

/**
 * Parses npm package-lock.json or npm-shrinkwrap.json supporting v1, v2, and v3 lockfiles
 */
export function parseLockfile(
  lockfile: Record<string, unknown>,
  packageJson: Record<string, unknown> | null,
  project = 'root',
  manifestFile = 'package-lock.json'
): { packages: PackageNode[]; edges: GraphEdge[] } {
  const lockData = lockfile as LockfileV7;

  let result: { packages: PackageNode[]; edges: GraphEdge[] };

  if (lockData.packages && typeof lockData.packages === 'object') {
    result = parseNpmV7Packages(lockData.packages, packageJson, project, manifestFile);
  } else if (lockData.dependencies && typeof lockData.dependencies === 'object') {
    result = parseNpmV1Dependencies(lockData.dependencies, packageJson, project, manifestFile);
  } else {
    throw new Error(
      `Unsupported package-lock.json format in "${manifestFile}": unable to find "packages" (v2/v3) or "dependencies" (v1) field.`
    );
  }

  // Calculate downstream dependents from graph topology
  const dependentMap = new Map<string, Set<string>>();
  for (const edge of result.edges) {
    if (edge.from === 'root') continue;
    if (!dependentMap.has(edge.to)) {
      dependentMap.set(edge.to, new Set());
    }
    dependentMap.get(edge.to)!.add(edge.from);
  }

  for (const node of result.packages) {
    const dependents = dependentMap.get(node.id);
    if (dependents) {
      node.dependentCount = dependents.size;
      node.downstreamDependents = Array.from(dependents).map((id) => {
        const target = result.packages.find((n) => n.id === id);
        return target ? `${target.name}@${target.version}` : id;
      });
    }
  }

  return result;
}

/**
 * Fallback parser when package-lock.json is not committed upstream.
 * Parses direct dependencies from package.json and models them as depth-1 nodes.
 */
export function parsePackageJsonDirect(
  packageJson: Record<string, unknown>,
  project = 'root',
  manifestFile = 'package.json'
): { packages: PackageNode[]; edges: GraphEdge[] } {
  const deps = (packageJson.dependencies as Record<string, string>) || {};
  const devDeps = (packageJson.devDependencies as Record<string, string>) || {};

  const allDirect = { ...deps, ...devDeps };
  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];

  for (const [name, versionRange] of Object.entries(allDirect)) {
    const cleanVersion = String(versionRange).replace(/^[~^>=<v\s]+/, '').split(' ')[0] || '1.0.0';
    const pkgPath = `node_modules/${name}`;
    const id = createUniqueNodeId(name, cleanVersion, pkgPath);

    const occurrence: PackageOccurrence = {
      project,
      manifestFile,
      isDirect: true,
      declaredVersionRange: String(versionRange),
      resolvedVersion: cleanVersion,
      dependencyPath: [name],
      depth: 1,
    };

    packages.push({
      id,
      name,
      version: cleanVersion,
      ecosystem: 'npm',
      project,
      manifestFile,
      occurrences: [occurrence],
      projects: [project],
      isDirect: true,
      path: [name],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: {
        lastPublished: '',
        maintainerCount: 0,
        weeklyDownloads: 0,
        signals: [],
      },
      provenance: evaluateProvenance(),
    });

    edges.push({ from: 'root', to: id });
  }

  return { packages, edges };
}

/**
 * Parses Python requirements.txt or requirements-dev.txt
 * Identifies direct dependencies and transitive lines marked with `# via ...`
 */
export function parseRequirementsTxt(
  content: string,
  project = 'backend',
  manifestFile = 'requirements.txt'
): {
  packages: PackageNode[];
  edges: GraphEdge[];
  resolutionStatus: 'locked' | 'declared_direct_only';
} {
  const lines = content.split(/\r?\n/);
  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];
  let hasTransitiveMarkers = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Check for pip-compile "# via parent-package" comments
    const viaMatch = line.match(/#\s*via\s+(.+)$/i);
    const viaParents = viaMatch
      ? viaMatch[1]
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    if (viaParents.length > 0) {
      hasTransitiveMarkers = true;
    }

    // Strip comments & inline environment markers (e.g. ; python_version >= '3.8')
    const codePart = line.split('#')[0].trim();
    const withoutMarker = codePart.split(';')[0].trim();

    // Skip flags (-r, -i, --extra-index-url, etc.)
    if (withoutMarker.startsWith('-')) continue;

    // Parse package name and version specification
    // e.g. "fastapi==0.115.6", "uvicorn[standard]==0.34.0", "requests>=2.32.3", "flask"
    const match = withoutMarker.match(/^([a-zA-Z0-9_.-]+)(\[[^\]]*\])?\s*([=><~@!].*)?$/);
    if (!match) continue;

    const rawName = match[1];
    const canonicalName = normalizePythonPackageName(rawName);
    const rawSpec = match[3]?.trim() || '';

    // Extract base version from specifier (e.g. "==0.115.6" -> "0.115.6", ">=2.9.9" -> "2.9.9")
    const versionMatch = rawSpec.match(/(?:==|>=|<=|~=|=|<|>|@)\s*([0-9a-zA-Z._-]+)/);
    const version = versionMatch ? versionMatch[1] : '*';

    const isDirect = viaParents.length === 0;
    const depth = isDirect ? 1 : 2;
    const dependencyPath = isDirect ? [canonicalName] : [viaParents[0] || 'root', canonicalName];
    const id = createUniqueNodeId(canonicalName, version, `${manifestFile}:${canonicalName}`);

    const occurrence: PackageOccurrence = {
      project,
      manifestFile,
      isDirect,
      declaredVersionRange: rawSpec || undefined,
      resolvedVersion: version,
      dependencyPath,
      depth,
    };

    const node: PackageNode = {
      id,
      name: canonicalName,
      version,
      ecosystem: 'PyPI',
      project,
      manifestFile,
      occurrences: [occurrence],
      projects: [project],
      isDirect,
      path: dependencyPath,
      depth,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: {
        lastPublished: '',
        maintainerCount: 0,
        weeklyDownloads: 0,
        signals: [],
      },
      provenance: evaluateProvenance(),
    };

    packages.push(node);

    if (isDirect) {
      edges.push({ from: 'root', to: id });
    }
  }

  // Build edges from viaParents
  for (const node of packages) {
    if (!node.isDirect && node.path.length > 1) {
      const parentName = node.path[0];
      const parentNode = packages.find((p) => p.name === parentName);
      if (parentNode) {
        edges.push({ from: parentNode.id, to: node.id });
      }
    }
  }

  return {
    packages,
    edges,
    resolutionStatus: hasTransitiveMarkers ? 'locked' : 'declared_direct_only',
  };
}

/**
 * Parses Python poetry.lock file (TOML format)
 */
export function parsePoetryLock(
  lockContent: string,
  pyprojectContent: string | null,
  project = 'backend',
  manifestFile = 'poetry.lock'
): {
  packages: PackageNode[];
  edges: GraphEdge[];
  resolutionStatus: 'locked';
} {
  // Extract direct dependency names from pyproject.toml if available
  const directDepNames = new Set<string>();
  if (pyprojectContent) {
    const lines = pyprojectContent.split(/\r?\n/);
    let inDepSection = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('[tool.poetry.dependencies]') || line.startsWith('[project.dependencies]')) {
        inDepSection = true;
        continue;
      }
      if (line.startsWith('[') && inDepSection) {
        if (!line.includes('dependencies')) inDepSection = false;
      }
      if (inDepSection) {
        const depMatch = line.match(/^([a-zA-Z0-9_.-]+)\s*=/);
        if (depMatch && depMatch[1] !== 'python') {
          directDepNames.add(normalizePythonPackageName(depMatch[1]));
        }
      }
    }
  }

  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];
  const nameToNodeMap = new Map<string, PackageNode>();

  // Parse [[package]] blocks
  const blocks = lockContent.split('[[package]]').slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
    if (!nameMatch || !versionMatch) continue;

    const rawName = nameMatch[1];
    const canonicalName = normalizePythonPackageName(rawName);
    const version = versionMatch[1];

    const isDirect = directDepNames.size > 0 ? directDepNames.has(canonicalName) : false;
    const depth = isDirect ? 1 : 2;
    const id = createUniqueNodeId(canonicalName, version, `${manifestFile}:${canonicalName}`);

    const occurrence: PackageOccurrence = {
      project,
      manifestFile,
      isDirect,
      resolvedVersion: version,
      dependencyPath: [canonicalName],
      depth,
    };

    const node: PackageNode = {
      id,
      name: canonicalName,
      version,
      ecosystem: 'PyPI',
      project,
      manifestFile,
      occurrences: [occurrence],
      projects: [project],
      isDirect,
      path: [canonicalName],
      depth,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: {
        lastPublished: '',
        maintainerCount: 0,
        weeklyDownloads: 0,
        signals: [],
      },
      provenance: evaluateProvenance(),
    };

    packages.push(node);
    nameToNodeMap.set(canonicalName, node);

    if (isDirect) {
      edges.push({ from: 'root', to: id });
    }
  }

  // Parse [package.dependencies] in each block for edges
  for (const block of blocks) {
    const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
    if (!nameMatch) continue;
    const sourceName = normalizePythonPackageName(nameMatch[1]);
    const sourceNode = nameToNodeMap.get(sourceName);
    if (!sourceNode) continue;

    const depSectionMatch = block.match(/\[package\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
    if (depSectionMatch) {
      const depLines = depSectionMatch[1].split(/\r?\n/);
      for (const dLine of depLines) {
        const dMatch = dLine.match(/^([a-zA-Z0-9_.-]+)\s*=/);
        if (dMatch) {
          const targetName = normalizePythonPackageName(dMatch[1]);
          const targetNode = nameToNodeMap.get(targetName);
          if (targetNode && targetNode.id !== sourceNode.id) {
            edges.push({ from: sourceNode.id, to: targetNode.id });
          }
        }
      }
    }
  }

  return { packages, edges, resolutionStatus: 'locked' };
}

/**
 * Parses Python Pipfile.lock (JSON format)
 */
export function parsePipfileLock(
  lockContent: string,
  pipfileContent: string | null,
  project = 'backend',
  manifestFile = 'Pipfile.lock'
): {
  packages: PackageNode[];
  edges: GraphEdge[];
  resolutionStatus: 'locked';
} {
  const directDepNames = new Set<string>();
  if (pipfileContent) {
    const lines = pipfileContent.split(/\r?\n/);
    let inSection = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line === '[packages]' || line === '[dev-packages]') {
        inSection = true;
        continue;
      }
      if (line.startsWith('[') && inSection) {
        inSection = false;
      }
      if (inSection) {
        const m = line.match(/^([a-zA-Z0-9_.-]+)\s*=/);
        if (m) directDepNames.add(normalizePythonPackageName(m[1]));
      }
    }
  }

  const parsed = JSON.parse(lockContent) as {
    default?: Record<string, { version?: string }>;
    develop?: Record<string, { version?: string }>;
  };

  const combined = { ...(parsed.default || {}), ...(parsed.develop || {}) };
  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];

  for (const [rawName, pkgData] of Object.entries(combined)) {
    const canonicalName = normalizePythonPackageName(rawName);
    const rawVersion = pkgData.version || '*';
    const cleanVersion = rawVersion.replace(/^[=><~@!]+/, '').trim() || '1.0.0';

    const isDirect = directDepNames.size > 0 ? directDepNames.has(canonicalName) : true;
    const depth = isDirect ? 1 : 2;
    const id = createUniqueNodeId(canonicalName, cleanVersion, `${manifestFile}:${canonicalName}`);

    const occurrence: PackageOccurrence = {
      project,
      manifestFile,
      isDirect,
      declaredVersionRange: rawVersion,
      resolvedVersion: cleanVersion,
      dependencyPath: [canonicalName],
      depth,
    };

    const node: PackageNode = {
      id,
      name: canonicalName,
      version: cleanVersion,
      ecosystem: 'PyPI',
      project,
      manifestFile,
      occurrences: [occurrence],
      projects: [project],
      isDirect,
      path: [canonicalName],
      depth,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: {
        lastPublished: '',
        maintainerCount: 0,
        weeklyDownloads: 0,
        signals: [],
      },
      provenance: evaluateProvenance(),
    };

    packages.push(node);
    if (isDirect) {
      edges.push({ from: 'root', to: id });
    }
  }

  return { packages, edges, resolutionStatus: 'locked' };
}

/**
 * Parses pyproject.toml direct dependencies when no lockfile is present
 */
export function parsePyprojectToml(
  content: string,
  project = 'backend',
  manifestFile = 'pyproject.toml'
): {
  packages: PackageNode[];
  edges: GraphEdge[];
  resolutionStatus: 'declared_direct_only';
} {
  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];
  const lines = content.split(/\r?\n/);
  let inDepSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      line.startsWith('[tool.poetry.dependencies]') ||
      line.startsWith('[tool.poetry.dev-dependencies]') ||
      line.startsWith('[project.dependencies]')
    ) {
      inDepSection = true;
      continue;
    }
    if (line.startsWith('[') && inDepSection) {
      if (!line.includes('dependencies')) inDepSection = false;
    }

    if (inDepSection) {
      const m = line.match(/^([a-zA-Z0-9_.-]+)\s*=\s*["']?([^"']*)["']?/);
      if (m && m[1] !== 'python') {
        const canonicalName = normalizePythonPackageName(m[1]);
        const versionSpec = m[2] || '*';
        const cleanVersion = versionSpec.replace(/^[~^>=<v\s]+/, '').split(' ')[0] || '1.0.0';
        const id = createUniqueNodeId(canonicalName, cleanVersion, `${manifestFile}:${canonicalName}`);

        const occurrence: PackageOccurrence = {
          project,
          manifestFile,
          isDirect: true,
          declaredVersionRange: versionSpec,
          resolvedVersion: cleanVersion,
          dependencyPath: [canonicalName],
          depth: 1,
        };

        const node: PackageNode = {
          id,
          name: canonicalName,
          version: cleanVersion,
          ecosystem: 'PyPI',
          project,
          manifestFile,
          occurrences: [occurrence],
          projects: [project],
          isDirect: true,
          path: [canonicalName],
          depth: 1,
          dependentCount: 0,
          downstreamDependents: [],
          riskScore: 0,
          advisorySeverity: 'NONE',
          riskTier: 'safe',
          riskBreakdown: {
            knownVulnerability: 0,
            severityContribution: 0,
            outdatedVersion: 0,
            transitiveExposure: 0,
            downstreamImpact: 0,
            typosquatConfusion: 0,
            behavioralSignal: 0,
            totalScore: 0,
          },
          vulnerabilities: [],
          reputation: {
            lastPublished: '',
            maintainerCount: 0,
            weeklyDownloads: 0,
            signals: [],
          },
          provenance: evaluateProvenance(),
        };

        packages.push(node);
        edges.push({ from: 'root', to: id });
      }
    }
  }

  return { packages, edges, resolutionStatus: 'declared_direct_only' };
}

/**
 * Aggregates all discovered manifests across the repository.
 * Applies lockfile precedence per project directory, separates occurrences by project,
 * calculates project-level summaries (direct, transitive, total), and globally deduplicates
 * canonical package identities by (ecosystem, canonicalName, version).
 */
export function aggregateProjectManifests(manifests: RawManifestFile[]): {
  packages: PackageNode[];
  edges: GraphEdge[];
  projectSummaries: ProjectDependencySummary[];
  detectedFiles: string[];
  parsingErrors: Array<{ file: string; error: string }>;
} {
  const projectSummaries: ProjectDependencySummary[] = [];
  const parsingErrors: Array<{ file: string; error: string }> = [];
  const detectedFiles: string[] = manifests.map((m) => m.path);

  // Group manifests by project directory
  const byProject = new Map<string, RawManifestFile[]>();
  for (const m of manifests) {
    if (!byProject.has(m.project)) {
      byProject.set(m.project, []);
    }
    byProject.get(m.project)!.push(m);
  }

  const allOccurrences: PackageOccurrence[] = [];
  const projectParsedNodes = new Map<string, PackageNode[]>();
  const combinedEdges: GraphEdge[] = [];

  for (const [project, pManifests] of byProject.entries()) {
    const manifestFiles = pManifests.map((m) => m.path);

    // Identify ecosystem (npm if any package.json / lockfile, else PyPI)
    const isNpm = pManifests.some((m) => m.ecosystem === 'npm');
    const ecosystem: 'npm' | 'PyPI' = isNpm ? 'npm' : 'PyPI';

    let projectPackages: PackageNode[] = [];
    let projectEdges: GraphEdge[] = [];
    let resolutionStatus: 'locked' | 'declared_direct_only' = 'declared_direct_only';

    if (isNpm) {
      // ── NPM LOCKFILE PRECEDENCE ──
      const lockfileManifest = pManifests.find(
        (m) => m.fileName === 'package-lock.json' || m.fileName === 'npm-shrinkwrap.json'
      );
      const pkgJsonManifest = pManifests.find((m) => m.fileName === 'package.json');

      if (lockfileManifest) {
        try {
          const lockObj = JSON.parse(lockfileManifest.rawContent) as Record<string, unknown>;
          let pkgObj: Record<string, unknown> | null = null;
          if (pkgJsonManifest) {
            try {
              pkgObj = JSON.parse(pkgJsonManifest.rawContent) as Record<string, unknown>;
            } catch (err) {
              parsingErrors.push({
                file: pkgJsonManifest.path,
                error: `Malformed package.json: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }

          const parsed = parseLockfile(lockObj, pkgObj, project, lockfileManifest.path);
          projectPackages = parsed.packages;
          projectEdges = parsed.edges;
          resolutionStatus = 'locked';
        } catch (err) {
          parsingErrors.push({
            file: lockfileManifest.path,
            error: `Failed to parse lockfile: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else if (pkgJsonManifest) {
        try {
          const pkgObj = JSON.parse(pkgJsonManifest.rawContent) as Record<string, unknown>;
          const parsed = parsePackageJsonDirect(pkgObj, project, pkgJsonManifest.path);
          projectPackages = parsed.packages;
          projectEdges = parsed.edges;
          resolutionStatus = 'declared_direct_only';
        } catch (err) {
          parsingErrors.push({
            file: pkgJsonManifest.path,
            error: `Malformed package.json: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    } else {
      // ── PYTHON LOCKFILE PRECEDENCE ──
      const poetryLock = pManifests.find((m) => m.fileName === 'poetry.lock');
      const pyproject = pManifests.find((m) => m.fileName === 'pyproject.toml');
      const pipfileLock = pManifests.find((m) => m.fileName === 'pipfile.lock');
      const pipfile = pManifests.find((m) => m.fileName === 'pipfile');
      const requirements = pManifests.filter((m) => classifyManifestFile(m.fileName).ecosystem === 'PyPI' && m.fileName.includes('requirements'));

      if (poetryLock) {
        try {
          const parsed = parsePoetryLock(
            poetryLock.rawContent,
            pyproject ? pyproject.rawContent : null,
            project,
            poetryLock.path
          );
          projectPackages = parsed.packages;
          projectEdges = parsed.edges;
          resolutionStatus = 'locked';
        } catch (err) {
          parsingErrors.push({
            file: poetryLock.path,
            error: `Failed to parse poetry.lock: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else if (pipfileLock) {
        try {
          const parsed = parsePipfileLock(
            pipfileLock.rawContent,
            pipfile ? pipfile.rawContent : null,
            project,
            pipfileLock.path
          );
          projectPackages = parsed.packages;
          projectEdges = parsed.edges;
          resolutionStatus = 'locked';
        } catch (err) {
          parsingErrors.push({
            file: pipfileLock.path,
            error: `Failed to parse Pipfile.lock: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else if (requirements.length > 0) {
        for (const reqManifest of requirements) {
          try {
            const parsed = parseRequirementsTxt(reqManifest.rawContent, project, reqManifest.path);
            projectPackages.push(...parsed.packages);
            projectEdges.push(...parsed.edges);
            if (parsed.resolutionStatus === 'locked') {
              resolutionStatus = 'locked';
            }
          } catch (err) {
            parsingErrors.push({
              file: reqManifest.path,
              error: `Failed to parse requirements file: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      } else if (pyproject) {
        try {
          const parsed = parsePyprojectToml(pyproject.rawContent, project, pyproject.path);
          projectPackages = parsed.packages;
          projectEdges = parsed.edges;
          resolutionStatus = 'declared_direct_only';
        } catch (err) {
          parsingErrors.push({
            file: pyproject.path,
            error: `Failed to parse pyproject.toml: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    // Calculate project-level occurrence counts
    let directCount = 0;
    let transitiveCount = 0;
    for (const pkg of projectPackages) {
      if (pkg.isDirect) directCount++;
      else transitiveCount++;
      if (pkg.occurrences) {
        allOccurrences.push(...pkg.occurrences);
      }
    }

    // Only record projects where dependencies were resolved
    const lockfilePresent = resolutionStatus === 'locked';
    if (projectPackages.length > 0) {
      projectSummaries.push({
        projectName: project,
        directory: manifestFiles[0] ? manifestFiles[0].split('/').slice(0, -1).join('/') || './' : './',
        ecosystem: ecosystem.toLowerCase() === 'pypi' ? 'pypi' : 'npm',
        manifestFiles,
        lockfilePresent,
        resolutionStatus,
        directDependencies: directCount,
        transitiveDependencies: transitiveCount,
        totalDependencies: directCount + transitiveCount,
      });
    }

    projectParsedNodes.set(project, projectPackages);
    combinedEdges.push(...projectEdges);
  }

  // ── GLOBAL DEDUPLICATION BY (ecosystem, name, version) ──
  const identityMap = new Map<string, PackageNode>();

  for (const [project, pNodes] of projectParsedNodes.entries()) {
    for (const p of pNodes) {
      const eco = p.ecosystem || 'npm';
      const key = `${eco}:${p.name.toLowerCase()}@${p.version}`;

      if (!identityMap.has(key)) {
        identityMap.set(key, {
          ...p,
          projects: [project],
          occurrences: [...(p.occurrences || [])],
        });
      } else {
        const existing = identityMap.get(key)!;
        // Merge project list
        if (!existing.projects?.includes(project)) {
          existing.projects = [...(existing.projects || []), project];
        }
        // Merge occurrences
        if (p.occurrences) {
          existing.occurrences = [...(existing.occurrences || []), ...p.occurrences];
        }
        // If direct in any occurrence, mark as direct overall with minimum depth
        if (p.isDirect) {
          existing.isDirect = true;
        }
        if (p.depth < existing.depth) {
          existing.depth = p.depth;
          existing.path = p.path;
        }
      }
    }
  }

  const deduplicatedPackages = Array.from(identityMap.values());

  // Deduplicate graph edges
  const seenEdgeSet = new Set<string>();
  const finalEdges: GraphEdge[] = [];
  for (const edge of combinedEdges) {
    const key = `${edge.from}→${edge.to}`;
    if (!seenEdgeSet.has(key)) {
      seenEdgeSet.add(key);
      finalEdges.push(edge);
    }
  }

  return {
    packages: deduplicatedPackages,
    edges: finalEdges,
    projectSummaries,
    detectedFiles,
    parsingErrors,
  };
}



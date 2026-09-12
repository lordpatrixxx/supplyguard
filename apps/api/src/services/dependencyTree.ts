import type { PackageNode, GraphEdge } from '../types/index.js';
import { evaluateProvenance } from './provenance.js';

interface LockfilePackageEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface LockfileV7 {
  packages?: Record<string, LockfilePackageEntry>;
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
 * Creates unique dependency identifier: `${name}@${version}#${pkgPath}`
 */
export function createUniqueNodeId(name: string, version: string, pkgPath: string): string {
  return `${name}@${version}#${pkgPath}`;
}

/**
 * Parses npm v7+ package-lock.json into an array of distinct PackageNode instances
 * with unique IDs, exact resolved versions, depth, and provenance.
 */
export function parseLockfile(
  lockfile: Record<string, unknown>,
  packageJson: Record<string, unknown> | null
): { packages: PackageNode[]; edges: GraphEdge[] } {
  const packagesMap = (lockfile as LockfileV7).packages;

  if (!packagesMap) {
    throw new Error('Invalid lockfile format: missing "packages" field. Ensure this is an npm v7+ lockfile format.');
  }

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

  // Step 1: Create all PackageNodes with unique IDs
  const nodes: PackageNode[] = [];
  const pathToNodeMap = new Map<string, PackageNode>();
  // Map from package name to candidate nodes for edge resolution
  const nameToNodesMap = new Map<string, PackageNode[]>();

  for (const [pkgPath, pkgData] of Object.entries(packagesMap)) {
    // Skip the root application node
    if (pkgPath === '') continue;

    const name = extractPackageNameFromPath(pkgPath);
    const version = pkgData.version || '0.0.0';

    if (!name) continue;

    // Segments of node_modules nesting: "node_modules/a/node_modules/b" -> ["a", "b"]
    const segments = pkgPath.split('node_modules/').filter(Boolean).map((s) => s.replace(/\/$/, ''));
    const isDirect = directDepNames.has(name) && segments.length === 1;
    const depth = segments.length; // 1 for direct, 2+ for nested/transitive
    const id = createUniqueNodeId(name, version, pkgPath);

    const provenance = evaluateProvenance(
      { resolved: pkgData.resolved, integrity: pkgData.integrity },
      { hasRegistryMeta: true }
    );

    const node: PackageNode = {
      id,
      name,
      version,
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

  // Step 2: Build accurate graph edges between exact resolved instances
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  // Add edges from root to direct dependencies
  if (rootEntry) {
    const rootDirects = { ...(rootEntry.dependencies || {}), ...(rootEntry.devDependencies || {}) };
    for (const depName of Object.keys(rootDirects)) {
      // Direct node path in npm v7+ is "node_modules/${depName}"
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

  // Add edges between packages
  for (const [pkgPath, pkgData] of Object.entries(packagesMap)) {
    if (pkgPath === '') continue;

    const sourceNode = pathToNodeMap.get(pkgPath);
    if (!sourceNode) continue;

    const declaredDeps = {
      ...(pkgData.dependencies || {}),
    };

    for (const [depName, declaredRange] of Object.entries(declaredDeps)) {
      // Find the resolved dependency for this package:
      // In npm v7+: look first in nested path: `${pkgPath}/node_modules/${depName}`
      const nestedPath = `${pkgPath}/node_modules/${depName}`;
      let targetNode = pathToNodeMap.get(nestedPath);

      // If not in nested path, look in root node_modules or closest hoisted instance
      if (!targetNode) {
        targetNode = pathToNodeMap.get(`node_modules/${depName}`);
      }

      // Fallback: search candidate nodes with matching name
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

  // Step 3: Calculate actual downstream dependents and dependent count from graph topology
  // An incoming edge `from -> to` means `from` depends on `to`.
  // Therefore, `from` is a downstream dependent of `to`.
  const dependentMap = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.from === 'root') continue;
    if (!dependentMap.has(edge.to)) {
      dependentMap.set(edge.to, new Set());
    }
    dependentMap.get(edge.to)!.add(edge.from);
  }

  for (const node of nodes) {
    const dependents = dependentMap.get(node.id);
    if (dependents) {
      node.dependentCount = dependents.size;
      // Store friendly names or short identifiers for dependents
      node.downstreamDependents = Array.from(dependents).map((id) => {
        const target = nodes.find((n) => n.id === id);
        return target ? `${target.name}@${target.version}` : id;
      });
    }
  }

  return { packages: nodes, edges };
}

/**
 * Fallback parser when package-lock.json is not committed upstream.
 * Parses direct dependencies from package.json and models them as depth-1 nodes.
 */
export function parsePackageJsonDirect(
  packageJson: Record<string, unknown>
): { packages: PackageNode[]; edges: GraphEdge[] } {
  const deps = (packageJson.dependencies as Record<string, string>) || {};
  const devDeps = (packageJson.devDependencies as Record<string, string>) || {};

  const allDirect = { ...deps, ...devDeps };
  const packages: PackageNode[] = [];
  const edges: GraphEdge[] = [];

  for (const [name, versionRange] of Object.entries(allDirect)) {
    // Strip semver operators (^, ~, >=, etc.) to get target base version
    const cleanVersion = String(versionRange).replace(/^[~^>=<v\s]+/, '').split(' ')[0] || '1.0.0';
    const pkgPath = `node_modules/${name}`;
    const id = createUniqueNodeId(name, cleanVersion, pkgPath);

    packages.push({
      id,
      name,
      version: cleanVersion,
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
  }

  return { packages, edges };
}


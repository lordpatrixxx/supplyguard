export interface Vulnerability {
  id: string;
  source: 'OSV' | 'GHSA' | 'NVD';
  summary: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fixedIn?: string;
  cve?: string;
  ghsa?: string;
  affectedRange?: string;
  ecosystem?: string;
  packageName?: string;
  installedVersion?: string;
  dependencyPath?: string[];
  isDirect?: boolean;
}

export interface ReputationData {
  lastPublished: string;
  createdDate?: string;
  packageAgeYears?: number;
  maintainerCount: number;
  weeklyDownloads: number;
  signals: string[];
}

export interface TyposquatFlag {
  similarTo: string;
  distance: number;
  similarity: number; // e.g. 92%
  indicator: string;  // "Possible typosquatting indicator"
  reason: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface DependencyConfusionFlag {
  indicator: string;  // "Potential dependency-confusion risk"
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ProvenanceSignals {
  sourceRepo: 'Available' | 'Missing' | 'Mismatch';
  sourceRepoUrl?: string;
  registryMetadata: 'Available' | 'Unpublished' | 'Private';
  lockfileIntegrity: 'Present' | 'Missing';
  buildAttestation: 'Not available'; // Honest: No fake SLSA claims
}

export interface BehavioralFlag {
  indicator: string; // "Suspicious install-script behavior"
  matchedSignals: string[];
  indicators?: string[];
  scriptStage: 'preinstall' | 'install' | 'postinstall';
  confidence: 'high' | 'medium' | 'low';
  excerpt: string; // safely truncated to <= 120 characters, plain text
  rawScript?: string;
  explanation?: string;
}

export interface BehavioralMetrics {
  totalDependencies: number;
  behavioralTargets: number;
  lifecycleScriptsInspected: number;
  highConfidenceSignals: number;
  mediumConfidenceSignals: number;
  lowConfidenceSignals: number;
  allowListedTooling: number;
}

export interface RiskBreakdown {
  knownVulnerability: number;   // e.g. +40
  severityContribution: number; // e.g. +20 (scaled from max CVSS)
  outdatedVersion: number;      // e.g. +10
  transitiveExposure: number;   // e.g. +8
  downstreamImpact: number;     // e.g. +8 (based on actual graph fan-out)
  typosquatConfusion: number;   // e.g. +15
  behavioralSignal?: number;    // e.g. +25 (high), +15 (medium), +5 (low)
  totalScore: number;           // Capped at 100
}

export interface Remediation {
  why_risky: string;
  fix: string;
  fix_command: string;
}

export interface PackageOccurrence {
  project: string; // e.g. "frontend", "backend", "root"
  manifestFile: string; // e.g. "frontend/package.json", "backend/requirements.txt"
  isDirect: boolean;
  declaredVersionRange?: string;
  resolvedVersion: string;
  dependencyPath: string[];
  depth: number;
}

export interface ProjectDependencySummary {
  projectName: string; // e.g. "frontend", "backend"
  directory: string;
  ecosystem: 'npm' | 'PyPI' | 'pypi';
  manifestFiles: string[];
  lockfilePresent: boolean;
  resolutionStatus: 'locked' | 'declared_direct_only';
  directDependencies: number;
  transitiveDependencies: number;
  totalDependencies: number;
  // Aliases for backwards compatibility:
  project?: string;
  directCount?: number;
  transitiveCount?: number;
  totalCount?: number;
}

export interface PackageNode {
  id: string; // Unique dependency identifier, e.g. "lodash@4.17.20#node_modules/lodash"
  name: string; // Clean package name (e.g. "lodash" or "@scope/package")
  version: string; // Resolved version
  ecosystem?: 'npm' | 'PyPI'; // Ecosystem: npm or PyPI
  project?: string; // Origin project directory, e.g. "frontend", "backend"
  manifestFile?: string; // Origin manifest file, e.g. "frontend/package-lock.json"
  occurrences?: PackageOccurrence[]; // All physical occurrences of this package
  projects?: string[]; // All projects where this package appears
  isDirect: boolean;
  path: string[];
  depth: number; // Dependency depth from root (1 for direct, 2+ for transitive)
  dependentCount: number; // Actual downstream dependents from graph topology
  downstreamDependents: string[];
  riskScore: number; // 0-100 SupplyGuard Risk Score
  advisorySeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'; // Advisory severity (distinct from risk score)
  riskTier: 'safe' | 'medium' | 'critical';
  riskBreakdown: RiskBreakdown;
  vulnerabilities: Vulnerability[];
  reputation: ReputationData;
  provenance: ProvenanceSignals;
  typosquatFlag?: TyposquatFlag;
  confusionFlag?: DependencyConfusionFlag;
  behavioralFlags?: BehavioralFlag[];
  behavioralFlag?: BehavioralFlag;
  remediation?: Remediation;
  projectedRiskScore?: number;
  ptsReduced?: number;
}

export interface GraphEdge {
  from: string; // Unique node ID
  to: string;   // Unique node ID
}

export type ScanStatus = 'queued' | 'running' | 'complete' | 'failed';

export interface ScanResult {
  scanId: string;
  userId?: string;
  repoUrl: string;
  owner?: string;
  repo?: string;
  branch?: string;
  subpath?: string;
  status: ScanStatus;
  statusMessage?: string;
  overallRiskScore: number;
  projectedOverallRiskScore?: number;
  limitations?: string[];
  detectedFiles?: string[];
  projectSummaries?: ProjectDependencySummary[];
  treeCompleteness?: 'complete' | 'truncated' | 'fallback';
  parsingErrors?: Array<{ file: string; error: string }>;
  packages: PackageNode[];
  edges: GraphEdge[];
  behavioralMetrics?: BehavioralMetrics;
  createdAt: string;
  completedAt?: string;
}

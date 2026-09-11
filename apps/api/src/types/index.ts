export interface Vulnerability {
  id: string;
  source: 'OSV' | 'GHSA' | 'NVD';
  summary: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fixedIn?: string;
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

export interface RiskBreakdown {
  knownVulnerability: number;   // e.g. +40
  severityContribution: number; // e.g. +20 (scaled from max CVSS)
  outdatedVersion: number;      // e.g. +10
  transitiveExposure: number;   // e.g. +8
  downstreamImpact: number;     // e.g. +8 (based on actual graph fan-out)
  typosquatConfusion: number;   // e.g. +15
  totalScore: number;           // Capped at 100
}

export interface Remediation {
  why_risky: string;
  fix: string;
  fix_command: string;
}

export interface PackageNode {
  id: string; // Unique dependency identifier, e.g. "lodash@4.17.20#node_modules/lodash"
  name: string; // Clean package name (e.g. "lodash" or "@scope/package")
  version: string; // Resolved version
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
  remediation?: Remediation;
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
  packages: PackageNode[];
  edges: GraphEdge[];
  createdAt: string;
  completedAt?: string;
}

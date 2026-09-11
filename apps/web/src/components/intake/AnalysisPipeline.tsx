import React, { useState } from 'react';
import {
  FileCode2, Network, ShieldAlert, Zap, Cpu,
  Search, Lock, ArrowDown, CheckCircle2, Layers
} from 'lucide-react';

interface SubVector {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  colorClass: string;
  badgeClass: string;
  shortDesc: string;
  detail: string;
  spec: string;
}

export const AnalysisPipeline: React.FC = () => {
  const [activeVectorId, setActiveVectorId] = useState<string>('cve');
  const [activeStage, setActiveStage] = useState<number>(3);

  const subVectors: SubVector[] = [
    {
      id: 'cve',
      name: 'Vulnerability Engine',
      icon: ShieldAlert,
      tag: 'OSV & GitHub Advisories',
      colorClass: 'text-primary border-primary/40 bg-primary/10',
      badgeClass: 'text-primary bg-primary/10 border-primary/30',
      shortDesc: 'Correlates upstream OSV and GitHub Advisories with FIRST-compliant CVSS vectors.',
      detail: 'Maps every resolved package version against OSV, GitHub Security Advisory Database, and NVD with precise semver range evaluation.',
      spec: 'FIRST CVSS v3.1 / v4.0',
    },
    {
      id: 'topology',
      name: 'Topological Fan-Out',
      icon: Layers,
      tag: 'Acyclic Blast Radius',
      colorClass: 'text-tertiary border-tertiary/40 bg-tertiary/10',
      badgeClass: 'text-tertiary bg-tertiary/10 border-tertiary/30',
      shortDesc: 'Calculates real downstream dependent reachability across all graph depths.',
      detail: 'Determines whether a compromised transitive dependency is reachable by root imports or isolated in dead leaves.',
      spec: 'Transitive Depth Analysis',
    },
    {
      id: 'heuristics',
      name: 'Heuristic Protection',
      icon: Search,
      tag: 'Typosquatting & Confusion',
      colorClass: 'text-secondary border-secondary/40 bg-secondary/10',
      badgeClass: 'text-secondary bg-secondary/10 border-secondary/30',
      shortDesc: 'Detects lookalike typosquatting and internal namespace collisions.',
      detail: 'Compares dependency names against 1,000+ top ecosystem packages using length-bounded Levenshtein distance and company scope heuristics.',
      spec: 'Levenshtein Distance ≤ 2',
    },
    {
      id: 'behavioral',
      name: 'Behavioral Threat Signals',
      icon: Zap,
      tag: 'Static Install Scripts',
      colorClass: 'text-primary border-primary/40 bg-primary/10',
      badgeClass: 'text-primary bg-primary/10 border-primary/30',
      shortDesc: 'Static install-script heuristics detecting pipe-to-shell and obfuscation.',
      detail: 'Parses preinstall/postinstall lifecycle scripts statically to identify curl|bash patterns, base64 payload unpacking, and credential exfiltration.',
      spec: 'Static AST Inspection',
    },
  ];

  const activeVector = subVectors.find((v) => v.id === activeVectorId) || subVectors[0];

  return (
    <div className="flex flex-col p-6 sm:p-7 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-sm transition-all duration-200">
      {/* Header with Title and Zero-Execution Guarantee Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
              Autonomous Supply Chain Pipeline
            </h2>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant font-body-sm">
            Deterministic 4-stage audit pipeline executing directly on Git manifest structures.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container border border-primary/30 text-primary font-mono text-[11px] self-start sm:self-center font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>Zero Code Execution</span>
        </div>
      </div>

      {/* 4 Pipeline Flow Stages */}
      <div className="pt-6 space-y-6">
        {/* Stage 1: Manifest Ingestion */}
        <div
          onMouseEnter={() => setActiveStage(1)}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-default ${
            activeStage === 1
              ? 'bg-surface-container border-primary/40 shadow-sm'
              : 'bg-surface-container-lowest/70 border-outline-variant/30 hover:border-outline-variant/60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-outline px-1.5 py-0.5 rounded bg-surface-container-high">
                    Stage 01
                  </span>
                  <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                    Manifest &amp; Lockfile Extraction
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant font-body-sm leading-relaxed">
                  Direct extraction of <code className="font-mono text-primary text-[11px]">package.json</code> and <code className="font-mono text-primary text-[11px]">package-lock.json</code> without invoking untrusted lifecycle scripts.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-outline shrink-0">
              Direct Git Tree
            </span>
          </div>
        </div>

        {/* Pipeline Flow Connector */}
        <div className="flex justify-center -my-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container border border-outline-variant/40 text-outline">
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        {/* Stage 2: Graph Topology Resolution */}
        <div
          onMouseEnter={() => setActiveStage(2)}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-default ${
            activeStage === 2
              ? 'bg-surface-container border-primary/40 shadow-sm'
              : 'bg-surface-container-lowest/70 border-outline-variant/30 hover:border-outline-variant/60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary shrink-0 mt-0.5">
                <Network className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-outline px-1.5 py-0.5 rounded bg-surface-container-high">
                    Stage 02
                  </span>
                  <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                    Acyclic Graph Topology Resolution
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant font-body-sm leading-relaxed">
                  Builds deterministic directed acyclic dependency graphs, separating direct root packages from deeply nested transitive trees.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-outline shrink-0">
              Deep Reachability
            </span>
          </div>
        </div>

        {/* Pipeline Flow Connector */}
        <div className="flex justify-center -my-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container border border-outline-variant/40 text-outline">
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        {/* Stage 3: Multi-Vector Security Correlation (Interactive Engine Grid) */}
        <div
          onMouseEnter={() => setActiveStage(3)}
          className={`relative p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
            activeStage === 3
              ? 'bg-surface-container border-primary/40 shadow-sm'
              : 'bg-surface-container-lowest/70 border-outline-variant/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">
                Stage 03 • Core Intelligence
              </span>
              <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                Multi-Vector Threat Analysis Engine
              </h3>
            </div>
            <span className="text-[11px] font-body-sm text-on-surface-variant hidden sm:inline">
              Select vector to inspect
            </span>
          </div>

          {/* 4 Interactive Vectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {subVectors.map((v) => {
              const Icon = v.icon;
              const isSelected = v.id === activeVectorId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVectorId(v.id)}
                  onMouseEnter={() => setActiveVectorId(v.id)}
                  className={`p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-surface-container-high border-primary/60 shadow-xs ring-1 ring-primary/20'
                      : 'bg-surface-container-lowest/80 border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${v.colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-headline-sm text-xs font-semibold text-on-surface">
                        {v.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-body-sm leading-relaxed line-clamp-2">
                    {v.shortDesc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Vector Deep-Dive Telemetry Card */}
          <div className="mt-3.5 p-3 rounded-lg bg-surface-container-lowest/90 border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-body-sm animate-fade-in">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-on-surface">{activeVector.name}:</span>
                <span className="text-[11px] font-mono text-primary font-semibold">{activeVector.spec}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-body-sm">
                {activeVector.detail}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-[11px] font-mono text-outline border border-outline-variant/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Real-Time Ingestion</span>
            </div>
          </div>
        </div>

        {/* Pipeline Flow Connector */}
        <div className="flex justify-center -my-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container border border-outline-variant/40 text-outline">
            <ArrowDown className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>

        {/* Stage 4: Risk Profiling & CycloneDX SBOM Export */}
        <div
          onMouseEnter={() => setActiveStage(4)}
          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-default ${
            activeStage === 4
              ? 'bg-surface-container border-primary/40 shadow-sm'
              : 'bg-surface-container-lowest/70 border-outline-variant/30 hover:border-outline-variant/60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-outline px-1.5 py-0.5 rounded bg-surface-container-high">
                    Stage 04
                  </span>
                  <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                    Contextual Risk Scoring &amp; CycloneDX v1.5 SBOM
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant font-body-sm leading-relaxed">
                  Synthesizes an itemized 0–100 contextual risk score and generates a standardized, cryptographically hashed CycloneDX v1.5 JSON software bill of materials.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-outline shrink-0">
              SHA-512 Signed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

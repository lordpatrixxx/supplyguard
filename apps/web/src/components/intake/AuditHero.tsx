import React from 'react';
import { ShieldCheck, Lock, Sparkles, Cpu, Layers } from 'lucide-react';

export const AuditHero: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-outline-variant/30">
      <div className="space-y-3 max-w-3xl">
        {/* Category Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-xs font-body-sm text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-medium">Enterprise Software Supply Chain Security</span>
          <span className="text-outline">•</span>
          <span className="text-outline text-[11px] font-mono">v1.2.0</span>
        </div>

        {/* Primary Page Headline */}
        <h1 className="font-headline-md text-3xl sm:text-4xl lg:text-[42px] font-bold text-on-surface tracking-tight leading-[1.15]">
          New Security Audit
        </h1>

        {/* Value Proposition Description */}
        <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed max-w-2xl font-body-md">
          Deep-scan public repositories or monorepo subpaths to map nested dependency trees,
          correlate multi-source vulnerability intelligence, detect typosquatting, and evaluate topological blast radius.
        </p>

        {/* Key Capability Highlights */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Zero Code Execution</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
            <Layers className="w-3.5 h-3.5 text-tertiary" />
            <span>Transitive Blast Radius</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span>Typosquatting Heuristics</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-xs font-body-sm text-on-surface-variant">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>CycloneDX 1.5 JSON SBOM</span>
          </div>
        </div>
      </div>

      {/* Live Engine Status Chip */}
      <div className="flex items-center gap-3 self-start lg:self-end px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 shadow-xs">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 text-primary">
          <Cpu className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface font-body-sm">
            <span>Analysis Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="font-mono text-[11px] text-primary">
            OSV &amp; NVD Ingestion Active
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Cpu } from 'lucide-react';

export const AuditHero: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
      <div className="space-y-2">
        {/* Category Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-xs font-body-sm text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-medium">Supply Chain Security</span>
          <span className="text-outline">•</span>
          <span className="text-outline text-[11px] font-mono">v1.2.0</span>
        </div>

        {/* Primary Page Headline */}
        <h1 className="font-headline-md text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-tight">
          New Security Audit
        </h1>

        {/* Value Proposition Description */}
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xl font-body-md">
          Deep-scan public repositories or monorepo subpaths to map nested dependency trees,
          correlate multi-source vulnerability intelligence, and evaluate blast radius.
        </p>
      </div>

      {/* Live Engine Status Chip */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 shadow-xs shrink-0 self-start sm:self-center">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 text-primary">
          <Cpu className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </div>
        <div className="space-y-0.5 text-left">
          <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface font-body-sm">
            <span>Scanner Ready</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="font-mono text-[10px] text-primary">
            OSV &amp; NVD Ingestion Active
          </div>
        </div>
      </div>
    </div>
  );
};

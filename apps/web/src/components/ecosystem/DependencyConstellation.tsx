import React, { useState, useMemo, useRef } from 'react';
import type { PackageNode, Vulnerability, ScanResult } from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, Filter, AlertTriangle } from 'lucide-react';

interface ConstellationNode {
  id: string;
  name: string;
  version: string;
  depth: number;
  isDirect: boolean;
  ecosystem: string;
  hasVulnerability: boolean;
  hasBehavioralFlag?: boolean;
  vulnerabilitySeverity?: 'critical' | 'high' | 'medium' | 'low';
  parentName?: string;
  x: number;
  y: number;
}

interface ConstellationEdge {
  from: string;
  to: string;
  isWarning: boolean;
}

interface DependencyConstellationProps {
  scanData?: ScanResult | null;
  nodes?: PackageNode[];
  vulnerabilities?: Vulnerability[];
  projectName?: string;
  isLoading?: boolean;
  height?: number;
}

export const DependencyConstellation: React.FC<DependencyConstellationProps> = ({
  scanData,
  nodes: explicitNodes,
  vulnerabilities: explicitVulns,
  projectName: explicitProjectName,
  isLoading: _isLoading = false,
  height = 480,
}) => {
  const nodes = explicitNodes ?? scanData?.packages;
  const vulnerabilities = explicitVulns ?? (scanData as any)?.vulnerabilities ?? scanData?.packages?.flatMap((p) => p.vulnerabilities || []) ?? [];
  const projectName = explicitProjectName ?? scanData?.repo ?? (scanData?.repoUrl ? scanData.repoUrl.replace(/^https?:\/\/github\.com\//, '') : 'Target Application');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback sample graph if no scan has been performed yet
  const defaultSampleData = useMemo(() => {
    const root = { id: 'root', name: projectName || 'my-app', version: '1.0.0', depth: 0, isDirect: false, ecosystem: 'npm', hasVulnerability: false, x: 500, y: 240 };
    
    const directSamples = [
      { id: 'express', name: 'express', version: '4.19.2', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 0 },
      { id: 'axios', name: 'axios', version: '1.6.8', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 60 },
      { id: 'body-parser', name: 'body-parser', version: '1.20.2', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 120 },
      { id: 'lodash', name: 'lodash', version: '4.17.21', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 180 },
      { id: 'cookie', name: 'cookie', version: '0.6.0', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 240 },
      { id: 'debug', name: 'debug', version: '4.3.4', depth: 1, isDirect: true, ecosystem: 'npm', hasVulnerability: false, angle: 300 },
    ];

    const transitiveSamples = [
      { id: 'qs', name: 'qs', version: '6.5.2', depth: 2, isDirect: false, ecosystem: 'npm', hasVulnerability: true, vulnerabilitySeverity: 'high' as const, parentId: 'body-parser', angle: 105 },
      { id: 'raw-body', name: 'raw-body', version: '2.5.2', depth: 2, isDirect: false, ecosystem: 'npm', hasVulnerability: false, parentId: 'body-parser', angle: 135 },
      { id: 'follow-redirects', name: 'follow-redirects', version: '1.15.6', depth: 2, isDirect: false, ecosystem: 'npm', hasVulnerability: false, parentId: 'axios', angle: 45 },
      { id: 'ms', name: 'ms', version: '2.1.3', depth: 2, isDirect: false, ecosystem: 'npm', hasVulnerability: false, parentId: 'debug', angle: 315 },
      { id: 'send', name: 'send', version: '0.18.0', depth: 2, isDirect: false, ecosystem: 'npm', hasVulnerability: false, parentId: 'express', angle: 15 },
    ];

    const graphNodes: ConstellationNode[] = [
      root,
      ...directSamples.map((d) => {
        const rad = (d.angle * Math.PI) / 180;
        return {
          id: d.id,
          name: d.name,
          version: d.version,
          depth: d.depth,
          isDirect: d.isDirect,
          ecosystem: d.ecosystem,
          hasVulnerability: d.hasVulnerability,
          x: 500 + 160 * Math.cos(rad),
          y: 240 + 130 * Math.sin(rad),
        };
      }),
      ...transitiveSamples.map((t) => {
        const rad = (t.angle * Math.PI) / 180;
        return {
          id: t.id,
          name: t.name,
          version: t.version,
          depth: t.depth,
          isDirect: t.isDirect,
          ecosystem: t.ecosystem,
          hasVulnerability: t.hasVulnerability,
          vulnerabilitySeverity: t.vulnerabilitySeverity,
          parentName: t.parentId,
          x: 500 + 290 * Math.cos(rad),
          y: 240 + 190 * Math.sin(rad),
        };
      }),
    ];

    const graphEdges: ConstellationEdge[] = [
      ...directSamples.map((d) => ({ from: 'root', to: d.id, isWarning: false })),
      ...transitiveSamples.map((t) => ({ from: t.parentId, to: t.id, isWarning: t.hasVulnerability })),
    ];

    return { nodes: graphNodes, edges: graphEdges };
  }, [projectName]);

  // Compute graph from real scan nodes if provided
  const graphData = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return defaultSampleData;
    }

    const vulnMap = new Map<string, Vulnerability>();
    vulnerabilities.forEach((v: Vulnerability) => {
      if (v.packageName) vulnMap.set(v.packageName, v);
    });

    const rootNode: ConstellationNode = {
      id: 'root',
      name: projectName || 'Scanned Repository',
      version: 'HEAD',
      depth: 0,
      isDirect: false,
      ecosystem: 'repository',
      hasVulnerability: false,
      x: 500,
      y: 240,
    };

    const directNodes = nodes.filter((n) => n.depth === 1);
    const transitiveNodes = nodes.filter((n) => n.depth > 1);

    // Position direct nodes around inner ellipse (radius ~ 160x130)
    const directRendered: ConstellationNode[] = directNodes.slice(0, 16).map((node, i) => {
      const total = Math.min(directNodes.length, 16);
      const angle = (i * (360 / total) * Math.PI) / 180;
      const v = vulnMap.get(node.name);
      return {
        id: `${node.name}@${node.version}`,
        name: node.name,
        version: node.version,
        depth: 1,
        isDirect: true,
        ecosystem: node.ecosystem || 'npm',
        hasVulnerability: !!v,
        vulnerabilitySeverity: v ? ((v.severity?.toLowerCase() as any) || 'low') : undefined,
        x: 500 + 160 * Math.cos(angle),
        y: 240 + 130 * Math.sin(angle),
      };
    });

    // Position a subset of transitive nodes around outer ellipse (radius ~ 290x190)
    const transitiveRendered: ConstellationNode[] = transitiveNodes.slice(0, 24).map((node, i) => {
      const total = Math.min(transitiveNodes.length, 24);
      const angle = ((i * (360 / total) + 15) * Math.PI) / 180;
      const v = vulnMap.get(node.name);
      const parentName = node.path && node.path.length > 1 ? node.path[node.path.length - 2] : undefined;
      return {
        id: `${node.name}@${node.version}`,
        name: node.name,
        version: node.version,
        depth: node.depth,
        isDirect: false,
        ecosystem: node.ecosystem || 'npm',
        hasVulnerability: !!v,
        vulnerabilitySeverity: v ? ((v.severity?.toLowerCase() as any) || 'low') : undefined,
        parentName,
        x: 500 + 290 * Math.cos(angle),
        y: 240 + 190 * Math.sin(angle),
      };
    });

    const combinedNodes = [rootNode, ...directRendered, ...transitiveRendered];

    // Compute edges
    const nodeMap = new Map(combinedNodes.map((n) => [n.name, n]));
    const edges: ConstellationEdge[] = [];

    directRendered.forEach((d) => {
      edges.push({ from: 'root', to: d.id, isWarning: d.hasVulnerability });
    });

    transitiveRendered.forEach((t) => {
      let fromId = 'root';
      if (t.parentName) {
        const parent = nodeMap.get(t.parentName);
        if (parent) fromId = parent.id;
      }
      edges.push({ from: fromId, to: t.id, isWarning: t.hasVulnerability });
    });

    return { nodes: combinedNodes, edges };
  }, [nodes, vulnerabilities, projectName, defaultSampleData]);

  // Active node details for popover
  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return graphData.nodes.find((n) => n.id === hoveredNodeId) || null;
  }, [hoveredNodeId, graphData.nodes]);

  // Connected edges for hover highlighting
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const set = new Set<string>([hoveredNodeId]);
    graphData.edges.forEach((e) => {
      if (e.from === hoveredNodeId) set.add(e.to);
      if (e.to === hoveredNodeId) set.add(e.from);
    });
    return set;
  }, [hoveredNodeId, graphData.edges]);

  const visibleNodes = useMemo(() => {
    if (!filterFlaggedOnly) return graphData.nodes;
    return graphData.nodes.filter((n) => n.id === 'root' || n.hasVulnerability);
  }, [graphData.nodes, filterFlaggedOnly]);

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return graphData.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));
  }, [graphData.edges, visibleNodes]);

  return (
    <div className="relative w-full rounded-2xl bg-surface-container-low border border-outline-variant/30 overflow-hidden shadow-sm transition-all">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.06)_0%,_rgba(11,14,21,0)_70%)] pointer-events-none" />

      {/* Top Header Bar with Project Metadata */}
      <div className="relative z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <div>
            <h3 className="text-sm font-headline-md font-semibold text-on-surface">
              {projectName}
            </h3>
            <p className="text-[11px] font-body-sm text-on-surface-variant">
              Interactive Dependency Ecosystem Topology
            </p>
          </div>
        </div>

        {/* Minimal Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-body-sm text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Clean Dependency</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Advisory Finding</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-critical" />
            <span>Critical Severity</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        style={{ height: `${height}px` }}
        className="relative w-full flex items-center justify-center p-4 overflow-hidden select-none"
      >
        <svg
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
          viewBox="0 0 1000 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Orbital Reference Rings for Depth */}
          <ellipse cx="500" cy="240" rx="160" ry="130" stroke="var(--color-outline-variant)" strokeOpacity="0.25" strokeWidth="1" />
          <ellipse cx="500" cy="240" rx="290" ry="190" stroke="var(--color-outline-variant)" strokeOpacity="0.15" strokeDasharray="6 6" strokeWidth="1" />

          {/* Edges */}
          {visibleEdges.map((edge, idx) => {
            const fromNode = graphData.nodes.find((n) => n.id === edge.from);
            const toNode = graphData.nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const isHovered = hoveredNodeId && (edge.from === hoveredNodeId || edge.to === hoveredNodeId);
            const isDimmed = hoveredNodeId && !isHovered;

            let strokeColor = edge.isWarning ? 'var(--color-critical)' : 'var(--color-primary)';
            let strokeOpacity = isHovered ? 0.9 : isDimmed ? 0.08 : edge.isWarning ? 0.5 : 0.25;
            let strokeWidth = isHovered ? 2 : 1.2;

            return (
              <line
                key={`edge-${idx}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={strokeColor}
                strokeOpacity={strokeOpacity}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.isWarning ? '4 3' : undefined}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            const isRoot = node.id === 'root';
            const isHovered = hoveredNodeId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isDimmed = hoveredNodeId && !isHovered && !isConnected;

            let fillColor = isRoot
              ? 'var(--color-surface-container-lowest)'
              : 'var(--color-surface-container)';
            let strokeColor = isRoot
              ? 'var(--color-primary)'
              : node.hasVulnerability
              ? node.vulnerabilitySeverity === 'critical'
                ? 'var(--color-critical)'
                : 'var(--color-warning)'
              : 'var(--color-primary)';

            let radius = isRoot ? 32 : node.isDirect ? 14 : 7;
            let opacity = isDimmed ? 0.25 : 1;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="cursor-pointer transition-all duration-150"
                style={{ opacity }}
              >
                {/* Vulnerability Pulse Halo */}
                {node.hasVulnerability && !isDimmed && (
                  <circle
                    r={radius + 8}
                    fill={strokeColor}
                    fillOpacity="0.15"
                    className="animate-pulse"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r={radius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 2.5 : isRoot ? 2 : 1.5}
                  className="transition-transform duration-150 hover:scale-110"
                />

                {/* Node Label for Root and Direct Packages */}
                {(isRoot || node.isDirect || isHovered) && (
                  <text
                    x="0"
                    y={isRoot ? 4 : radius + 12}
                    textAnchor="middle"
                    fill="var(--color-on-surface)"
                    fontFamily="var(--font-body-sm)"
                    fontSize={isRoot ? 11 : 9}
                    fontWeight={isRoot ? 600 : 500}
                    className="select-none pointer-events-none"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Inspection Popover Overlay */}
        {hoveredNode && hoveredNode.id !== 'root' && (
          <div
            className="absolute top-4 left-6 z-20 p-3 rounded-xl bg-surface-container/95 border border-outline-variant/40 shadow-xl backdrop-blur-md animate-fade-in pointer-events-none text-xs font-body-sm space-y-1 max-w-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-on-surface truncate">
                {hoveredNode.name}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-primary">
                v{hoveredNode.version}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <span>{hoveredNode.isDirect ? 'Direct Dependency' : 'Transitive Package'}</span>
              <span>•</span>
              <span className="capitalize">{hoveredNode.ecosystem}</span>
            </div>

            {hoveredNode.hasVulnerability && (
              <div className="flex items-center gap-1.5 pt-1 text-critical text-[11px] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Security Advisory Flagged ({hoveredNode.vulnerabilitySeverity || 'advisory'})</span>
              </div>
            )}
          </div>
        )}

        {/* Graph Controls Toolbar (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 bg-surface-container-lowest/85 backdrop-blur-md rounded-xl border border-outline-variant/30 shadow-md">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.7))}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-outline-variant/30 mx-0.5" />
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setFilterFlaggedOnly(false);
            }}
            aria-label="Reset zoom and filters"
            title="Reset view"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setFilterFlaggedOnly((prev) => !prev)}
            aria-label="Toggle flagged only"
            title={filterFlaggedOnly ? 'Show all packages' : 'Filter by flagged packages only'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none ${
              filterFlaggedOnly
                ? 'bg-warning/20 text-warning'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-transparent'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

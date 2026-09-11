import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Activity, RotateCcw } from 'lucide-react';

interface ConstellationNode {
  id: string;
  name: string;
  version: string;
  type: 'safe' | 'warning' | 'critical';
  x: number;
  y: number;
  z: number;
  radius: number;
  depth: number;
  dependents: number;
  vulnerabilities: number;
}

interface ConstellationEdge {
  source: number;
  target: number;
  pulseProgress: number;
  speed: number;
}

export const DependencyConstellation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [nodeCountFilter, setNodeCountFilter] = useState<'all' | 'risks'>('all');

  const nodesRef = useRef<ConstellationNode[]>([]);
  const edgesRef = useRef<ConstellationEdge[]>([]);
  const rotationRef = useRef({ rotX: 0.15, rotY: 0, targetRotX: 0.15, targetRotY: 0 });
  const mouseRef = useRef({ x: 0, y: 0, isHovering: false });

  // Initialize nodes and edges with deterministic topological structure
  useEffect(() => {
    const packages: Array<{
      name: string;
      version: string;
      type: 'safe' | 'warning' | 'critical';
      depth: number;
      dependents: number;
      vulnerabilities: number;
    }> = [
      { name: 'app-gateway', version: '2.4.0', type: 'safe', depth: 0, dependents: 12, vulnerabilities: 0 },
      { name: 'express', version: '4.19.2', type: 'safe', depth: 1, dependents: 9, vulnerabilities: 0 },
      { name: 'axios', version: '1.6.8', type: 'safe', depth: 1, dependents: 8, vulnerabilities: 0 },
      { name: 'jsonwebtoken', version: '9.0.2', type: 'safe', depth: 1, dependents: 5, vulnerabilities: 0 },
      { name: 'lodash', version: '4.17.21', type: 'warning', depth: 2, dependents: 14, vulnerabilities: 1 },
      { name: 'qs', version: '6.11.0', type: 'critical', depth: 2, dependents: 7, vulnerabilities: 2 },
      { name: 'body-parser', version: '1.20.2', type: 'safe', depth: 2, dependents: 4, vulnerabilities: 0 },
      { name: 'cookie-parser', version: '1.4.6', type: 'safe', depth: 2, dependents: 3, vulnerabilities: 0 },
      { name: 'semver', version: '7.6.0', type: 'safe', depth: 2, dependents: 6, vulnerabilities: 0 },
      { name: 'debug', version: '4.3.4', type: 'safe', depth: 3, dependents: 11, vulnerabilities: 0 },
      { name: 'mime-types', version: '2.1.35', type: 'safe', depth: 3, dependents: 5, vulnerabilities: 0 },
      { name: 'safe-buffer', version: '5.2.1', type: 'safe', depth: 3, dependents: 8, vulnerabilities: 0 },
      { name: 'ms', version: '2.1.3', type: 'safe', depth: 4, dependents: 10, vulnerabilities: 0 },
      { name: 'validator', version: '13.11.0', type: 'warning', depth: 2, dependents: 4, vulnerabilities: 1 },
      { name: 'minimist', version: '1.2.8', type: 'critical', depth: 3, dependents: 6, vulnerabilities: 1 },
      { name: 'bytes', version: '3.1.2', type: 'safe', depth: 3, dependents: 3, vulnerabilities: 0 },
      { name: 'content-type', version: '1.0.5', type: 'safe', depth: 3, dependents: 4, vulnerabilities: 0 },
      { name: 'raw-body', version: '2.5.2', type: 'safe', depth: 3, dependents: 2, vulnerabilities: 0 },
      { name: 'depd', version: '2.0.0', type: 'safe', depth: 4, dependents: 7, vulnerabilities: 0 },
      { name: 'on-finished', version: '2.4.1', type: 'safe', depth: 4, dependents: 3, vulnerabilities: 0 },
      { name: 'statuses', version: '2.0.1', type: 'safe', depth: 4, dependents: 4, vulnerabilities: 0 },
      { name: 'unpipe', version: '1.0.0', type: 'safe', depth: 4, dependents: 2, vulnerabilities: 0 },
      { name: 'http-errors', version: '2.0.0', type: 'safe', depth: 3, dependents: 5, vulnerabilities: 0 },
      { name: 'setprototypeof', version: '1.2.0', type: 'safe', depth: 4, dependents: 2, vulnerabilities: 0 },
      { name: 'inherits', version: '2.0.4', type: 'safe', depth: 4, dependents: 9, vulnerabilities: 0 },
      { name: 'toidentifier', version: '1.0.1', type: 'safe', depth: 4, dependents: 2, vulnerabilities: 0 },
      { name: 'iconv-lite', version: '0.4.24', type: 'safe', depth: 4, dependents: 3, vulnerabilities: 0 },
      { name: 'safer-buffer', version: '2.1.2', type: 'safe', depth: 5, dependents: 4, vulnerabilities: 0 },
      { name: 'send', version: '0.18.0', type: 'safe', depth: 2, dependents: 2, vulnerabilities: 0 },
      { name: 'range-parser', version: '1.2.1', type: 'safe', depth: 3, dependents: 2, vulnerabilities: 0 },
      { name: 'escape-html', version: '1.0.3', type: 'safe', depth: 3, dependents: 3, vulnerabilities: 0 },
      { name: 'etag', version: '1.8.1', type: 'safe', depth: 3, dependents: 2, vulnerabilities: 0 },
    ];

    const generatedNodes: ConstellationNode[] = [];
    const count = packages.length;

    for (let i = 0; i < count; i++) {
      const pkg = packages[i];
      // Distribute along spherical spiral for balanced 3D depth
      const theta = (i / count) * Math.PI * 4.2;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const baseRadius = 145 + (pkg.depth * 18);

      generatedNodes.push({
        id: `node-${i}-${pkg.name}`,
        name: pkg.name,
        version: pkg.version,
        type: pkg.type,
        depth: pkg.depth,
        dependents: pkg.dependents,
        vulnerabilities: pkg.vulnerabilities,
        x: baseRadius * Math.sin(phi) * Math.cos(theta),
        y: baseRadius * Math.sin(phi) * Math.sin(theta) * 0.72,
        z: baseRadius * Math.cos(phi),
        radius: pkg.depth === 0 ? 5.5 : pkg.vulnerabilities > 0 ? 4.5 : 3.2,
      });
    }

    // Connect nodes into an acyclic dependency topology
    const generatedEdges: ConstellationEdge[] = [];
    for (let i = 0; i < generatedNodes.length; i++) {
      for (let j = i + 1; j < generatedNodes.length; j++) {
        const n1 = generatedNodes[i];
        const n2 = generatedNodes[j];
        // Connect if adjacent depths and within spatial proximity
        if (Math.abs(n1.depth - n2.depth) <= 1) {
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 125) {
            generatedEdges.push({
              source: i,
              target: j,
              pulseProgress: (i * 0.13 + j * 0.07) % 1,
              speed: 0.004 + Math.random() * 0.005,
            });
          }
        }
      }
    }

    nodesRef.current = generatedNodes;
    edgesRef.current = generatedEdges;
  }, []);

  // Handle Canvas Rendering & Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Color tokens
    const isDark = theme === 'dark';
    const safeColor = isDark ? '#6feec9' : '#0d9488';
    const warningColor = isDark ? '#ffd184' : '#d97706';
    const criticalColor = isDark ? '#ff6b4a' : '#e11d48';
    const threadColor = isDark ? 'rgba(111, 238, 201, 0.10)' : 'rgba(13, 148, 136, 0.12)';
    const threadActiveColor = isDark ? 'rgba(111, 238, 201, 0.28)' : 'rgba(13, 148, 136, 0.32)';
    const textFill = isDark ? '#dde2f6' : '#0f172a';

    const checkReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 600;
      const height = parent?.clientHeight || 480;

      // Smooth camera interpolation
      const rot = rotationRef.current;
      if (!checkReducedMotion) {
        rot.rotY += (rot.targetRotY - rot.rotY) * 0.04 + 0.0012;
        rot.rotX += (rot.targetRotX - rot.rotX) * 0.04;
      }

      ctx.clearRect(0, 0, width, height);

      const fov = 380;
      const cosY = Math.cos(rot.rotY);
      const sinY = Math.sin(rot.rotY);
      const cosX = Math.cos(rot.rotX);
      const sinX = Math.sin(rot.rotX);

      // Project 3D nodes to 2D
      const projected = nodesRef.current.map((node) => {
        // Rotate around Y
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.z * cosY + node.x * sinY;

        // Rotate around X
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + node.y * sinX;

        const distance = fov / (fov + z2 + 240);
        return {
          node,
          px: width / 2 + x1 * distance,
          py: height / 2 + y2 * distance,
          scale: distance,
          z: z2,
          radius: node.radius * distance,
        };
      });

      // Find node under mouse
      let foundHover: ConstellationNode | null = null;
      let foundPos: { x: number; y: number } | null = null;

      if (mouseRef.current.isHovering) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        for (let i = projected.length - 1; i >= 0; i--) {
          const p = projected[i];
          const dist = Math.hypot(p.px - mx, p.py - my);
          if (dist < Math.max(14, p.radius * 2.2)) {
            foundHover = p.node;
            foundPos = { x: p.px, y: p.py };
            break;
          }
        }
      }

      setHoveredNode(foundHover);
      setHoverPos(foundPos);

      // Draw Edges
      ctx.lineWidth = 1;
      for (const edge of edgesRef.current) {
        const p1 = projected[edge.source];
        const p2 = projected[edge.target];
        if (!p1 || !p2) continue;

        const isRelatedToHover =
          foundHover && (p1.node.id === foundHover.id || p2.node.id === foundHover.id);

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = isRelatedToHover ? threadActiveColor : threadColor;
        ctx.lineWidth = isRelatedToHover ? 1.5 : 0.8;
        ctx.stroke();

        // Edge signal pulse
        if (!checkReducedMotion) {
          edge.pulseProgress = (edge.pulseProgress + edge.speed) % 1;
          const pulseX = p1.px + (p2.px - p1.px) * edge.pulseProgress;
          const pulseY = p1.py + (p2.py - p1.py) * edge.pulseProgress;

          const isCriticalEdge = p1.node.type === 'critical' || p2.node.type === 'critical';
          const isWarningEdge = p1.node.type === 'warning' || p2.node.type === 'warning';

          ctx.beginPath();
          ctx.arc(pulseX, pulseY, isRelatedToHover ? 2.2 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isCriticalEdge
            ? criticalColor
            : isWarningEdge
            ? warningColor
            : safeColor;
          ctx.fill();
        }
      }

      // Draw Nodes sorted by depth (back-to-front)
      const sorted = [...projected].sort((a, b) => b.z - a.z);

      for (const p of sorted) {
        const node = p.node;
        const isHovered = foundHover && foundHover.id === node.id;
        const isRiskOnlyMode = nodeCountFilter === 'risks' && node.type === 'safe';

        if (isRiskOnlyMode) continue;

        let nodeColor = safeColor;
        if (node.type === 'warning') nodeColor = warningColor;
        if (node.type === 'critical') nodeColor = criticalColor;

        // Outer Halo / Glow
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.radius * (isHovered ? 3.0 : 2.0), 0, Math.PI * 2);
        ctx.fillStyle =
          node.type === 'critical'
            ? 'rgba(255, 107, 74, 0.16)'
            : node.type === 'warning'
            ? 'rgba(255, 209, 132, 0.14)'
            : 'rgba(111, 238, 201, 0.12)';
        ctx.fill();

        // Core Node
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(2, p.radius * (isHovered ? 1.4 : 1)), 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // High-importance or hovered node labels
        if ((isHovered || (node.depth <= 1 && p.scale > 0.85)) && !isRiskOnlyMode) {
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillStyle = textFill;
          ctx.fillText(node.name, p.px + 8, p.py + 4);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [theme, nodeCountFilter]);

  // Handle Mouse Events for Pan & Tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    rotationRef.current.targetRotY = nx * 0.75;
    rotationRef.current.targetRotX = 0.15 + ny * 0.45;

    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    rotationRef.current.targetRotY = 0;
    rotationRef.current.targetRotX = 0.15;
    mouseRef.current.isHovering = false;
    setHoveredNode(null);
  }, []);

  const resetView = () => {
    rotationRef.current = { rotX: 0.15, rotY: 0, targetRotX: 0.15, targetRotY: 0 };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[420px] lg:h-[480px] rounded-2xl bg-surface-container-low/70 border border-outline-variant/40 overflow-hidden shadow-sm backdrop-blur-xs flex flex-col justify-between"
    >
      {/* Top Header Controls Bar */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-outline-variant/30 bg-surface-container-lowest/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <div>
            <span className="font-headline-sm text-xs sm:text-sm font-semibold text-on-surface">
              Live Dependency Topology
            </span>
            <span className="hidden sm:inline-block ml-2 text-outline font-code-sm text-[11px]">
              (32 Connected Packages • Acyclic Representation)
            </span>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setNodeCountFilter(nodeCountFilter === 'all' ? 'risks' : 'all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-code-sm transition-colors border cursor-pointer ${
              nodeCountFilter === 'risks'
                ? 'bg-critical/15 text-critical border-critical/40'
                : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
            }`}
          >
            {nodeCountFilter === 'risks' ? 'Showing Risks Only' : 'Filter Risks'}
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1.5 rounded-md bg-surface-container text-outline hover:text-on-surface border border-outline-variant/40 transition-colors cursor-pointer"
            title="Reset Perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Floating Tooltip for Hovered Node */}
        {hoveredNode && hoverPos && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-lg bg-surface-container-high border border-outline-variant/60 shadow-xl backdrop-blur-md text-xs min-w-[200px] animate-fade-in"
            style={{
              left: Math.min(Math.max(10, hoverPos.x + 12), (containerRef.current?.clientWidth || 400) - 220),
              top: Math.min(Math.max(10, hoverPos.y - 45), (containerRef.current?.clientHeight || 400) - 120),
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-outline-variant/30 font-code-sm">
              <span className="font-semibold text-on-surface">{hoveredNode.name}</span>
              <span className="text-outline text-[11px]">v{hoveredNode.version}</span>
            </div>
            <div className="space-y-1 font-body-sm text-[11px] text-on-surface-variant">
              <div className="flex items-center justify-between">
                <span>Graph Depth:</span>
                <span className="font-code-sm text-on-surface">Level {hoveredNode.depth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Downstream Reach:</span>
                <span className="font-code-sm text-on-surface">{hoveredNode.dependents} dependents</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                <span>Status:</span>
                <span
                  className={`font-code-sm font-semibold uppercase text-[10px] ${
                    hoveredNode.type === 'critical'
                      ? 'text-critical'
                      : hoveredNode.type === 'warning'
                      ? 'text-warning'
                      : 'text-primary'
                  }`}
                >
                  {hoveredNode.type === 'critical'
                    ? 'Known Vulnerability'
                    : hoveredNode.type === 'warning'
                    ? 'Advisory Vector'
                    : 'Verified Healthy'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legend HUD */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-outline-variant/30 bg-surface-container-lowest/70 backdrop-blur-sm text-[11px] font-code-sm text-on-surface-variant">
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" /> Verified Clean
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" /> Advisory Vector
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-critical" /> Critical Blast Radius
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-outline text-[10px]">
          <Activity className="w-3 h-3 text-primary" />
          <span>Interactive Orbit: Move cursor to rotate topology</span>
        </div>
      </div>
    </div>
  );
};

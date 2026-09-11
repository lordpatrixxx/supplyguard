import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Node3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  label?: string;
  type: 'safe' | 'warning' | 'critical';
}

interface Edge3D {
  source: number;
  target: number;
  pulseProgress?: number;
}

export const DependencyConstellation3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 540);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initial 3D Cluster Nodes
    const samplePackages = [
      { name: 'app-gateway', type: 'safe' },
      { name: 'express', type: 'safe' },
      { name: 'jsonwebtoken', type: 'safe' },
      { name: 'lodash', type: 'warning' },
      { name: 'axios', type: 'safe' },
      { name: 'qs', type: 'critical' },
      { name: 'body-parser', type: 'safe' },
      { name: 'cookie-parser', type: 'safe' },
      { name: 'semver', type: 'safe' },
      { name: 'debug', type: 'safe' },
      { name: 'mime-types', type: 'safe' },
      { name: 'safe-buffer', type: 'safe' },
      { name: 'ms', type: 'safe' },
      { name: 'validator', type: 'warning' },
    ];

    const nodeCount = 28;
    const nodes: Node3D[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const pkg = samplePackages[i % samplePackages.length];
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 160 + Math.random() * 110;

      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: (radius * Math.sin(phi) * Math.sin(theta)) * 0.75,
        z: radius * Math.cos(phi),
        radius: i < samplePackages.length ? 4.5 : 2.5,
        label: i < 8 ? pkg.name : undefined,
        type: pkg.type as 'safe' | 'warning' | 'critical',
      });
    }

    // Connect nodes into an acyclic dependency graph
    const edges: Edge3D[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 130) {
          edges.push({
            source: i,
            target: j,
            pulseProgress: Math.random(),
          });
        }
      }
    }

    let rotY = 0;
    let rotX = 0.2;
    let targetRotY = 0;
    let targetRotX = 0.2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / width - 0.5;
      const ny = (e.clientY - rect.top) / height - 0.5;
      targetRotY = nx * 0.8;
      targetRotX = 0.2 + ny * 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Color palette based on theme
    const isDark = theme === 'dark';
    const safeColor = isDark ? '#4fd1ae' : '#0d9488';
    const warningColor = isDark ? '#f2b84b' : '#d97706';
    const criticalColor = isDark ? '#ff6b4a' : '#e11d48';
    const threadColor = isDark ? 'rgba(111, 238, 201, 0.12)' : 'rgba(13, 148, 136, 0.14)';
    const textColor = isDark ? '#dde2f6' : '#0f172a';

    const render = () => {
      // Smooth rotation with slight continuous spin
      rotY += (targetRotY - rotY) * 0.05 + 0.0015;
      rotX += (targetRotX - rotX) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const fov = 400;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project 3D to 2D
      const projected = nodes.map((node) => {
        // Rotate around Y
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;

        // Rotate around X
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        const distance = fov / (fov + z2 + 250);
        return {
          px: width / 2 + x1 * distance,
          py: height / 2 + y2 * distance,
          scale: distance,
          z: z2,
          type: node.type,
          label: node.label,
          radius: node.radius * distance,
        };
      });

      // Draw Edges
      ctx.lineWidth = 1;
      for (const edge of edges) {
        const p1 = projected[edge.source];
        const p2 = projected[edge.target];

        // Edge line
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = threadColor;
        ctx.stroke();

        // Traveling risk/signal pulse
        if (edge.pulseProgress !== undefined) {
          edge.pulseProgress = (edge.pulseProgress + 0.008) % 1;
          const pulseX = p1.px + (p2.px - p1.px) * edge.pulseProgress;
          const pulseY = p1.py + (p2.py - p1.py) * edge.pulseProgress;

          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = p1.type === 'critical' ? criticalColor : safeColor;
          ctx.fill();
        }
      }

      // Draw Nodes sorted by depth (back to front)
      const sortedIndices = projected
        .map((p, index) => ({ p, index }))
        .sort((a, b) => b.p.z - a.p.z);

      for (const { p } of sortedIndices) {
        let color = safeColor;
        if (p.type === 'warning') color = warningColor;
        if (p.type === 'critical') color = criticalColor;

        // Halo
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'critical' ? 'rgba(255,107,74,0.18)' : 'rgba(79,209,174,0.12)';
        ctx.fill();

        // Core Node
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(1.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Optional Node Label for focal dependencies
        if (p.label && p.scale > 0.85) {
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillStyle = textColor;
          ctx.fillText(p.label, p.px + 9, p.py + 4);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [theme]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex items-center justify-center overflow-hidden rounded-xl bg-surface-container-lowest/60 border border-outline-variant/40">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle Overlay Status HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container-high/80 border border-outline-variant/50 backdrop-blur-sm pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="font-code-sm text-[11px] text-on-surface uppercase tracking-wider">
          Constellation Map: Active Topology
        </span>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-3 px-3 py-1.5 rounded bg-surface-container-high/80 border border-outline-variant/50 backdrop-blur-sm text-[11px] font-code-sm text-on-surface-variant pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Transitive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Advisory Vector
        </span>
      </div>
    </div>
  );
};

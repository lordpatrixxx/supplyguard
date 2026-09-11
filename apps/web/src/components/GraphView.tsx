import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { PackageNode, GraphEdge } from '../types'

interface GraphViewProps {
  packages: PackageNode[]
  edges: GraphEdge[]
  onNodeClick: (pkg: PackageNode) => void
  selectedPkg?: PackageNode | null
  initialSearchQuery?: string
}

interface GraphNode {
  id: string
  name: string
  pkg?: PackageNode
  val: number
  color: string
}

interface GraphLink {
  source: string
  target: string
}

const tierColors = {
  critical: '#ff6b4a',
  medium: '#f2b84b',
  safe: '#4fd1ae',
}

export function GraphView({ packages, edges, onNodeClick, selectedPkg, initialSearchQuery = '' }: GraphViewProps) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 580 })

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [highFanOutOnly, setHighFanOutOnly] = useState(false)
  const [transitiveOnly, setTransitiveOnly] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'force' | 'cluster'>('force')

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery)
    }
  }, [initialSearchQuery])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 520),
        })
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const graphData = useMemo(() => {
    // Build root node
    const nodes: GraphNode[] = [
      { id: 'root', name: 'Root Manifest', val: 14, color: '#6feec9' },
    ]

    const filteredPkgs = packages.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesCve = p.vulnerabilities.some(v => v.id.toLowerCase().includes(q) || v.summary.toLowerCase().includes(q))
        if (!matchesName && !matchesCve) return false
      }
      if (criticalOnly && p.riskTier !== 'critical') {
        return false
      }
      if (highFanOutOnly && (p.dependentCount ?? 0) < 3) {
        return false
      }
      if (transitiveOnly && p.isDirect) {
        return false
      }
      return true
    })

    for (const pkg of filteredPkgs) {
      const nodeId = pkg.id || pkg.name
      nodes.push({
        id: nodeId,
        name: pkg.name,
        pkg,
        val: pkg.riskTier === 'critical' ? 10 : pkg.riskTier === 'medium' ? 7 : 4,
        color: tierColors[pkg.riskTier],
      })
    }

    const nodeIds = new Set(nodes.map((n) => n.id))

    // Edges might refer to unique pkg.id or legacy pkg.name; handle both gracefully
    const links: GraphLink[] = edges
      .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map((e) => ({ source: e.from, target: e.to }))

    return { nodes, links }
  }, [packages, edges, searchQuery, criticalOnly, highFanOutOnly, transitiveOnly])

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.pkg) {
        onNodeClick(node.pkg)
      }
    },
    [onNodeClick]
  )

  const handleZoomIn = () => {
    if (graphRef.current) {
      const zoom = graphRef.current.zoom()
      graphRef.current.zoom(zoom * 1.3, 300)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const zoom = graphRef.current.zoom()
      graphRef.current.zoom(zoom / 1.3, 300)
    }
  }

  const handleFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50)
    }
  }

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* ── Controls & Scope Toolbar (Stitch Refined Dashboard Specification) ── */}
      <div className="bg-surface-container-low p-space-sm rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-space-sm border border-surface-variant">
        {/* Filter Inputs */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-primary">
              filter_alt
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter packages/CVEs..."
              className="h-8 bg-surface-container-highest pl-8 pr-7 rounded font-code-sm text-code-sm text-on-surface focus:outline-none ring-1 ring-primary/40 focus:ring-primary w-40 sm:w-52 border-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-outline hover:text-on-surface cursor-pointer bg-transparent border-none"
              >
                close
              </button>
            )}
          </div>

          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`flex items-center gap-space-xs px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-all cursor-pointer border-none ${
              criticalOnly
                ? 'bg-error-container text-on-error-container ring-1 ring-error'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
            Critical Only
          </button>

          <button
            onClick={() => setHighFanOutOnly(!highFanOutOnly)}
            className={`flex items-center gap-space-xs px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-colors cursor-pointer border-none ${
              highFanOutOnly
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
            title="Show nodes with >= 3 downstream dependents"
          >
            Fan-Out (&ge;3)
          </button>

          <button
            onClick={() => setTransitiveOnly(!transitiveOnly)}
            className={`flex items-center gap-space-xs px-2.5 py-1 rounded font-label-caps text-label-caps uppercase transition-colors cursor-pointer border-none ${
              transitiveOnly
                ? 'bg-tertiary-container text-on-tertiary'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Transitive Only
          </button>

          <div className="px-2 py-1 rounded bg-surface-dim font-code-sm text-code-sm text-outline flex items-center gap-1">
            <span>ecosystem:</span>
            <span className="text-on-surface font-medium">npm</span>
          </div>
        </div>

        {/* View Manipulation & Canvas Options */}
        <div className="flex items-center gap-space-xs">
          <div className="flex items-center bg-surface-container rounded p-0.5">
            <button
              onClick={() => setLayoutMode('force')}
              className={`px-2 py-1 rounded font-code-sm text-code-sm transition-all cursor-pointer border-none ${
                layoutMode === 'force' ? 'text-on-surface bg-surface-container-highest font-medium' : 'text-outline bg-transparent'
              }`}
            >
              Force Map
            </button>
            <button
              onClick={() => setLayoutMode('cluster')}
              className={`px-2 py-1 rounded font-code-sm text-code-sm transition-all cursor-pointer border-none ${
                layoutMode === 'cluster' ? 'text-on-surface bg-surface-container-highest font-medium' : 'text-outline bg-transparent'
              }`}
            >
              Clustered
            </button>
          </div>

          <button
            onClick={handleFit}
            className="w-7 h-7 flex items-center justify-center bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer border-none"
            title="Reset Zoom"
          >
            <span className="material-symbols-outlined text-[16px]">fit_screen</span>
          </button>

          <div className="h-4 w-px bg-surface-variant mx-1"></div>
          <div className="flex items-center gap-1.5 font-label-caps text-label-caps text-outline">
            <span>Visual:</span>
            <span className="text-primary-container font-code-sm text-code-sm">2D Force</span>
          </div>
        </div>
      </div>

      {/* ── Main Risk Constellation Canvas ── */}
      <div className="relative w-full h-[620px] bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between p-space-md select-none border border-surface-variant">
        {/* Subtle Grid Matrix Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2f3544_1px,transparent_1px)] [background-size:24px_24px]"></div>

        {/* Topology Status HUD Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-space-sm bg-surface-container/90 backdrop-blur px-space-sm py-1 rounded-md border border-surface-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-code-sm text-code-sm text-on-surface font-semibold tracking-tight">
              DEPENDENCY TOPOLOGY
            </span>
            <span className="text-outline font-label-caps text-label-caps uppercase bg-surface-dim px-1.5 py-0.5 rounded">
              {Math.max(0, graphData.nodes.length - 1)} Nodes Visible
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded bg-surface-container/90 hover:bg-surface-container-highest text-on-surface flex items-center justify-center text-[16px] cursor-pointer border-none shadow-sm transition-colors"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded bg-surface-container/90 hover:bg-surface-container-highest text-on-surface flex items-center justify-center text-[16px] cursor-pointer border-none shadow-sm transition-colors"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_out</span>
            </button>
            <button
              onClick={handleFit}
              className="w-8 h-8 rounded bg-surface-container/90 hover:bg-surface-container-highest text-on-surface flex items-center justify-center text-[16px] cursor-pointer border-none shadow-sm transition-colors"
              title="Fit Screen"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            </button>
          </div>
        </div>

        {/* ForceGraph2D Canvas */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#080e1c"
            nodeLabel={(node: any) => {
              const n = node as GraphNode
              return n.pkg
                ? `${n.name}@${n.pkg.version} — Score: ${n.pkg.riskScore}/100 (${n.pkg.riskTier.toUpperCase()})\nDependents: ${n.pkg.dependentCount ?? 0}`
                : n.name
            }}
            nodeColor={(node: any) => (node as GraphNode).color}
            nodeVal={(node: any) => (node as GraphNode).val}
            linkColor={() => '#242a39'}
            linkWidth={1.5}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
            cooldownTicks={120}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name
              const fontSize = 11 / globalScale
              ctx.font = `${fontSize}px JetBrains Mono, monospace`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'

              const isSelected = selectedPkg && (selectedPkg.id === node.id || selectedPkg.name === node.name)
              const isCrit = node.pkg && node.pkg.riskTier === 'critical'

              // Draw pulsing halo if critical or selected
              if (isCrit || isSelected) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, (node.val || 5) * 1.8, 0, 2 * Math.PI, false)
                ctx.strokeStyle = isCrit ? 'rgba(255, 107, 74, 0.5)' : 'rgba(111, 238, 201, 0.6)'
                ctx.lineWidth = 2 / globalScale
                ctx.stroke()
              }

              // Node name text
              if (globalScale > 0.8 || isCrit || isSelected) {
                ctx.fillStyle = isCrit ? '#ffb4a3' : isSelected ? '#6feec9' : '#bccac3'
                ctx.fillText(label, node.x, node.y + (node.val || 5) + 6 / globalScale)
              }
            }}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
          />
        </div>

        {/* Bottom HUD Bar & Legend */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-space-md pt-space-sm bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-auto">
          {/* Strict Visual Legend */}
          <div className="flex items-center gap-space-lg bg-surface-container/90 backdrop-blur px-space-md py-space-xs rounded-lg border border-surface-variant shadow-sm flex-wrap">
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20"></span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase">Safe (0-39)</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded-full bg-tertiary-container ring-2 ring-tertiary/20"></span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase">Medium (40-69)</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded-full bg-error ring-2 ring-error/30 animate-pulse"></span>
              <span className="font-label-caps text-label-caps text-error uppercase font-bold">Critical (70-100)</span>
            </div>
            <div className="h-3 w-px bg-surface-variant hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-space-md font-code-sm text-code-sm text-outline">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-on-surface"></span> Direct Edge</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-b border-dashed border-outline"></span> Transitive Path</span>
            </div>
          </div>

          {/* Focus Status pill */}
          <div className="flex items-center gap-space-xs font-code-sm text-code-sm bg-surface-dim/95 px-space-sm py-1 rounded border-l-2 border-primary-container shadow-sm">
            <span className="text-outline">Active Focus:</span>
            <span className={selectedPkg?.riskTier === 'critical' ? 'text-error font-semibold' : 'text-primary-container font-medium'}>
              {selectedPkg ? `${selectedPkg.name}@${selectedPkg.version}` : 'Select a node in constellation'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

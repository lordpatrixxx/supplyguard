import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { PackageNode, GraphEdge } from '../types'
import {
  Search, X, AlertTriangle, GitFork, Layers, Maximize,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react'

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

const tierColors: Record<string, string> = {
  critical: '#ff6b4a',
  high: '#f97316',
  medium: '#f2b84b',
  low: '#8ba0b5',
  safe: '#4fd1ae',
}

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: string
}

function FilterButton({ active, onClick, children, color = 'primary' }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-code-sm text-[11px] uppercase tracking-wider transition-all cursor-pointer border-none font-semibold ${
        active
          ? color === 'critical' ? 'bg-critical/15 text-critical ring-1 ring-critical/40' :
            color === 'warning' ? 'bg-warning/15 text-warning ring-1 ring-warning/40' :
            color === 'tertiary' ? 'bg-tertiary/15 text-tertiary ring-1 ring-tertiary/40' :
            'bg-primary/15 text-primary ring-1 ring-primary/40'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  )
}

export function GraphView({ packages, edges, onNodeClick, selectedPkg, initialSearchQuery = '' }: GraphViewProps) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 580 })

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [highOnly, setHighOnly] = useState(false)
  const [mediumOnly, setMediumOnly] = useState(false)
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
      if (criticalOnly && p.riskTier !== 'critical') return false
      if (highOnly && (p.riskTier !== 'high' && p.advisorySeverity !== 'HIGH')) return false
      if (mediumOnly && p.riskTier !== 'medium') return false
      if (highFanOutOnly && (p.dependentCount ?? 0) < 3) return false
      if (transitiveOnly && p.isDirect) return false
      return true
    })

    const isFiltered = Boolean(
      searchQuery.trim() || criticalOnly || highOnly || mediumOnly || highFanOutOnly || transitiveOnly
    )

    const matchedPkgIds = new Set<string>()
    for (const p of filteredPkgs) {
      matchedPkgIds.add(p.id || p.name)
    }

    const includedIds = new Set<string>(matchedPkgIds)
    includedIds.add('root')

    // In filtered mode, preserve ancestor links back to root so nodes remain connected
    if (isFiltered) {
      const parentMap = new Map<string, string[]>()
      for (const edge of edges) {
        const parents = parentMap.get(edge.to) || []
        parents.push(edge.from)
        parentMap.set(edge.to, parents)
      }

      const queue = Array.from(matchedPkgIds)
      const visited = new Set<string>(matchedPkgIds)

      while (queue.length > 0) {
        const current = queue.shift()!
        const parents = parentMap.get(current) || []
        for (const parent of parents) {
          includedIds.add(parent)
          if (!visited.has(parent)) {
            visited.add(parent)
            queue.push(parent)
          }
        }
      }
    }

    const packageMap = new Map(packages.map((p) => [p.id || p.name, p]))

    for (const id of includedIds) {
      if (id === 'root') continue
      const pkg = packageMap.get(id)
      if (!pkg) continue

      const isDirectMatch = matchedPkgIds.has(id)
      const color = tierColors[pkg.riskTier] || '#8ba0b5'
      nodes.push({
        id,
        name: pkg.name,
        pkg,
        val: pkg.riskTier === 'critical' ? 10 : pkg.riskTier === 'high' ? 8 : pkg.riskTier === 'medium' ? 6 : 4,
        color: isDirectMatch || !isFiltered ? color : '#556575',
      })
    }

    const links: GraphLink[] = edges
      .filter((e) => includedIds.has(e.from) && includedIds.has(e.to))
      .map((e) => ({ source: e.from, target: e.to }))

    return { nodes, links }
  }, [packages, edges, searchQuery, criticalOnly, highOnly, mediumOnly, highFanOutOnly, transitiveOnly])

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

  const handleReset = () => {
    setSearchQuery('')
    setCriticalOnly(false)
    setHighOnly(false)
    setMediumOnly(false)
    setHighFanOutOnly(false)
    setTransitiveOnly(false)
    setTimeout(() => handleFit(), 100)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Grouped Controls Toolbar ── */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 p-3">
          {/* SEARCH Group */}
          <div className="flex items-center gap-2">
            <span className="font-code-sm text-[10px] text-outline uppercase tracking-wider shrink-0 hidden sm:block">Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Packages / CVEs..."
                className="h-8 bg-surface-container-lowest pl-8 pr-8 rounded-lg font-code-sm text-xs text-on-surface focus:outline-none border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary w-44 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer bg-transparent border-none p-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-outline-variant/30 hidden sm:block" />

          {/* FILTERS Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-code-sm text-[10px] text-outline uppercase tracking-wider shrink-0 hidden sm:block mr-1">Filters</span>
            <FilterButton active={criticalOnly} onClick={() => setCriticalOnly(!criticalOnly)} color="critical">
              <AlertTriangle className="w-3 h-3" />
              Critical
            </FilterButton>
            <FilterButton active={highOnly} onClick={() => setHighOnly(!highOnly)} color="warning">
              High
            </FilterButton>
            <FilterButton active={mediumOnly} onClick={() => setMediumOnly(!mediumOnly)} color="tertiary">
              Medium
            </FilterButton>
            <FilterButton active={highFanOutOnly} onClick={() => setHighFanOutOnly(!highFanOutOnly)}>
              <GitFork className="w-3 h-3" />
              Fan-Out
            </FilterButton>
            <FilterButton active={transitiveOnly} onClick={() => setTransitiveOnly(!transitiveOnly)}>
              <Layers className="w-3 h-3" />
              Transitive
            </FilterButton>
          </div>

          <div className="h-6 w-px bg-outline-variant/30 hidden sm:block" />

          {/* VIEW Group */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="font-code-sm text-[10px] text-outline uppercase tracking-wider shrink-0 hidden sm:block mr-1">View</span>
            <div className="flex items-center bg-surface-container rounded-lg p-0.5">
              <button
                onClick={() => setLayoutMode('force')}
                className={`px-2.5 py-1 rounded-md font-code-sm text-[11px] transition-all cursor-pointer border-none ${
                  layoutMode === 'force' ? 'text-on-surface bg-surface-container-highest font-semibold' : 'text-outline bg-transparent hover:text-on-surface'
                }`}
              >
                Force
              </button>
              <button
                onClick={() => setLayoutMode('cluster')}
                className={`px-2.5 py-1 rounded-md font-code-sm text-[11px] transition-all cursor-pointer border-none ${
                  layoutMode === 'cluster' ? 'text-on-surface bg-surface-container-highest font-semibold' : 'text-outline bg-transparent hover:text-on-surface'
                }`}
              >
                Cluster
              </button>
            </div>

            <button onClick={handleFit} className="w-7 h-7 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none" title="Fit to Screen">
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleReset} className="w-7 h-7 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none" title="Reset All Filters">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer border-none" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Risk Constellation Canvas ── */}
      <div className="relative w-full h-[620px] bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between p-3 select-none border border-outline-variant/30">
        {/* Subtle Grid Matrix Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2f3544_1px,transparent_1px)] [background-size:24px_24px]"></div>

        {/* Topology Status HUD Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-surface-container/90 backdrop-blur px-3 py-1.5 rounded-lg border border-outline-variant/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-code-sm text-xs text-on-surface font-semibold tracking-tight">
              DEPENDENCY TOPOLOGY
            </span>
            <span className="text-outline font-code-sm text-[10px] uppercase bg-surface-dim px-1.5 py-0.5 rounded">
              {Math.max(0, graphData.nodes.length - 1)} Nodes
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-surface-container/90 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer border-none shadow-sm transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-surface-container/90 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer border-none shadow-sm transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={handleFit} className="w-8 h-8 rounded-lg bg-surface-container/90 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer border-none shadow-sm transition-colors" title="Fit to Screen">
              <Maximize className="w-4 h-4" />
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
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-auto">
          <div className="flex items-center gap-4 bg-surface-container/90 backdrop-blur px-3 py-1.5 rounded-lg border border-outline-variant/30 shadow-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20"></span>
              <span className="font-code-sm text-[10px] text-on-surface uppercase">Safe (0–39)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-tertiary-container ring-2 ring-tertiary/20"></span>
              <span className="font-code-sm text-[10px] text-on-surface uppercase">Medium (40–69)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-error ring-2 ring-error/30 animate-pulse"></span>
              <span className="font-code-sm text-[10px] text-error uppercase font-bold">Critical (70–100)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-code-sm text-xs bg-surface-dim/95 px-3 py-1.5 rounded-lg border-l-2 border-primary shadow-sm">
            <span className="text-outline">Focus:</span>
            <span className={selectedPkg?.riskTier === 'critical' ? 'text-critical font-semibold' : 'text-primary font-medium'}>
              {selectedPkg ? `${selectedPkg.name}@${selectedPkg.version}` : 'Select a node'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

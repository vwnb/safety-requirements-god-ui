import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant
} from "reactflow"
import type { FitViewOptions, Viewport } from "reactflow"
import type { Node, Edge } from "reactflow"
import "reactflow/dist/style.css"
import dagre from "dagre"
import RelationTypePicker from "./RelationTypePicker"
import { useApiFetch } from "../lib/apiFetchContext"
import { typeColor } from "../App"
import background from "../assets/background.jpg";
import type { UserPresence } from "../types/collaboration";

type Revision = {
  id: string
  conceptId: string
  markdown: string
  createdAt: string
}

type Concept = {
  id: string
  key?: string
  title?: string
  type: string
}

type Relation = {
  id: string
  fromId: string
  toId: string
  type: string
}

const nodeWidth = 220
const nodeHeight = 80

function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 120, ranksep: 140 })

  nodes.forEach((n) => {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((e) => {
    g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id)

    return {
      ...n,
      position: pos
        ? {
          x: pos.x - nodeWidth / 2,
          y: pos.y - nodeHeight / 2,
        }
        : n.position,
    }
  })

  return { nodes: layoutedNodes, edges }
}

function ConceptNode({ data, id }: any) {
  const [showExcerpt, setShowExcerpt] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setShowExcerpt(true)
    }, 2000)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setShowExcerpt(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <div
      data-agent={`graph-node-${id}`}
      className="graph-node"
      style={{
        background: data.color || "white",
        width: nodeWidth,
        display: "flex",
        flexDirection: "column"
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div data-agent="graph-node-label" style={{ fontWeight: "bold" }}>
        {data.label}
      </div>
      <div data-agent="graph-node-type" style={{ opacity: 0.7 }}>{data.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: any) => l.toUpperCase())}</div>

      <div
        data-agent="graph-node-excerpt"
        className="graph-node-excerpt"
        style={{
          boxSizing: "border-box",
          fontSize: 10,
          color: "#333",
          overflow: "hidden",
          maxHeight: showExcerpt ? 200 : 0,
          marginTop: showExcerpt ? 0 : -10,
          transition: "max-height 1s ease, margin-top 1s ease",
        }}
      >
        {data.excerpt}
      </div>

      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
}

const cursorSize = 40

const nodeTypes = {
  concept: ConceptNode,
}

export default function GraphView({
  concepts,
  revisions,
  relations,
  onRelationCreated,
  onNodeClick,
  API,
  loading,
  presences,
  currentUserId,
  onViewportChange,
}: {
  concepts: Concept[]
  revisions: Revision[]
  relations: Relation[]
  onRelationCreated: () => void
  onNodeClick?: (conceptId: string) => void
  API: string
  loading?: boolean
  presences: UserPresence[]
  currentUserId: string
  onViewportChange: (viewport: Viewport) => void
}) {
  const apiFetch = useApiFetch()
  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Track container size for clamping cursor positions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  const deleteRelation = useCallback(
    async (relationId: string) => {
      if (graphLoading) return
      setGraphLoading(true)

      try {
        await apiFetch(`${API}/relations/${relationId}`, {
          method: "DELETE",
        })
        onRelationCreated()
      } finally {
        setGraphLoading(false)
      }
    },
    [API, apiFetch, graphLoading, onRelationCreated]
  )

  const conceptMap = useMemo(() => {
    const m = new Map<string, Concept>()
    concepts.forEach((c) => m.set(c.id, c))
    return m
  }, [concepts])

  const latestRevisionByConcept = useMemo(() => {
    const m = new Map<string, Revision>()
    revisions.forEach((r) => {
      const existing = m.get(r.conceptId)
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        m.set(r.conceptId, r)
      }
    })
    return m
  }, [revisions])

  const nodes: Node[] = useMemo(() => {
    return revisions.map((r) => {
      const concept = conceptMap.get(r.conceptId)
      const latestRev = latestRevisionByConcept.get(r.conceptId)

      return {
        id: r.id,
        type: "concept",
        data: {
          label: concept?.title || r.markdown.slice(0, 40),
          type: concept?.type,
          color: typeColor[concept?.type || ""],
          conceptId: r.conceptId,
          excerpt: latestRev?.markdown?.slice(0, 120) + "..."
        },
        position: { x: 0, y: 0 },
      }
    })
  }, [revisions, conceptMap, latestRevisionByConcept])

  const edges: Edge[] = useMemo(() => {
    return relations.map((r) => ({
      id: r.id,
      source: r.fromId,
      target: r.toId,
      label: hoveredEdgeId === r.id ? "×" : r.type,
      labelBgPadding: [8, 4],
      animated: r.type === "VIOLATES",
      style: {
        stroke:
          r.type === "VIOLATES"
            ? "#ef4444"
            : r.type === "MITIGATES"
              ? "#22c55e"
              : "#555",
        strokeWidth: hoveredEdgeId === r.id ? 3 : 1,
      },
      labelStyle: {
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: "bold",
        fill:
          r.type === "VIOLATES"
            ? "#ef4444"
            : r.type === "MITIGATES"
              ? "#22c55e"
              : "#555",
        opacity: hoveredEdgeId === r.id ? 1 : 0.7,
      },
      ...(hoveredEdgeId === r.id && {
        labelStyle: {
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: "bold",
          fill:
            r.type === "VIOLATES"
              ? "#ef4444"
              : r.type === "MITIGATES"
                ? "#22c55e"
                : "#555",
          opacity: 1,
        },
        fontSize: 12,
        fontWeight: "bold",
        opacity: hoveredEdgeId === r.id ? 1 : 0.7,
      }),
    }))
  }, [relations, hoveredEdgeId])

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return layoutGraph(nodes, edges)
  }, [nodes, edges])

  // Convert graph-space coordinates to screen-space within container
  const graphToScreen = useCallback((graphX: number, graphY: number): { x: number; y: number } => {
    const { x, y, zoom } = viewport
    return {
      x: graphX * zoom + x,
      y: graphY * zoom + y,
    }
  }, [viewport])

  // Clamp screen coordinates to container bounds
  const clampToContainer = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    const halfCursor = cursorSize / 2
    return {
      x: Math.max(halfCursor, Math.min(containerSize.width - halfCursor, screenX)),
      y: Math.max(halfCursor, Math.min(containerSize.height - halfCursor, screenY)),
    }
  }, [containerSize.width, containerSize.height])

  // Graph key to force re-initialization when data changes (e.g., template import)
  const graphKey = `${layoutedNodes.length}-${layoutedEdges.length}`

  const fitViewOptions: FitViewOptions = {
    padding: 0.2,
    minZoom: 0.05,
    maxZoom: 1.5,
  }

  return (
    <>
      <div
        ref={containerRef}
        data-agent="graph-view-container"
        className={loading ? "graph-background-fade-in" : ""}
        style={{
          boxSizing: "border-box",
          top: "20px",
          width: "100%",
          border: "2px solid black",
          background: `linear-gradient(rgba(244, 143, 237, 0.2), rgba(184, 241, 241, 0.2)), url(${background})`,
          backgroundSize: "cover, cover",
          backgroundPosition: "center",
          backgroundBlendMode: "color-dodge",
          opacity: loading ? 0 : 1,
        }}
      >
        {(graphLoading || loading) && (
          <div
            data-agent="graph-submit-loading"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(233, 237, 233, 0.3)",
              zIndex: 10,
              display: "grid",
              placeItems: "center",
              fontFamily: "monospace",
              fontWeight: "bold",
              pointerEvents: "none",
              fontSize: 18,
              color: "#333",
            }}
          >
            Loading graph...
          </div>
        )}

        <ReactFlow
          key={graphKey}
          className="react-flow"
          data-agent="react-flow"
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          nodeExtent={[[0, 0], [3000, 3000]]}
          onMove={(_, newViewport) => setViewport(newViewport)}
          onMoveEnd={(_, viewport) => {
            setViewport(viewport)
            // Convert viewport center to graph-space coordinates
            const container = containerRef.current
            if (container) {
              const rect = container.getBoundingClientRect()
              const centerX = (rect.width / 2 - viewport.x) / viewport.zoom
              const centerY = (rect.height / 2 - viewport.y) / viewport.zoom
              onViewportChange({ x: centerX, y: centerY, zoom: viewport.zoom })
            }
          }}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onNodeClick={(_, node) => {
            if (onNodeClick && node.data.conceptId) {
              onNodeClick(node.data.conceptId)
            }
          }}
          onEdgeClick={(_, edge) => {
            if (!graphLoading) {
              deleteRelation(edge.id)
            }
          }}
          onConnect={(params) => {
            if (!params.source || !params.target) return

            setPendingConnection({
              from: params.source,
              to: params.target,
            })
          }}
        >
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Cross} />
        </ReactFlow>

        {/* User circles - absolutely positioned elements that move with graph viewport, fixed size */}
        {presences
          .filter((p) => p.viewportX != null && p.viewportY != null && p.userId !== currentUserId)
          .map((p) => {
            const { x: rawX, y: rawY } = graphToScreen(p.viewportX!, p.viewportY!)
            const { x: screenX, y: screenY } = clampToContainer(rawX, rawY)
            return (
              <div
                key={p.userId}
                className="user-cursor-circle"
                title={p.userName || p.userId}
                style={{
                  position: "absolute" as const,
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  transform: "translate(-50%, -50%)",
                  width: cursorSize,
                  height: cursorSize,
                  borderRadius: "50%",
                  background: "white",
                  border: "2px solid black",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: "bold",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              >
                {(p.userName || p.userId).slice(0, 2).toUpperCase()}
              </div>
            )
          })}
      </div>

      {pendingConnection && (
        <RelationTypePicker
          onSelect={async (type) => {
            if (graphLoading) return
            setGraphLoading(true)

            try {
              await apiFetch(`${API}/relations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fromId: pendingConnection.from,
                  toId: pendingConnection.to,
                  type,
                }),
              })

              setPendingConnection(null)
              onRelationCreated()
            } finally {
              setGraphLoading(false)
            }
          }}
          onClose={() => setPendingConnection(null)}
        />
      )}
    </>
  )
}
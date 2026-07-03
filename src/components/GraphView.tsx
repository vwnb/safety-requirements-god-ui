import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant
} from "reactflow"
import type { FitViewOptions, Viewport, ReactFlowInstance } from "reactflow"
import type { Node, Edge } from "@reactflow/core"
import "reactflow/dist/style.css"
import dagre from "dagre"
import RelationTypePicker from "./RelationTypePicker"
import QueryPicker from "./QueryPicker"
import { useApiFetch } from "../lib/apiFetchContext"
import { brutal, typeColor } from "../App"
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

type VisibilityQueryType =
  | "NONE"
  | "CHANGE_PROPAGATION"
  | "IMPLEMENTATION_COVERAGE"
  | "IMPACT_ANALYSIS"
  | "VERIFICATION_STATUS"
  | "SAFETY_RATIONALE"
  | "REQUIREMENT_DECOMPOSITION"

const VISIBILITY_QUERIES: Array<{ value: VisibilityQueryType; label: string }> = [
  { value: "CHANGE_PROPAGATION", label: "Change propagation" },
  { value: "IMPACT_ANALYSIS", label: "Impact analysis" },
  { value: "IMPLEMENTATION_COVERAGE", label: "Implementation coverage" },
  { value: "VERIFICATION_STATUS", label: "Verification status" },
  { value: "SAFETY_RATIONALE", label: "Safety rationale" },
  { value: "REQUIREMENT_DECOMPOSITION", label: "Requirement decomposition" },
]

const implementationCoverageTypes = new Set([
  "FUNCTIONAL_SAFETY_REQUIREMENT",
  "TECHNICAL_SAFETY_REQUIREMENT",
  "SOFTWARE_REQUIREMENT",
  "SOFTWARE_SAFETY_REQUIREMENT",
  "HARDWARE_REQUIREMENT",
  "IMPLEMENTATION",
  "VERIFICATION",
  "VERIFICATION_REPORT",
  "VALIDATION_REPORT",
])

const verificationStatusTypes = new Set([
  "FUNCTIONAL_SAFETY_REQUIREMENT",
  "TECHNICAL_SAFETY_REQUIREMENT",
  "HARDWARE_REQUIREMENT",
  "SOFTWARE_REQUIREMENT",
  "HARDWARE_SAFETY_REQUIREMENT",
  "SOFTWARE_SAFETY_REQUIREMENT",
  "TEST_CASE",
  "TEST_RESULT",
  "PROOF_TEST",
  "VERIFICATION_REPORT",
])

const safetyRationaleTypes = new Set([
  "HAZARD",
  "SAFETY_GOAL",
  "SAFETY_CASE",
  "SAFETY_MANUAL",
  "ASSUMPTION",
  "CONSTRAINT",
])

const requirementDecompositionTypes = new Set([
  "FUNCTIONAL_SAFETY_REQUIREMENT",
  "TECHNICAL_SAFETY_REQUIREMENT",
  "HARDWARE_REQUIREMENT",
  "SOFTWARE_REQUIREMENT",
  "HARDWARE_SAFETY_REQUIREMENT",
  "SOFTWARE_SAFETY_REQUIREMENT",
])

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

function getVisibleSubgraph(
  queryType: VisibilityQueryType,
  sourceNodeId: string | null,
  nodes: Node[],
  edges: Edge[],
  conceptMap: Map<string, Concept>
) {
  if (queryType === "NONE" || !sourceNodeId) {
    return { nodes, edges }
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  if (!nodeById.has(sourceNodeId)) {
    return { nodes: [], edges: [] }
  }

  const neighborIds = (nodeId: string) => {
    return edges.reduce<string[]>((acc, e) => {
      if (e.source === nodeId) acc.push(e.target)
      if (e.target === nodeId) acc.push(e.source)
      return acc
    }, [])
  }

  const bfs = (includeNode: (node: Node) => boolean, traverseNode: (node: Node) => boolean) => {
    const visibleNodeIds = new Set<string>()
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      if (visibleNodeIds.has(current)) continue

      const currentNode = nodeById.get(current)
      if (!currentNode) continue

      if (traverseNode(currentNode)) {
        visibleNodeIds.add(current)
      }

      neighborIds(current).forEach((neighborId) => {
        if (visibleNodeIds.has(neighborId)) return
        const neighborNode = nodeById.get(neighborId)
        if (!neighborNode) return
        if (includeNode(neighborNode)) {
          queue.push(neighborId)
        }
      })
    }

    return visibleNodeIds
  }

  if (queryType === "CHANGE_PROPAGATION") {
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const visibleEdges = edges.filter((e) => {
      const matches = e.source === sourceNodeId || e.target === sourceNodeId
      if (matches) {
        visibleNodeIds.add(e.source)
        visibleNodeIds.add(e.target)
      }
      return matches
    })

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "IMPACT_ANALYSIS") {
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]
    while (queue.length) {
      const current = queue.shift()!
      if (visibleNodeIds.has(current)) continue
      visibleNodeIds.add(current)

      neighborIds(current).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          queue.push(neighborId)
        }
      })
    }

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "VERIFICATION_STATUS") {
    const visibleNodeIds = bfs(
      (node) => verificationStatusTypes.has(conceptMap.get(node.data.conceptId)?.type || ""),
      () => true
    )

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "SAFETY_RATIONALE") {
    const visibleNodeIds = bfs(
      (node) => safetyRationaleTypes.has(conceptMap.get(node.data.conceptId)?.type || ""),
      () => true
    )

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "REQUIREMENT_DECOMPOSITION") {
    const visibleNodeIds = bfs(
      (node) => requirementDecompositionTypes.has(conceptMap.get(node.data.conceptId)?.type || ""),
      () => true
    )

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "IMPLEMENTATION_COVERAGE") {
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!

      edges.forEach((e) => {
        const neighborId = e.source === current ? e.target : e.target === current ? e.source : null
        if (!neighborId || visibleNodeIds.has(neighborId)) return

        const neighborNode = nodeById.get(neighborId)
        if (!neighborNode) return

        const neighborConcept = conceptMap.get(neighborNode.data.conceptId)
        if (implementationCoverageTypes.has(neighborConcept?.type || "")) {
          visibleNodeIds.add(neighborId)
          queue.push(neighborId)
        }
      })
    }

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  return { nodes, edges }
}

function ConceptNode({ data, id }: any) {
  const [showHoverActions, setShowHoverActions] = useState(false)
  const hoverTimeoutRef = useRef<number | null>(null)

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowHoverActions(true)
    }, 250)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowHoverActions(false)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current)
      }
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
        style={{
          overflow: "hidden",
          maxHeight: showHoverActions ? 150 : 0,
          opacity: showHoverActions ? 1 : 0,
          transform: showHoverActions ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 0.5s ease, max-height 0.5s ease, transform 0.5s ease",
        }}
      >
        {data.onEditRevision && (
          <button
            data-agent="graph-node-edit-revision"
            onClick={(event) => {
              event.stopPropagation()
              data.onEditRevision()
            }}
            style={{
              ...brutal.button,
              width: "100%",
              marginTop: 8,
              padding: "8px 12px",
            }}
          >
            Edit latest revision
          </button>
        )}
        <button
          data-agent="graph-node-query"
          onClick={(event) => {
            event.stopPropagation()
            data.onOpenQueryModal?.()
          }}
          style={{
            ...brutal.button,
            width: "100%",
            marginTop: 8,
            padding: "8px 12px",
          }}
        >
          Query
        </button>
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
  workItemId,
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
  workItemId?: string
}) {
  const apiFetch = useApiFetch()
  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [activeQuery, setActiveQuery] = useState<VisibilityQueryType>("NONE")
  const [activeQuerySourceId, setActiveQuerySourceId] = useState<string | null>(null)
  const [queryModalSourceId, setQueryModalSourceId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const viewportRef = useRef(viewport)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const initialViewportSentRef = useRef(false)
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null)

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
      const isActiveQuerySource = activeQuerySourceId === r.id

      return {
        id: r.id,
        type: "concept",
        data: {
          label: concept?.title || r.markdown.slice(0, 40),
          type: concept?.type,
          color: typeColor[concept?.type || ""],
          conceptId: r.conceptId,
          excerpt: latestRev?.markdown?.slice(0, 120) + "...",
          queryValue: isActiveQuerySource ? activeQuery : "NONE",
          onQueryChange: (value: VisibilityQueryType) => {
            if (value === "NONE") {
              setActiveQuery("NONE")
              setActiveQuerySourceId(null)
            } else {
              setActiveQuery(value)
              setActiveQuerySourceId(r.id)
            }
          },
          onOpenQueryModal: () => setQueryModalSourceId(r.id),
          onEditRevision: onNodeClick ? () => onNodeClick(r.conceptId) : undefined,
        },
        position: { x: 0, y: 0 },
      }
    })
  }, [revisions, conceptMap, latestRevisionByConcept, activeQuery, activeQuerySourceId])

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

  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(() => {
    return getVisibleSubgraph(activeQuery, activeQuerySourceId, nodes, edges, conceptMap)
  }, [activeQuery, activeQuerySourceId, nodes, edges, conceptMap])

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return layoutGraph(visibleNodes, visibleEdges)
  }, [visibleNodes, visibleEdges])

  // Determine if we have any graph data to display. Rendering ReactFlow with
  // empty node/edge arrays can cause it to reset its internal state and, in
  // some edge‑cases, result in a completely blank canvas. By gating the
  // rendering until we have at least one node we avoid spurious re‑mounts that
  // were observed as "graph loading fails mysteriously".
  const hasGraphData = layoutedNodes.length > 0

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

  // Reset initial viewport sent flag when the graph re-initializes
  useEffect(() => {
    initialViewportSentRef.current = false
  }, [graphKey])

  // Send initial viewport coordinates once the graph has finished loading and fitView has completed
  useEffect(() => {
    if (loading || !reactFlowInstanceRef.current) return
    if (initialViewportSentRef.current) return
    // fitView triggers onMove which updates the viewport; we detect that via the state value
    if (viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1) return

    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      const centerX = (rect.width / 2 - viewport.x) / viewport.zoom
      const centerY = (rect.height / 2 - viewport.y) / viewport.zoom
      onViewportChange({ x: centerX, y: centerY, zoom: viewport.zoom })
      initialViewportSentRef.current = true
    }
  }, [loading, viewport])

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

        {(activeQuery !== "NONE" || activeQuerySourceId) && (
          <button
            data-agent="graph-show-all-button"
            onClick={() => {
              setActiveQuery("NONE")
              setActiveQuerySourceId(null)
            }}
            style={{
              ...brutal.button,
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 12,
              padding: "8px 12px",
              margin: 0,
            }}
          >
            Show all
          </button>
        )}

        {queryModalSourceId && (
          <QueryPicker
            sourceName={
              conceptMap.get(
                nodes.find((n) => n.id === queryModalSourceId)?.data.conceptId || ""
              )?.key || "Unknown"
            }
            options={[
              { value: "NONE", label: "Show all" },
              ...VISIBILITY_QUERIES,
            ]}
            onSelect={(value) => {
              if (value === "NONE") {
                setActiveQuery("NONE")
                setActiveQuerySourceId(null)
              } else {
                setActiveQuery(value as VisibilityQueryType)
                setActiveQuerySourceId(queryModalSourceId)
              }
              setQueryModalSourceId(null)
            }}
            onClose={() => setQueryModalSourceId(null)}
          />
        )}

        {hasGraphData && (
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
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance
            }}
            onMove={(_, newViewport) => {
              viewportRef.current = newViewport
              setViewport(newViewport)
            }}
            onMoveEnd={(_, viewport) => {
              setViewport(viewport)
              viewportRef.current = viewport
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
        )}

        {/* User circles - absolutely positioned elements that move with graph viewport, fixed size */}
        {presences
          .filter((p) => {
            // Only show cursor for users in the same work item
            // - browsing_graph users must have matching workItemId context
            // - editing users on concepts/revisions/work_items in this work item
            if (p.userId === currentUserId) return false
            if (p.viewportX == null || p.viewportY == null) return false
            if (!workItemId) return false

            // If browsing graph, check context matches
            if (p.status === "browsing_graph") {
              return p.contextId === workItemId
            }
            // For editing statuses, check if context matches current work item
            if (p.status === "editing_concept" || p.status === "editing_revision" || p.status === "editing_work_item") {
              return p.contextId === workItemId
            }
            return false
          })
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
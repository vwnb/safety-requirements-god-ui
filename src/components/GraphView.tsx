import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import ReactFlow, {
  Background,
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
  // Traceability
  | "TRACEABILITY_PATH"
  | "UPSTREAM_TRACEABILITY"
  | "DOWNSTREAM_TRACEABILITY"
  // Impact
  | "CHANGE_PROPAGATION"
  | "IMPACT_ANALYSIS"
  | "DEPENDENCY_CYCLE"
  | "FAN_IN_OUT"
  // Missing evidence
  | "MISSING_VERIFICATION"
  | "UNVERIFIED_REQUIREMENTS"
  | "ORPHANED_NODES"
  // Implementation progress
  | "IMPLEMENTATION_COVERAGE"
  | "IMPLEMENTATION_GAP"
  | "VERIFICATION_STATUS"
  // Architectural weaknesses
  | "ARCHITECTURE_LAYERS"
  | "SINGLE_POINT_OF_FAILURE"
  // Audit preparation
  | "AUDIT_TRAIL"
  | "COMPLIANCE_GAPS"
  // Safety cases
  | "SAFETY_RATIONALE"
  | "SAFETY_CASE_STRUCTURE"
  | "HAZARD_MITIGATION"
  // Lifecycle completeness
  | "REQUIREMENT_DECOMPOSITION"
  | "LIFECYCLE_COVERAGE"
  // Navigation
  | "NEIGHBORHOOD"
  | "CONNECTED_COMPONENT"
  | "BREADTH_FIRST"

type QueryCategory = {
  category: string
  options: Array<{ value: VisibilityQueryType; label: string }>
}

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

type GraphNode = {
  id: string
  conceptId: string
}

type GraphEdge = {
  id: string
  fromId: string
  toId: string
  type: string
}

type QueryExplanation = {
  title: string
  content: string
}

type QueryResult = {
  queryType: VisibilityQueryType
  sourceRevisionId: string | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  explanations: QueryExplanation | null
  categories: QueryCategory[]
}

function ConceptNode({ data, id }: any) {
  const [showActions, setShowActions] = useState(false)
  const typeLabel = data.type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l: any) => l.toUpperCase())

  const isQuerySource = data.queryValue && data.queryValue !== "NONE"

  return (
    <div
      data-agent={`graph-node-${id}`}
      className="graph-node"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        background: data.color || "white",
        width: nodeWidth,
        display: "flex",
        flexDirection: "column",
        border: isQuerySource ? "4px solid #ff5a00" : undefined,
      }}
    >
      <div data-agent="graph-node-label" style={{ fontWeight: "bold" }}>
        {data.label}
      </div>
      <div
        data-agent="graph-node-type"
        style={{
          opacity: 0.7,
          position: "relative",
          minHeight: 24,
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 180ms ease, opacity 180ms ease",
            transform: showActions ? "translateX(-8px)" : "translateX(0)",
            opacity: showActions ? 0 : 1,
            pointerEvents: showActions ? "none" : "auto",
          }}
        >
          {typeLabel}
        </span>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: showActions
              ? "translateY(-50%) translateX(0)"
              : "translateY(-50%) translateX(8px)",
            opacity: showActions ? 1 : 0,
            pointerEvents: showActions ? "auto" : "none",
            display: "flex",
            gap: 6,
            flexWrap: "nowrap",
            transition: "transform 180ms ease, opacity 180ms ease",
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
                padding: "4px 8px",
                fontSize: 11,
                whiteSpace: "nowrap",
              }}
            >
              Edit
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
              padding: "4px 8px",
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            Query
          </button>
        </div>
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
  projectTitle,
  workItemId,
  workItemTitle,
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
  projectTitle?: string
  workItemId?: string
  workItemTitle?: string
}) {
  const apiFetch = useApiFetch()
  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)
  const [pendingDeleteRelationId, setPendingDeleteRelationId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [activeQuery, setActiveQuery] = useState<VisibilityQueryType>("NONE")
  const [activeQuerySourceId, setActiveQuerySourceId] = useState<string | null>(null)
  const [queryModalSourceId, setQueryModalSourceId] = useState<string | null>(null)
  const [queryCategories, setQueryCategories] = useState<QueryCategory[]>([])
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const deleteConfirmRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target as globalThis.Node)) {
        setPendingDeleteRelationId(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
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
          label: concept?.key + " - " + concept?.title,
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

  const pendingDeleteRelation = pendingDeleteRelationId
    ? relations.find((r) => r.id === pendingDeleteRelationId)
    : undefined

  const pendingDeleteSourceLabel = useMemo(() => {
    if (!pendingDeleteRelation) return ""
    const fromRevision = revisions.find((r) => r.id === pendingDeleteRelation.fromId)
    const concept = fromRevision ? conceptMap.get(fromRevision.conceptId) : undefined
    return concept?.key || ""
  }, [pendingDeleteRelation, revisions, conceptMap])

  const pendingDeleteTargetLabel = useMemo(() => {
    if (!pendingDeleteRelation) return ""
    const toRevision = revisions.find((r) => r.id === pendingDeleteRelation.toId)
    const concept = toRevision ? conceptMap.get(toRevision.conceptId) : undefined
    return concept?.key || ""
  }, [pendingDeleteRelation, revisions, conceptMap])

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

  // Load query categories from backend when modal opens (lazy load)
  useEffect(() => {
    if (!queryModalSourceId || !workItemId) return
    let cancelled = false
    const qs = activeQuerySourceId || queryModalSourceId
    const qType = activeQuery !== "NONE" ? activeQuery : "NONE"
    apiFetch(`${API}/graph/${workItemId}/query?type=${qType}&sourceRevisionId=${qs}`)
      .then((r) => r.json())
      .then((data: QueryResult) => {
        if (!cancelled) {
          setQueryCategories(data.categories || [])
          setQueryResult(data)
        }
      })
      .catch(() => {
        if (!cancelled) setQueryCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [queryModalSourceId, workItemId, API, apiFetch, activeQuery, activeQuerySourceId])

  // Fetch query result from backend whenever active query changes
  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(() => {
    if (activeQuery === "NONE" || !activeQuerySourceId || !workItemId) {
      return { nodes, edges }
    }
    // Use the API-fetched result when available and matching the current source
    if (queryResult && queryResult.sourceRevisionId === activeQuerySourceId && queryResult.queryType === activeQuery) {
      const nodeIds = new Set(queryResult.nodes.map((n) => n.id))
      const edgeIds = new Set(queryResult.edges.map((e) => e.id))

      return {
        nodes: nodes.filter((n) => nodeIds.has(n.id)),
        edges: edges.filter((e) => edgeIds.has(e.id)),
      }
    }
    // Fallback: nothing until API responds
    return { nodes: [], edges: [] }
  }, [activeQuery, activeQuerySourceId, workItemId, nodes, edges, queryResult])

  // Fetch query result from backend
  useEffect(() => {
    if (activeQuery === "NONE" || !activeQuerySourceId || !workItemId) {
      setQueryResult(null)
      return
    }
    let cancelled = false
    apiFetch(`${API}/graph/${workItemId}/query?type=${activeQuery}&sourceRevisionId=${activeQuerySourceId}`)
      .then((r) => r.json())
      .then((data: QueryResult) => {
        if (!cancelled) setQueryResult(data)
      })
      .catch(() => {
        if (!cancelled) setQueryResult(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeQuery, activeQuerySourceId, workItemId, API, apiFetch])

  const queryExplanation: QueryExplanation | null = useMemo(() => {
    if (activeQuery === "NONE" || !activeQuerySourceId) return null
    return queryResult?.explanations ?? null
  }, [activeQuery, activeQuerySourceId, queryResult])

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

        {workItemTitle && (
          <div
            data-agent="graph-work-item-title"
            style={{
              color:"white",
              position: "absolute",
              top: 14,
              left: 14,
              border: "2px solid black",
              borderRadius: 8,
              background: "#FF5A00",
              padding: "8px 14px",
              fontFamily: "monospace",
              fontWeight: "bold",
              fontSize: 13,
              boxSizing: "border-box",
              zIndex: 12,
              maxWidth: "calc(100% - 160px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {projectTitle} <span style={{color: "black"}}>›</span> {workItemTitle}
          </div>
        )}

        {(activeQuery !== "NONE" || activeQuerySourceId) && (
          <button
            data-agent="graph-show-all-button"
            onClick={() => {
              setActiveQuery("NONE")
              setActiveQuerySourceId(null)
              setQueryResult(null)
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
            categories={queryCategories}
            onSelect={(value) => {
              if (value === "NONE") {
                setActiveQuery("NONE")
                setActiveQuerySourceId(null)
                setQueryResult(null)
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
                setPendingDeleteRelationId(edge.id)
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
        {queryExplanation && (
          <div
            data-agent="graph-query-explanation"
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              border: "2px solid black",
              borderRadius: 8,
              background: "white",
              padding: 16,
              fontFamily: "monospace",
              boxSizing: "border-box",
              zIndex: 6,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>{queryExplanation.title}</div>
            <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{queryExplanation.content}</div>
          </div>
        )}
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

      {pendingDeleteRelation && (
        <div
          data-agent="delete-relation-confirm"
          ref={deleteConfirmRef}
          style={{
            background: "rgb(233, 237, 233)",
            position: "fixed",
            height: "auto",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "2px solid black",
            borderLeftWidth: 6,
            borderRadius: 8,
            fontFamily: "monospace",
            padding: "2rem",
            zIndex: 9999,
            width: 340,
          }}
        >
          <div
            data-agent="delete-relation-confirm-title"
            className="title"
            style={{ marginTop: 0 }}
          >
            Delete relation?
          </div>

          <div style={{ lineHeight: 1.5, marginBottom: 16 }}>
            Are you sure you want to delete the{" "}
            <strong>{pendingDeleteRelation.type}</strong> relation from{" "}
            <strong>{pendingDeleteSourceLabel || "unknown"}</strong> to{" "}
            <strong>{pendingDeleteTargetLabel || "unknown"}</strong>?
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              data-agent="btn-confirm-delete-relation"
              onClick={async () => {
                await deleteRelation(pendingDeleteRelation.id)
                setPendingDeleteRelationId(null)
              }}
              disabled={graphLoading}
              style={{
                ...brutal.button,
                flex: 1,
                margin: 0,
                background: "#F2B8B5",
                borderColor: "black",
                opacity: graphLoading ? 0.6 : 1,
                cursor: graphLoading ? "not-allowed" : "pointer",
              }}
            >
              {graphLoading ? "Deleting..." : "Delete"}
            </button>
            <button
              data-agent="btn-cancel-delete-relation"
              onClick={() => setPendingDeleteRelationId(null)}
              disabled={graphLoading}
              style={{
                ...brutal.button,
                flex: 1,
                margin: 0,
                opacity: graphLoading ? 0.6 : 1,
                cursor: graphLoading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
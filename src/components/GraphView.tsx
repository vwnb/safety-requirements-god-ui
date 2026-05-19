import { useCallback, useMemo, useRef, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
} from "reactflow"
import type { Node, Edge } from "reactflow"
import "reactflow/dist/style.css"
import dagre from "dagre"
import RelationTypePicker from "./RelationTypePicker"
import { useApiFetch } from "../lib/apiFetchContext"
import { typeColor } from "../App"
import background from "../assets/background.jpg";

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
  const [hovered, setHovered] = useState(false)
  const [showExcerpt, setShowExcerpt] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    timerRef.current = setTimeout(() => {
      setShowExcerpt(true)
    }, 500)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
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
      style={{ background: data.color || "white", width: nodeWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div data-agent="graph-node-label" style={{ fontWeight: "bold" }}>
        {hovered ? "Edit concept: " : ""}{data.label}
      </div>
      <div data-agent="graph-node-type" style={{ opacity: 0.7 }}>{data.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: any) => l.toUpperCase())}</div>

      <div
        data-agent="graph-node-excerpt"
        className="graph-node-excerpt"
        style={{
          boxSizing: "border-box",
          margin: "0.5em 0",
          fontSize: 10,
          color: "#333",
          overflow: "hidden",
          maxHeight: showExcerpt ? "200px" : "0px",
          transition: "max-height 0.3s ease",
        }}
      >
        {data.excerpt}
      </div>

      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
}

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
}: {
  concepts: Concept[]
  revisions: Revision[]
  relations: Relation[]
  onRelationCreated: () => void
  onNodeClick?: (conceptId: string) => void
  API: string
}) {
  const apiFetch = useApiFetch()
  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)

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
          excerpt: latestRev?.markdown?.slice(0, 120) + "...",
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

  return (
    <>
      <div data-agent="graph-view-container" style={{
        boxSizing: "border-box",
        top: "20px",
        width: "100%",
        border: "2px solid black",
        background: `linear-gradient(rgba(244, 143, 237, 0.2), rgba(184, 241, 241, 0.2)), url(${background})`,
        backgroundSize: "cover, cover",
        backgroundPosition: "center",
        backgroundBlendMode: "color-dodge"
      }}>
        {graphLoading && (
          <div
            data-agent="graph-loading"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(233, 237, 233, 0.5)",
              zIndex: 10,
              display: "grid",
              placeItems: "center",
              fontFamily: "monospace",
              fontWeight: "bold",
              pointerEvents: "none",
            }}
          >
            Loading graph...
          </div>
        )}

        <ReactFlow
          data-agent="react-flow"
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          fitView
          nodeExtent={[[0, 0], [3000, 3000]]}
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
          onLoad={() => {
            setTimeout(() => {
              const container = document.querySelector(".react-flow") as HTMLElement
              console.log("Fitting view", { container })
              if (container) {
                const event = new CustomEvent("fitview", { detail: { padding: 0.1 } })
                container.dispatchEvent(event)
              }
            }, 100)
          }}
        >
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Cross} />
        </ReactFlow>
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
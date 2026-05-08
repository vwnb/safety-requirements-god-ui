import { useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "reactflow"
import type { Node, Edge } from "reactflow"
import "reactflow/dist/style.css"
import dagre from "dagre"
import RelationTypePicker from "./RelationTypePicker"

type Revision = {
  id: string
  conceptId: string
  markdown: string
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

const typeColor: Record<string, string> = {
  ITEM: "#93c5fd",
  HAZARD: "#ef4444",
  SAFETY_GOAL: "#f59e0b",
  FSR: "#22c55e",
  TSR: "#06b6d4",
  SOFTWARE_REQUIREMENT: "#a78bfa",
  ASSUMPTION: "#64748b",
  CONSTRAINT: "#14b8a6",
  TEST_CASE: "#eab308",
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

function ConceptNode({ data }: any) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        border: "2px solid black",
        background: data.color || "white",
        fontFamily: "monospace",
        fontSize: 12,
        width: nodeWidth,
      }}
    >
      <div style={{ fontWeight: "bold" }}>{data.label}</div>
      <div style={{ opacity: 0.7 }}>{data.type}</div>

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
  API,
}: {
  concepts: Concept[]
  revisions: Revision[]
  relations: Relation[]
  onRelationCreated: () => void
  API: string
}) {
  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)

  const conceptMap = useMemo(() => {
    const m = new Map<string, Concept>()
    concepts.forEach((c) => m.set(c.id, c))
    return m
  }, [concepts])

  const nodes: Node[] = useMemo(() => {
    return revisions.map((r) => {
      const concept = conceptMap.get(r.conceptId)

      return {
        id: r.id,
        type: "concept",
        data: {
          label: concept?.title || r.markdown.slice(0, 40),
          type: concept?.type,
          color: typeColor[concept?.type || ""],
        },
        position: { x: 0, y: 0 },
      }
    })
  }, [revisions, conceptMap])

  const edges: Edge[] = useMemo(() => {
    return relations.map((r) => ({
      id: r.id,
      source: r.fromId, // 🔥 revision.id
      target: r.toId,   // 🔥 revision.id
      label: r.type,
      animated: r.type === "VIOLATES",
      style: {
        stroke:
          r.type === "VIOLATES"
            ? "#ef4444"
            : r.type === "MITIGATES"
              ? "#22c55e"
              : "#555",
      },
    }))
  }, [relations])

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return layoutGraph(nodes, edges)
  }, [nodes, edges])

  return (
    <>
      <div style={{ height: 600, border: "2px solid black" }}>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          fitView
          nodeExtent={[[0, 0], [3000, 3000]]}
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
          <Background />
        </ReactFlow>
      </div>

      {pendingConnection && (
        <RelationTypePicker
          onSelect={async (type) => {
            await fetch(`${API}/relations`, {
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
          }}
          onClose={() => setPendingConnection(null)}
        />
      )}
    </>
  )
}
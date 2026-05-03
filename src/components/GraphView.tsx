import { useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "reactflow"
import type { Node, Edge } from "reactflow"
import "reactflow/dist/style.css"
import { brutal } from "../App"
import RelationTypePicker from "./RelationTypePicker"
import dagre from "dagre"

type Revision = {
  id: string
  conceptId: string
  markdown: string
}

type Concept = {
  id: string
  type: string
}

type Relation = {
  id: string
  fromId: string
  toId: string
  type: string
}

const typeColor: Record<string, string> = {
  REQUIREMENT: "#4f8cff",
  TEST: "#22c55e",
  HAZARD: "#ef4444",
  CONTROL: "#eab308",
  ASSUMPTION: "#a855f7",
  CONSTRAINT: "#14b8a6",
}

const nodeWidth = 180
const nodeHeight = 60

export function layoutGraph(nodes: any[], edges: any[]) {
  const g = new dagre.graphlib.Graph()

  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 120, ranksep: 120 })

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)

    return {
      ...node,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges: edges }
}

export default function GraphView({
  revisions,
  concepts,
  relations,
  onRelationCreated,
  API
}: {
  revisions: Revision[]
  concepts: Concept[]
  relations: Relation[]
  onRelationCreated: () => void
  API: string
}) {
  const [connectFrom, setConnectFrom] = useState<string | null>(null)

  const conceptMap = useMemo(() => {
    const m = new Map()
    concepts.forEach((c) => m.set(c.id, c))
    return m
  }, [concepts])

  const nodes: Node[] = useMemo(() => {
    return revisions.map((r, i) => {
      const concept = conceptMap.get(r.conceptId)

      return {
        id: r.id,
        position: {
          x: (i % 5) * 250,
          y: Math.floor(i / 5) * 150,
        },
        data: {
          label: r.markdown.slice(0, 40) || "(empty)",
        },
        style: {
          border:
            r.id === connectFrom
              ? "4px solid blue"
              : "2px solid black",
          padding: 8,
          background: typeColor[concept?.type || ""] || "white",
          color: "black",
          fontFamily: "monospace",
          width: 180,
        },
      }
    })
  }, [revisions, conceptMap])

  const edges: Edge[] = useMemo(() => {
    return relations.map((rel) => ({
      id: rel.id,
      source: rel.fromId,
      target: rel.toId,
      label: rel.type,
      animated: rel.type === "VIOLATES",
      style: {
        stroke: rel.type === "VIOLATES" ? "red" : "black",
      },
    }))
  }, [relations])

  const [pendingConnection, setPendingConnection] = useState<{
    from: string
    to: string
  } | null>(null)

  const { nodes: layoutedNodes, edges: layoutedEdges } =
    useMemo(() => {
      return layoutGraph(nodes, edges)
    }, [nodes, edges])

  return (
    <>
      <div style={{ height: 500, border: "2px solid black" }}>

        {connectFrom && (
          <div style={{ marginBottom: 8 }}>
            Connecting from: {connectFrom.slice(0, 6)}
            <button
              onClick={() => setConnectFrom(null)}
              style={{ ...brutal.button, marginLeft: 8 }}
            >
              CANCEL
            </button>
          </div>
        )}
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          onConnect={(params) => {
            setPendingConnection({
              from: params.source!,
              to: params.target!,
            })
          }}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div >
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
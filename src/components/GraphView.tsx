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

const VISIBILITY_QUERY_CATEGORIES: QueryCategory[] = [
  {
    category: "Traceability",
    options: [
      { value: "TRACEABILITY_PATH", label: "Traceability path" },
      { value: "UPSTREAM_TRACEABILITY", label: "Upstream traceability" },
      { value: "DOWNSTREAM_TRACEABILITY", label: "Downstream traceability" },
    ],
  },
  {
    category: "Impact & Risk",
    options: [
      { value: "CHANGE_PROPAGATION", label: "Change propagation" },
      { value: "IMPACT_ANALYSIS", label: "Impact analysis" },
      { value: "DEPENDENCY_CYCLE", label: "Dependency cycles" },
      { value: "FAN_IN_OUT", label: "Fan-in / fan-out" },
    ],
  },
  {
    category: "Missing Evidence",
    options: [
      { value: "MISSING_VERIFICATION", label: "Missing verification" },
      { value: "UNVERIFIED_REQUIREMENTS", label: "Unverified requirements" },
      { value: "ORPHANED_NODES", label: "Orphaned nodes" },
    ],
  },
  {
    category: "Implementation Progress",
    options: [
      { value: "IMPLEMENTATION_COVERAGE", label: "Implementation coverage" },
      { value: "IMPLEMENTATION_GAP", label: "Implementation gaps" },
      { value: "VERIFICATION_STATUS", label: "Verification status" },
    ],
  },
  {
    category: "Architecture",
    options: [
      { value: "ARCHITECTURE_LAYERS", label: "Architecture layers" },
      { value: "SINGLE_POINT_OF_FAILURE", label: "Single points of failure" },
    ],
  },
  {
    category: "Audit Preparation",
    options: [
      { value: "AUDIT_TRAIL", label: "Audit trail" },
      { value: "COMPLIANCE_GAPS", label: "Compliance gaps" },
    ],
  },
  {
    category: "Safety Cases",
    options: [
      { value: "SAFETY_RATIONALE", label: "Safety rationale" },
      { value: "SAFETY_CASE_STRUCTURE", label: "Safety case structure" },
      { value: "HAZARD_MITIGATION", label: "Hazard mitigation chain" },
    ],
  },
  {
    category: "Lifecycle",
    options: [
      { value: "REQUIREMENT_DECOMPOSITION", label: "Requirement decomposition" },
      { value: "LIFECYCLE_COVERAGE", label: "Lifecycle coverage" },
    ],
  },
  {
    category: "Navigation",
    options: [
      { value: "NEIGHBORHOOD", label: "Neighborhood (1-hop)" },
      { value: "CONNECTED_COMPONENT", label: "Connected component" },
      { value: "BREADTH_FIRST", label: "Breadth-first (3 levels)" },
    ],
  },
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
    const visibleNodeIds = new Set<string>()
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

  // --- Traceability ---

  if (queryType === "TRACEABILITY_PATH") {
    // Show all nodes reachable from source via directed edges (downstream)
    // plus all nodes that can reach source (upstream), forming full trace paths.
    const visibleNodeIds = new Set<string>([sourceNodeId])

    // Downstream: follow edges from source
    const downstreamQueue = [sourceNodeId]
    while (downstreamQueue.length) {
      const current = downstreamQueue.shift()!
      edges.forEach((e) => {
        if (e.source === current && !visibleNodeIds.has(e.target)) {
          visibleNodeIds.add(e.target)
          downstreamQueue.push(e.target)
        }
      })
    }

    // Upstream: follow edges into source
    const upstreamQueue = [sourceNodeId]
    while (upstreamQueue.length) {
      const current = upstreamQueue.shift()!
      edges.forEach((e) => {
        if (e.target === current && !visibleNodeIds.has(e.source)) {
          visibleNodeIds.add(e.source)
          upstreamQueue.push(e.source)
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

  if (queryType === "UPSTREAM_TRACEABILITY") {
    // Show only nodes that trace up to the source (predecessors)
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      edges.forEach((e) => {
        if (e.target === current && !visibleNodeIds.has(e.source)) {
          visibleNodeIds.add(e.source)
          queue.push(e.source)
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

  if (queryType === "DOWNSTREAM_TRACEABILITY") {
    // Show only nodes that the source traces down to (successors)
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      edges.forEach((e) => {
        if (e.source === current && !visibleNodeIds.has(e.target)) {
          visibleNodeIds.add(e.target)
          queue.push(e.target)
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

  // --- Impact & Risk ---

  if (queryType === "DEPENDENCY_CYCLE") {
    // Find cycles that include the source node using DFS
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const visited = new Set<string>()
    const stack: string[] = []
    const inStack = new Set<string>()

    const dfs = (nodeId: string) => {
      if (inStack.has(nodeId)) {
        // Found a cycle - mark all nodes in the current stack
        const cycleStart = stack.indexOf(nodeId)
        if (cycleStart >= 0) {
          stack.slice(cycleStart).forEach((id) => visibleNodeIds.add(id))
        }
        return
      }
      if (visited.has(nodeId)) return

      visited.add(nodeId)
      inStack.add(nodeId)
      stack.push(nodeId)

      edges.forEach((e) => {
        if (e.source === nodeId) {
          dfs(e.target)
        }
      })

      stack.pop()
      inStack.delete(nodeId)
    }

    dfs(sourceNodeId)

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "FAN_IN_OUT") {
    // Show source plus nodes with high connectivity (fan-in >= 2 or fan-out >= 2)
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const fanIn = new Map<string, number>()
    const fanOut = new Map<string, number>()

    edges.forEach((e) => {
      fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1)
      fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1)
    })

    // Include source's immediate neighbors
    neighborIds(sourceNodeId).forEach((id) => visibleNodeIds.add(id))

    // Include high fan-in/fan-out nodes in the connected component
    const queue = [sourceNodeId]
    while (queue.length) {
      const current = queue.shift()!
      neighborIds(current).forEach((neighborId) => {
        if (visibleNodeIds.has(neighborId)) return
        const inCount = fanIn.get(neighborId) || 0
        const outCount = fanOut.get(neighborId) || 0
        if (inCount >= 2 || outCount >= 2) {
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

  // --- Missing Evidence ---

  if (queryType === "MISSING_VERIFICATION") {
    // Show requirements that lack verification artifacts (TEST_CASE, TEST_RESULT, VERIFICATION_REPORT)
    const verificationTypes = new Set(["TEST_CASE", "TEST_RESULT", "PROOF_TEST", "VERIFICATION_REPORT", "VALIDATION_REPORT"])
    const requirementTypes = new Set([
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      // If this is a requirement, check if it has verification
      if (requirementTypes.has(currentType)) {
        const hasVerification = edges.some((e) => {
          const otherId = e.source === current ? e.target : e.target === current ? e.source : null
          if (!otherId) return false
          const otherNode = nodeById.get(otherId)
          if (!otherNode) return false
          const otherType = conceptMap.get(otherNode.data.conceptId)?.type || ""
          return verificationTypes.has(otherType)
        })

        if (!hasVerification) {
          visibleNodeIds.add(current)
        }
      }

      // Traverse to neighbors
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

  if (queryType === "UNVERIFIED_REQUIREMENTS") {
    // Show requirements that have no TEST_RESULT or VERIFICATION_REPORT connected
    const evidenceTypes = new Set(["TEST_RESULT", "VERIFICATION_REPORT", "VALIDATION_REPORT"])
    const requirementTypes = new Set([
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (requirementTypes.has(currentType)) {
        const hasEvidence = edges.some((e) => {
          const otherId = e.source === current ? e.target : e.target === current ? e.source : null
          if (!otherId) return false
          const otherNode = nodeById.get(otherId)
          if (!otherNode) return false
          const otherType = conceptMap.get(otherNode.data.conceptId)?.type || ""
          return evidenceTypes.has(otherType)
        })

        if (!hasEvidence) {
          visibleNodeIds.add(current)
        }
      }

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

  if (queryType === "ORPHANED_NODES") {
    // Show nodes with no connections at all, plus the source for context
    const connectedIds = new Set<string>()
    edges.forEach((e) => {
      connectedIds.add(e.source)
      connectedIds.add(e.target)
    })

    const visibleNodeIds = new Set<string>([sourceNodeId])
    nodes.forEach((n) => {
      if (!connectedIds.has(n.id)) {
        visibleNodeIds.add(n.id)
      }
    })

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  // --- Implementation Progress ---

  if (queryType === "IMPLEMENTATION_GAP") {
    // Show requirements that lack IMPLEMENTATION artifacts
    const implementationTypes = new Set(["IMPLEMENTATION", "VERIFICATION", "VERIFICATION_REPORT"])
    const requirementTypes = new Set([
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (requirementTypes.has(currentType)) {
        const hasImplementation = edges.some((e) => {
          const otherId = e.source === current ? e.target : e.target === current ? e.source : null
          if (!otherId) return false
          const otherNode = nodeById.get(otherId)
          if (!otherNode) return false
          const otherType = conceptMap.get(otherNode.data.conceptId)?.type || ""
          return implementationTypes.has(otherType)
        })

        if (!hasImplementation) {
          visibleNodeIds.add(current)
        }
      }

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

  // --- Architecture ---

  if (queryType === "ARCHITECTURE_LAYERS") {
    // Show nodes grouped by architectural layer: Item/Architecture → Requirements → Implementation → Verification
    const layerTypes = new Set([
      "ITEM",
      "ARCHITECTURE",
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
      "IMPLEMENTATION",
      "VERIFICATION",
      "TEST_CASE",
      "TEST_RESULT",
      "VERIFICATION_REPORT",
      "VALIDATION_REPORT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (layerTypes.has(currentType)) {
        visibleNodeIds.add(current)
      }

      neighborIds(current).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          const neighborNode = nodeById.get(neighborId)
          if (!neighborNode) return
          const neighborType = conceptMap.get(neighborNode.data.conceptId)?.type || ""
          if (layerTypes.has(neighborType)) {
            queue.push(neighborId)
          }
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

  if (queryType === "SINGLE_POINT_OF_FAILURE") {
    // Show nodes that are critical connectors (high betweenness centrality approximation)
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const neighbors = neighborIds(current)

      // A node is a potential SPOF if it connects to many other nodes
      if (neighbors.length >= 3) {
        visibleNodeIds.add(current)
      }

      neighbors.forEach((neighborId) => {
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

  // --- Audit Preparation ---

  if (queryType === "AUDIT_TRAIL") {
    // Show the source plus all nodes connected via DERIVES_FROM, REFINES, SUPERSEDES relations
    const auditRelationTypes = new Set(["DERIVES_FROM", "REFINES", "SUPERSEDES"])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      edges.forEach((e) => {
        if (!auditRelationTypes.has(e.type || "")) return
        const neighborId = e.source === current ? e.target : e.target === current ? e.source : null
        if (!neighborId || visibleNodeIds.has(neighborId)) return
        visibleNodeIds.add(neighborId)
        queue.push(neighborId)
      })
    }

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target) && auditRelationTypes.has(e.type || "")
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "COMPLIANCE_GAPS") {
    // Show nodes that are missing expected relations (e.g., requirements without DERIVES_FROM or VALIDATES)
    const complianceRelationTypes = new Set(["DERIVES_FROM", "VALIDATES", "MITIGATES", "REFINES"])
    const requirementTypes = new Set([
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (requirementTypes.has(currentType)) {
        const hasComplianceRelation = edges.some((e) => {
          const isConnected = e.source === current || e.target === current
          return isConnected && complianceRelationTypes.has(e.type || "")
        })

        if (!hasComplianceRelation) {
          visibleNodeIds.add(current)
        }
      }

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

  // --- Safety Cases ---

  if (queryType === "SAFETY_CASE_STRUCTURE") {
    // Show the safety case hierarchy: Safety Case → Safety Goal → Requirements → Evidence
    const safetyCaseTypes = new Set([
      "SAFETY_CASE",
      "SAFETY_GOAL",
      "SAFETY_MANUAL",
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
      "TEST_CASE",
      "TEST_RESULT",
      "VERIFICATION_REPORT",
      "VALIDATION_REPORT",
      "ASSUMPTION",
      "CONSTRAINT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (safetyCaseTypes.has(currentType)) {
        visibleNodeIds.add(current)
      }

      neighborIds(current).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          const neighborNode = nodeById.get(neighborId)
          if (!neighborNode) return
          const neighborType = conceptMap.get(neighborNode.data.conceptId)?.type || ""
          if (safetyCaseTypes.has(neighborType)) {
            queue.push(neighborId)
          }
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

  if (queryType === "HAZARD_MITIGATION") {
    // Show the chain: Hazard → Safety Goal → Requirements → Verification
    const hazardChainTypes = new Set([
      "HAZARD",
      "HARM",
      "SAFETY_GOAL",
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
      "TEST_CASE",
      "TEST_RESULT",
      "VERIFICATION_REPORT",
      "VALIDATION_REPORT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (hazardChainTypes.has(currentType)) {
        visibleNodeIds.add(current)
      }

      neighborIds(current).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          const neighborNode = nodeById.get(neighborId)
          if (!neighborNode) return
          const neighborType = conceptMap.get(neighborNode.data.conceptId)?.type || ""
          if (hazardChainTypes.has(neighborType)) {
            queue.push(neighborId)
          }
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

  // --- Lifecycle ---

  if (queryType === "LIFECYCLE_COVERAGE") {
    // Show nodes across all lifecycle phases connected to source
    const lifecycleTypes = new Set([
      "ITEM",
      "ARCHITECTURE",
      "HAZARD",
      "SAFETY_GOAL",
      "FUNCTIONAL_SAFETY_REQUIREMENT",
      "TECHNICAL_SAFETY_REQUIREMENT",
      "SOFTWARE_REQUIREMENT",
      "SOFTWARE_SAFETY_REQUIREMENT",
      "HARDWARE_REQUIREMENT",
      "HARDWARE_SAFETY_REQUIREMENT",
      "IMPLEMENTATION",
      "VERIFICATION",
      "TEST_CASE",
      "TEST_RESULT",
      "VERIFICATION_REPORT",
      "VALIDATION_REPORT",
      "SAFETY_MANUAL",
      "ASSUMPTION",
      "CONSTRAINT",
    ])

    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue = [sourceNodeId]

    while (queue.length) {
      const current = queue.shift()!
      const currentNode = nodeById.get(current)
      if (!currentNode) continue
      const currentType = conceptMap.get(currentNode.data.conceptId)?.type || ""

      if (lifecycleTypes.has(currentType)) {
        visibleNodeIds.add(current)
      }

      neighborIds(current).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          const neighborNode = nodeById.get(neighborId)
          if (!neighborNode) return
          const neighborType = conceptMap.get(neighborNode.data.conceptId)?.type || ""
          if (lifecycleTypes.has(neighborType)) {
            queue.push(neighborId)
          }
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

  // --- Navigation ---

  if (queryType === "NEIGHBORHOOD") {
    // Show source plus 1-hop neighbors
    const visibleNodeIds = new Set<string>([sourceNodeId])
    neighborIds(sourceNodeId).forEach((id) => visibleNodeIds.add(id))

    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    )

    return {
      nodes: nodes.filter((n) => visibleNodeIds.has(n.id)),
      edges: visibleEdges,
    }
  }

  if (queryType === "CONNECTED_COMPONENT") {
    // Show the full connected component containing the source
    const visibleNodeIds = new Set<string>()
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

  if (queryType === "BREADTH_FIRST") {
    // Show nodes up to 3 levels deep from source
    const visibleNodeIds = new Set<string>([sourceNodeId])
    const queue: Array<{ id: string; depth: number }> = [{ id: sourceNodeId, depth: 0 }]

    while (queue.length) {
      const { id, depth } = queue.shift()!
      if (depth >= 3) continue

      neighborIds(id).forEach((neighborId) => {
        if (!visibleNodeIds.has(neighborId)) {
          visibleNodeIds.add(neighborId)
          queue.push({ id: neighborId, depth: depth + 1 })
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

function formatTypeSummaries(nodes: Node[], conceptMap: Map<string, Concept>) {
  const counts = new Map<string, number>()
  nodes.forEach((node) => {
    const type = conceptMap.get(node.data.conceptId)?.type || "Unknown"
    counts.set(type, (counts.get(type) || 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${type.replace(/_/g, " ").toLowerCase()}`)
    .join(", ")
}

function getQueryExplanation(
  queryType: VisibilityQueryType,
  sourceNodeId: string | null,
  visibleNodes: Node[],
  visibleEdges: Edge[],
  conceptMap: Map<string, Concept>
) {
  if (queryType === "NONE" || !sourceNodeId) {
    return null
  }

  const sourceNode = visibleNodes.find((node) => node.id === sourceNodeId)
  const sourceConcept = sourceNode
    ? conceptMap.get(sourceNode.data.conceptId)
    : undefined
  const sourceLabel = sourceConcept?.key || sourceNode?.data.label || "Unknown concept"
  const sourceCount = visibleNodes.length - 1
  const edgeCount = visibleEdges.length
  const typeSummary = formatTypeSummaries(visibleNodes, conceptMap)

  switch (queryType) {
    case "CHANGE_PROPAGATION":
      return {
        title: `Change propagation from ${sourceLabel}`,
        content: `Shows the immediate graph neighbors of ${sourceLabel}. ${sourceCount} directly connected concept${sourceCount === 1 ? "" : "s"} are visible, connected by ${edgeCount} relation${edgeCount === 1 ? "" : "s"}. Use this view to identify concepts most likely to be affected by a change.`,
      }
    case "IMPACT_ANALYSIS":
      return {
        title: `Impact analysis around ${sourceLabel}`,
        content: `Displays the full connected footprint for ${sourceLabel}. ${sourceCount} related concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relationship${edgeCount === 1 ? "" : "s"} were included. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`,
      }
    case "IMPLEMENTATION_COVERAGE": {
      const covered = visibleNodes.filter((node) =>
        implementationCoverageTypes.has(conceptMap.get(node.data.conceptId)?.type || "")
      )
      const coverageCount = covered.length
      return {
        title: `Implementation coverage for ${sourceLabel}`,
        content: coverageCount
          ? `Highlights ${coverageCount} implementation or verification artifact${coverageCount === 1 ? "" : "s"} in the related network. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`
          : `No implementation or verification artifacts were found in the immediate coverage graph for ${sourceLabel}.`,
      }
    }
    case "VERIFICATION_STATUS": {
      const verified = visibleNodes.filter((node) =>
        verificationStatusTypes.has(conceptMap.get(node.data.conceptId)?.type || "")
      )
      const verificationCount = verified.length
      return {
        title: `Verification status for ${sourceLabel}`,
        content: verificationCount
          ? `Shows ${verificationCount} verification-related concept${verificationCount === 1 ? "" : "s"} connected to ${sourceLabel}. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`
          : `No verification artifacts were found in the filtered graph for ${sourceLabel}.`,
      }
    }
    case "SAFETY_RATIONALE": {
      const rationale = visibleNodes.filter((node) =>
        safetyRationaleTypes.has(conceptMap.get(node.data.conceptId)?.type || "")
      )
      const rationaleCount = rationale.length
      return {
        title: `Safety rationale for ${sourceLabel}`,
        content: rationaleCount
          ? `Surfaces ${rationaleCount} safety rationale artifact${rationaleCount === 1 ? "" : "s"} related to ${sourceLabel}. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`
          : `No safety rationale nodes were found in the result set for ${sourceLabel}.`,
      }
    }
    case "REQUIREMENT_DECOMPOSITION": {
      const decomposed = visibleNodes.filter((node) =>
        requirementDecompositionTypes.has(conceptMap.get(node.data.conceptId)?.type || "")
      )
      const decompositionCount = decomposed.length
      return {
        title: `Requirement decomposition for ${sourceLabel}`,
        content: decompositionCount
          ? `Highlights ${decompositionCount} decomposed requirement or specification concept${decompositionCount === 1 ? "" : "s"}. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`
          : `No decomposed requirement concepts were found in the filtered graph for ${sourceLabel}.`,
      }
    }
    case "TRACEABILITY_PATH":
      return {
        title: `Traceability path for ${sourceLabel}`,
        content: `Shows the complete traceability path through ${sourceLabel}, including both upstream sources and downstream targets. ${sourceCount} related concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} were included. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`,
      }
    case "UPSTREAM_TRACEABILITY":
      return {
        title: `Upstream traceability for ${sourceLabel}`,
        content: `Displays all concepts that ${sourceLabel} traces back to. ${sourceCount} upstream concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} were included. Use this view to understand where ${sourceLabel} originates from. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`,
      }
    case "DOWNSTREAM_TRACEABILITY":
      return {
        title: `Downstream traceability for ${sourceLabel}`,
        content: `Displays all concepts that trace down from ${sourceLabel}. ${sourceCount} downstream concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} were included. Use this view to see what ${sourceLabel} impacts downstream. ${typeSummary ? `Top types returned: ${typeSummary}.` : ""}`,
      }
    case "DEPENDENCY_CYCLE":
      return {
        title: `Dependency cycles involving ${sourceLabel}`,
        content: `Highlights circular dependencies in the graph that involve ${sourceLabel}. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} participate in cycle${sourceCount === 1 ? "" : "s"} with ${edgeCount} relation${edgeCount === 1 ? "" : "s"}. Cycles can indicate architectural issues or unintended feedback loops.`,
      }
    case "FAN_IN_OUT":
      return {
        title: `Fan-in / fan-out around ${sourceLabel}`,
        content: `Shows ${sourceLabel} and the nodes with high connectivity in its vicinity. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} with significant fan-in or fan-out are visible. High fan-in nodes are integration points; high fan-out nodes are potential change amplifiers.`,
      }
    case "MISSING_VERIFICATION": {
      const missingCount = visibleNodes.filter((node) => {
        const type = conceptMap.get(node.data.conceptId)?.type || ""
        return type.includes("REQUIREMENT")
      }).length
      return {
        title: `Missing verification for ${sourceLabel}`,
        content: missingCount
          ? `Identifies ${missingCount} requirement${missingCount === 1 ? "" : "s"} in the connected graph that lack any verification artifact (test case, test result, or verification report). These are candidates for additional verification work.`
          : `No requirements without verification were found in the connected graph for ${sourceLabel}.`,
      }
    }
    case "UNVERIFIED_REQUIREMENTS": {
      const unverifiedCount = visibleNodes.filter((node) => {
        const type = conceptMap.get(node.data.conceptId)?.type || ""
        return type.includes("REQUIREMENT")
      }).length
      return {
        title: `Unverified requirements near ${sourceLabel}`,
        content: unverifiedCount
          ? `Shows ${unverifiedCount} requirement${unverifiedCount === 1 ? "" : "s"} that have no test result or verification report connected. These requirements lack objective evidence of being verified.`
          : `No unverified requirements were found in the connected graph for ${sourceLabel}.`,
      }
    }
    case "ORPHANED_NODES": {
      const orphanCount = visibleNodes.length - 1
      return {
        title: `Orphaned nodes in the graph`,
        content: orphanCount
          ? `Found ${orphanCount} orphaned node${orphanCount === 1 ? "" : "s"} with no relations to any other concept. Orphaned nodes may indicate incomplete modeling or missing traceability links.`
          : `No orphaned nodes were found. All concepts in the graph have at least one relation.`,
      }
    }
    case "IMPLEMENTATION_GAP": {
      const gapCount = visibleNodes.filter((node) => {
        const type = conceptMap.get(node.data.conceptId)?.type || ""
        return type.includes("REQUIREMENT")
      }).length
      return {
        title: `Implementation gaps for ${sourceLabel}`,
        content: gapCount
          ? `Identifies ${gapCount} requirement${gapCount === 1 ? "" : "s"} in the connected graph that lack implementation artifacts. These requirements have not yet been implemented or linked to implementation evidence.`
          : `No implementation gaps were found in the connected graph for ${sourceLabel}.`,
      }
    }
    case "ARCHITECTURE_LAYERS":
      return {
        title: `Architecture layers around ${sourceLabel}`,
        content: `Shows the architectural layering around ${sourceLabel}: item/architecture, requirements, implementation, and verification. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} across ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this view to assess whether the architecture has clear separation of concerns.`,
      }
    case "SINGLE_POINT_OF_FAILURE":
      return {
        title: `Single points of failure near ${sourceLabel}`,
        content: `Highlights nodes with high connectivity (3+ relations) that could act as single points of failure. ${sourceCount} such node${sourceCount === 1 ? "" : "s"} were found. If these nodes change or fail, many dependent concepts are affected.`,
      }
    case "AUDIT_TRAIL":
      return {
        title: `Audit trail for ${sourceLabel}`,
        content: `Shows the derivation history for ${sourceLabel} via DERIVES_FROM, REFINES, and SUPERSEDES relations. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} form the audit trail. Use this to demonstrate how requirements evolved and trace back to their origins.`,
      }
    case "COMPLIANCE_GAPS": {
      const gapCount = visibleNodes.filter((node) => {
        const type = conceptMap.get(node.data.conceptId)?.type || ""
        return type.includes("REQUIREMENT")
      }).length
      return {
        title: `Compliance gaps for ${sourceLabel}`,
        content: gapCount
          ? `Identifies ${gapCount} requirement${gapCount === 1 ? "" : "s"} that lack expected compliance relations (DERIVES_FROM, VALIDATES, MITIGATES, or REFINES). These may fail audit checks for traceability completeness.`
          : `No compliance gaps were found in the connected graph for ${sourceLabel}.`,
      }
    }
    case "SAFETY_CASE_STRUCTURE":
      return {
        title: `Safety case structure for ${sourceLabel}`,
        content: `Shows the safety case hierarchy connected to ${sourceLabel}: safety case, safety goals, requirements, and supporting evidence. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this to assess the strength of the safety argument.`,
      }
    case "HAZARD_MITIGATION":
      return {
        title: `Hazard mitigation chain for ${sourceLabel}`,
        content: `Displays the full hazard mitigation chain: hazard → safety goal → requirements → verification evidence. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this to verify that every hazard is properly mitigated and verified.`,
      }
    case "LIFECYCLE_COVERAGE":
      return {
        title: `Lifecycle coverage for ${sourceLabel}`,
        content: `Shows concepts across the full safety lifecycle connected to ${sourceLabel}: from item definition through requirements, implementation, verification, and operation. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this to assess lifecycle completeness.`,
      }
    case "NEIGHBORHOOD":
      return {
        title: `Neighborhood of ${sourceLabel}`,
        content: `Shows ${sourceLabel} and its immediate 1-hop neighbors. ${sourceCount} directly connected concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this for quick local exploration of the graph.`,
      }
    case "CONNECTED_COMPONENT":
      return {
        title: `Connected component of ${sourceLabel}`,
        content: `Shows the entire connected component containing ${sourceLabel}. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this to understand the full scope of related concepts.`,
      }
    case "BREADTH_FIRST":
      return {
        title: `Breadth-first exploration from ${sourceLabel}`,
        content: `Shows nodes up to 3 levels deep from ${sourceLabel}. ${sourceCount} concept${sourceCount === 1 ? "" : "s"} and ${edgeCount} relation${edgeCount === 1 ? "" : "s"} are visible. Use this to explore the graph structure around ${sourceLabel} without showing the entire graph.`,
      }
  }

  return null
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

  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(() => {
    return getVisibleSubgraph(activeQuery, activeQuerySourceId, nodes, edges, conceptMap)
  }, [activeQuery, activeQuerySourceId, nodes, edges, conceptMap])

  const queryExplanation = useMemo(
    () => getQueryExplanation(activeQuery, activeQuerySourceId, visibleNodes, visibleEdges, conceptMap),
    [activeQuery, activeQuerySourceId, visibleNodes, visibleEdges, conceptMap]
  )

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
            categories={VISIBILITY_QUERY_CATEGORIES}
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

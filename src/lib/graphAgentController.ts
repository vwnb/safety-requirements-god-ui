/**
 * Graph Agent Controller
 *
 * Maps `data-agent` selectors to programmatic UI operations (clicks, drags, etc.)
 * so that automation/testing agents can interact with the graph view handles.
 *
 * React Flow uses PointerEvents (pointerdown/pointermove/pointerup) for drag,
 * so we dispatch those instead of MouseEvents.
 *
 * IMPORTANT: React Flow culls off-screen nodes from the DOM.
 * All node/handle-targeting methods automatically call fitView() first
 * if the target element is not found, then retry.
 *
 * Usage:
 *   import { graphAgent } from "../lib/graphAgentController"
 *   await graphAgent.clickSourceHandle("revision-123")
 *   await graphAgent.dragSourceToTarget("revision-123", "revision-456")
 */

const RETRY_COUNT = 5
const RETRY_DELAY = 300

function el(selector: string): HTMLElement | null {
  return document.querySelector(`[data-agent="${selector}"]`)
}

function elAll(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(`[data-agent="${selector}"]`)
}

function dispatchPointerEvent(
  target: HTMLElement,
  type: string,
  opts: { clientX?: number; clientY?: number; button?: number; bubbles?: boolean } = {}
) {
  const { clientX = 0, clientY = 0, button = 0, bubbles = true } = opts
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      button,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    })
  )
}

/** Dispatch a native MouseEvent (for hover effects, edge click, etc.) */
function dispatchMouseEvent(
  target: HTMLElement,
  type: string,
  opts: { clientX?: number; clientY?: number; button?: number; bubbles?: boolean } = {}
) {
  const { clientX = 0, clientY = 0, button = 0, bubbles = true } = opts
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      button,
    })
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fit the graph view to show all nodes. */
function fitView() {
  const flowEl = el("react-flow") as any
  if (!flowEl) throw new Error("React Flow container not found")
  const rf = flowEl.__reactFlowInstance
  if (rf) {
    rf.fitView({ padding: 0.1 })
  }
}

/**
 * Ensure an element exists in the DOM by its data-agent selector.
 * React Flow culls off-screen nodes, so if the element is not found,
 * we call fitView() to bring all nodes into view, then retry.
 *
 * If the retries are exhausted, returns null.
 */
async function ensureElementVisible(selector: string): Promise<HTMLElement | null> {
  // Quick path — element is already in the DOM
  let found = el(selector)
  if (found) return found

  // Element is off-screen / culled — try to fit the view and retry
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    console.log(
      `   [graphAgent] Element "${selector}" not in DOM (attempt ${attempt}/${RETRY_COUNT}), calling fitView()...`
    )
    fitView()
    await sleep(RETRY_DELAY)

    found = el(selector)
    if (found) return found
  }

  console.warn(`   [graphAgent] Element "${selector}" still not in DOM after ${RETRY_COUNT} retries`)
  return null
}

/**
 * Set to true while a simulated connection drag is in progress,
 * so that onEdgeClick handlers can skip deletion.
 */
let _suppressEdgeClicks = false

/**
 * Check and reset the edge click suppression flag.
 * Returns true if edge clicks should be suppressed.
 */
export function consumeSuppressEdgeClicks(): boolean {
  const val = _suppressEdgeClicks
  _suppressEdgeClicks = false
  return val
}

export const graphAgent = {
  // ── Generic element operations ───────────────────────────────────

  /** Click any element by its data-agent selector. */
  async click(selector: string) {
    const target = await ensureElementVisible(selector)
    if (!target) throw new Error(`Element not found after fitView retries: ${selector}`)
    target.click()
  },

  /** Get the text content of any element by its data-agent selector. */
  async getText(selector: string): Promise<string | null> {
    const target = await ensureElementVisible(selector)
    return target?.textContent ?? null
  },

  /** Check if an element exists in the DOM. Does not retry / fitView. */
  exists(selector: string): boolean {
    return el(selector) !== null
  },

  /** Wait for an element to appear in the DOM (polling). */
  async waitFor(selector: string, timeoutMs = 3000): Promise<HTMLElement> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const found = el(selector)
      if (found) return found
      await sleep(100)
    }
    throw new Error(`Timeout waiting for element: ${selector}`)
  },

  /** Type text into an input element identified by data-agent. */
  async type(selector: string, text: string) {
    const input = await ensureElementVisible(selector) as HTMLInputElement | null
    if (!input) throw new Error(`Input not found: ${selector}`)
    input.focus()
    input.value = text
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
  },

  /** Select an option in a <select> element identified by data-agent. */
  async selectOption(selector: string, value: string) {
    const select = await ensureElementVisible(selector) as HTMLSelectElement | null
    if (!select) throw new Error(`Select not found: ${selector}`)
    select.value = value
    select.dispatchEvent(new Event("change", { bubbles: true }))
  },

  // ── Node operations ──────────────────────────────────────────────

  /** Click a graph node by revision ID. */
  async clickNode(revisionId: string) {
    await this.click(`graph-node-${revisionId}`)
  },

  /** Hover over a graph node by revision ID. */
  async hoverNode(revisionId: string) {
    const node = await ensureElementVisible(`graph-node-${revisionId}`)
    if (!node) throw new Error(`Node not found after fitView retries: graph-node-${revisionId}`)
    dispatchMouseEvent(node, "mouseenter")
  },

  /** Unhover a graph node by revision ID. */
  async unhoverNode(revisionId: string) {
    const node = await ensureElementVisible(`graph-node-${revisionId}`)
    if (!node) throw new Error(`Node not found after fitView retries: graph-node-${revisionId}`)
    dispatchMouseEvent(node, "mouseleave")
  },

  /** Get the text content of a node's label. Returns null if node is off-screen. */
  async getNodeLabel(revisionId: string): Promise<string | null> {
    const node = await ensureElementVisible(`graph-node-${revisionId}`)
    if (!node) return null
    return node.querySelector("[data-agent='graph-node-label']")?.textContent ?? null
  },

  /** Get the text content of a node's type badge. Returns null if node is off-screen. */
  async getNodeType(revisionId: string): Promise<string | null> {
    const node = await ensureElementVisible(`graph-node-${revisionId}`)
    if (!node) return null
    return node.querySelector("[data-agent='graph-node-type']")?.textContent ?? null
  },

  // ── Handle operations (source = outgoing, target = incoming) ─────

  /** Click the source (right-side) handle of a node. */
  async clickSourceHandle(revisionId: string) {
    const handle = await ensureElementVisible(`graph-handle-source-${revisionId}`)
    if (!handle) throw new Error(`Source handle not found after fitView retries: graph-handle-source-${revisionId}`)
    handle.click()
  },

  /** Click the target (left-side) handle of a node. */
  async clickTargetHandle(revisionId: string) {
    const handle = await ensureElementVisible(`graph-handle-target-${revisionId}`)
    if (!handle) throw new Error(`Target handle not found after fitView retries: graph-handle-target-${revisionId}`)
    handle.click()
  },

  /** Get bounding rect of a source handle. Returns null if handle is off-screen. */
  async getSourceHandleRect(revisionId: string): Promise<DOMRect | null> {
    const handle = await ensureElementVisible(`graph-handle-source-${revisionId}`)
    return handle?.getBoundingClientRect() ?? null
  },

  /** Get bounding rect of a target handle. Returns null if handle is off-screen. */
  async getTargetHandleRect(revisionId: string): Promise<DOMRect | null> {
    const handle = await ensureElementVisible(`graph-handle-target-${revisionId}`)
    return handle?.getBoundingClientRect() ?? null
  },

  /**
   * Simulate dragging from a source handle to a target handle.
   *
   * React Flow uses PointerEvents for connection drags, so we dispatch:
   *   1. pointerdown on source handle
   *   2. pointermove on document (toward target)
   *   3. pointerup on target handle
   *
   * Both handles are ensured visible before the drag begins.
   */
  async dragSourceToTarget(
    sourceRevisionId: string,
    targetRevisionId: string,
    duration = 200
  ) {
    // Suppress edge clicks during the simulated drag so that pointerup
    // on the target handle does NOT also trigger onEdgeClick (deleting
    // the old relation). The flag is consumed and reset in GraphView.
    _suppressEdgeClicks = true

    const sourceHandle = await ensureElementVisible(`graph-handle-source-${sourceRevisionId}`)
    if (!sourceHandle) {
      _suppressEdgeClicks = false
      throw new Error(`Source handle not found after fitView retries: graph-handle-source-${sourceRevisionId}`)
    }

    const targetHandle = await ensureElementVisible(`graph-handle-target-${targetRevisionId}`)
    if (!targetHandle) {
      _suppressEdgeClicks = false
      throw new Error(`Target handle not found after fitView retries: graph-handle-target-${targetRevisionId}`)
    }

    // Small pause after fitView for layout to settle
    await sleep(100)

    const sourceRect = sourceHandle.getBoundingClientRect()
    const targetRect = targetHandle.getBoundingClientRect()

    const sourceX = sourceRect.left + sourceRect.width / 2
    const sourceY = sourceRect.top + sourceRect.height / 2
    const targetX = targetRect.left + targetRect.width / 2
    const targetY = targetRect.top + targetRect.height / 2

    // 1. pointerdown on source handle (starts the connection drag)
    dispatchPointerEvent(sourceHandle, "pointerdown", {
      clientX: sourceX,
      clientY: sourceY,
      button: 0,
      bubbles: true,
    })

    // Small pause to let React Flow register the drag start
    await sleep(50)

    // 2. pointermove toward target
    dispatchPointerEvent(document.body, "pointermove", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      bubbles: true,
    })

    // Also dispatch mousemove in case React Flow falls back to it
    dispatchMouseEvent(document.body, "mousemove", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      bubbles: true,
    })

    await sleep(duration)

    // 3. pointerup on the target handle (completes the connection)
    dispatchPointerEvent(targetHandle, "pointerup", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      bubbles: true,
    })

    // Also dispatch mouseup as fallback
    dispatchMouseEvent(targetHandle, "mouseup", {
      clientX: targetX,
      clientY: targetY,
      button: 0,
      bubbles: true,
    })

    // Re-enable edge clicks after the drag is complete
    _suppressEdgeClicks = false
  },

  // ── Edge operations ──────────────────────────────────────────────

  /** Hover over an edge by relation ID. */
  async hoverEdge(relationId: string) {
    // Edges are SVG elements; they may or may not be culled by React Flow.
    // Ensure the graph view is fitted so edges are visible.
    fitView()
    await sleep(RETRY_DELAY)

    const edges = document.querySelectorAll(
      `.react-flow__edge[data-id="${relationId}"]`
    ) as NodeListOf<HTMLElement>
    if (edges.length === 0) throw new Error(`Edge not found: ${relationId}`)
    edges.forEach((e) => dispatchMouseEvent(e, "mouseenter"))
  },

  /** Unhover an edge by relation ID. */
  async unhoverEdge(relationId: string) {
    fitView()
    await sleep(RETRY_DELAY)

    const edges = document.querySelectorAll(
      `.react-flow__edge[data-id="${relationId}"]`
    ) as NodeListOf<HTMLElement>
    if (edges.length === 0) throw new Error(`Edge not found: ${relationId}`)
    edges.forEach((e) => dispatchMouseEvent(e, "mouseleave"))
  },

  /** Click an edge by relation ID to delete it. */
  async clickEdge(relationId: string) {
    fitView()
    await sleep(RETRY_DELAY)

    const edges = document.querySelectorAll(
      `.react-flow__edge[data-id="${relationId}"]`
    ) as NodeListOf<HTMLElement>
    if (edges.length === 0) throw new Error(`Edge not found: ${relationId}`)
    edges.forEach((e) => dispatchMouseEvent(e, "click"))
  },

  // ── Relation type picker operations ──────────────────────────────

  /** Check if the relation type picker is open. */
  isRelationPickerOpen(): boolean {
    return el("relation-type-picker") !== null
  },

  /** Select a relation type from the picker. */
  selectRelationType(type: string) {
    const pickerItem = el(`relation-type-${type}`)
    if (!pickerItem) {
      throw new Error(`Relation type not found in picker: ${type}`)
    }
    pickerItem.click()
  },

  /** Cancel/close the relation type picker. */
  cancelRelationPicker() {
    const btn = el("btn-cancel-relation")
    if (!btn) throw new Error("Cancel button not found in relation picker")
    btn.click()
  },

  /** Get all visible relation types in the picker. */
  getRelationTypes(): string[] {
    const items = elAll("relation-type-picker")[0]
    if (!items) return []
    const rows = items.querySelectorAll("[data-agent^='relation-type-']")
    return Array.from(rows)
      .filter((r) => r.getAttribute("data-agent")?.startsWith("relation-type-"))
      .map((r) => r.textContent ?? "")
      .filter(Boolean)
  },

  // ── High-level graph operations ──────────────────────────────────

  /**
   * Connect two nodes by dragging from a source handle to a target handle
   * and then selecting a relation type from the picker.
   */
  async connectNodes(
    sourceRevisionId: string,
    targetRevisionId: string,
    relationType: string,
    dragDuration = 200
  ) {
    await this.dragSourceToTarget(sourceRevisionId, targetRevisionId, dragDuration)

    // Wait for the relation type picker to appear
    await sleep(200)

    this.selectRelationType(relationType)
  },

  /** Delete a relation by clicking its edge. */
  async deleteRelation(relationId: string) {
    await this.clickEdge(relationId)
  },

  /** Fit the graph view to show all nodes. */
  fitView() {
    fitView()
  },
}
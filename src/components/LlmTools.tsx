import { useCallback, useState } from "react"
import { brutal } from "../App"
import { SemanticColor } from "../lib/SemanticColor"

type WorkItem = {
  id: string
  key: string
  name: string
  description?: string
  createdBy: { name: string }
  createdAt: string
  phase?: string
  asil?: string
  sil?: string
  pl?: string
  standards?: string[]
  applicationContext?: string
  systemBoundary?: string
}

type SuggestionAction = "Create" | "Revise" | "Update" | "Discard" | "Cancel" | "Reject"

type SuggestionImportance = "Very high" | "High" | "Medium" | "Low"

type PayloadConcept = {
  key: string
  type: string
  title?: string
  phase?: string
  asil?: string
  sil?: string
  pl?: string
  standards?: string[]
}

type PayloadRevision = {
  conceptKey?: string
  markdown: string
  versionMajor?: number
  versionMinor?: number
  versionPatch?: number
}

type PayloadRelation = {
  sourceConceptKey: string
  targetConceptKey: string
  fromKey?: string
  toKey?: string
  type: string
}

type SuggestionPayload = {
  concepts?: PayloadConcept[]
  revisions?: PayloadRevision[]
  relations?: PayloadRelation[]
  conceptKey?: string
  markdown?: string
}

type EvaluatorSuggestion = {
  text: string
  importance?: SuggestionImportance
  action: SuggestionAction
  payload: SuggestionPayload
  reason?: string
}

const actionColor: Record<string, string> = {
  "Create": SemanticColor.SUCCESS,
  "Revise": SemanticColor.SUCCESS,
  "Discard": SemanticColor.DANGER,
}

const importanceColor: Record<SuggestionImportance, string> = {
  "Very high": SemanticColor.DANGER,
  "High": SemanticColor.ARGUMENT,
  "Medium": SemanticColor.EVIDENCE,
  "Low": SemanticColor.FUNCTIONAL,
}



interface LlmToolsProps {
  selectedWorkItem: string
  selectedWorkItemData: WorkItem | null
  activeRevisionId: string | null
  onSetActiveRevisionId: (id: string | null) => void
  onSetEditorValue: (value: string) => void
  actorForApi: string
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  onLoadConcepts: (workItemId?: string) => Promise<void>
  onRefreshGraph: (workItemId: string) => Promise<void>
  onSetPendingConfirm: (confirm: { message: string; onConfirm: () => void; confirmLabel?: string; cancelLabel?: string } | null) => void
  onSetLoading: (loading: boolean) => void
  onSetLoadingMessage: (message: string) => void
}

export function LlmTools({
  selectedWorkItem,
  selectedWorkItemData,
  activeRevisionId,
  onSetActiveRevisionId,
  onSetEditorValue,
  actorForApi,
  apiFetch,
  onLoadConcepts,
  onRefreshGraph,
  onSetPendingConfirm,
  onSetLoading,
  onSetLoadingMessage,
}: LlmToolsProps) {
  const API = import.meta.env.VITE_API_URL || ""

  const [suggestions, setSuggestions] = useState<EvaluatorSuggestion[] | null>(null)
  const [evaluateDemoMode, setEvaluateDemoMode] = useState(false)

  const suggestWithLLM = async (workItemId: string) => {
    if (!selectedWorkItem) return

    onSetLoading(true)
    onSetLoadingMessage("👺 Generating suggestions with LLM...")

    try {
      const res = await apiFetch(`${API}/evaluate-work-item/${workItemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo: evaluateDemoMode,
          user: actorForApi,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate suggestions")

      const suggestionsData = await res.json()
      setSuggestions(suggestionsData.suggestions as EvaluatorSuggestion[])
    } catch (err) {
      console.error(err)
    } finally {
      onSetLoading(false)
    }
  }

  const actOnSuggestion = useCallback(async (suggestion: EvaluatorSuggestion) => {
    const { action, payload } = suggestion

    const normalizedAction =
      action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();

    switch (normalizedAction) {
      case 'Create': {
        if (!selectedWorkItem) return

        onSetLoading(true)
        onSetLoadingMessage("Creating from suggestion...")

        try {
          const concepts = (payload.concepts ?? []).map((c: PayloadConcept) => ({
            key: c.key,
            type: c.type,
            title: c.title || "",
            phase: c.phase || undefined,
            asil: c.asil || undefined,
            sil: c.sil || undefined,
            pl: c.pl || undefined,
            standards: c.standards || undefined,
            createdBy: { name: actorForApi },
          }))

          const revisions = (payload.revisions ?? []).map((r: PayloadRevision) => ({
            conceptKey: r.conceptKey,
            markdown: r.markdown,
            versionMajor: r.versionMajor,
            versionMinor: r.versionMinor,
            versionPatch: r.versionPatch,
          }))

          const relations = (payload.relations ?? []).map((r: PayloadRelation) => ({
            sourceConceptKey: r.sourceConceptKey,
            targetConceptKey: r.targetConceptKey,
            fromKey: r.fromKey,
            toKey: r.toKey,
            type: r.type,
          }))

          const res = await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concepts,
              revisions,
              relations,
              user: actorForApi,
            }),
          })

          if (!res.ok) {
            console.warn("Failed to create from suggestion", payload)
            return
          }

          await onLoadConcepts(selectedWorkItem)
          await onRefreshGraph(selectedWorkItem)

          setSuggestions((prev) =>
            Array.isArray(prev)
              ? prev.filter((s) => s !== suggestion)
              : prev
          )
        } finally {
          onSetLoading(false)
        }
        return
      }

      case 'Revise':
      case 'Update': {
        if (!selectedWorkItem) return

        onSetLoading(true)
        onSetLoadingMessage("Revising from suggestion...")

        try {
          const revisions = [{
            conceptKey: payload.conceptKey,
            markdown: payload.markdown,
          }]

          const res = await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concepts: [],
              revisions,
              user: actorForApi,
            }),
          })

          if (!res.ok) {
            console.warn("Failed to revise from suggestion", payload)
            return
          }

          await onLoadConcepts(selectedWorkItem)
          await onRefreshGraph(selectedWorkItem)

          setSuggestions((prev) =>
            Array.isArray(prev)
              ? prev.filter((s) => s !== suggestion)
              : prev
          )
        } finally {
          onSetLoading(false)
        }
        return
      }

      case 'Discard':
      case 'Cancel':
      case 'Reject': {
        onSetActiveRevisionId(null)
        onSetEditorValue("")
        setSuggestions((prev) =>
          Array.isArray(prev)
            ? prev.filter((s) => s !== suggestion)
            : prev
        )
        break
      }

      default:
        break
    }
  }, [apiFetch, selectedWorkItem, actorForApi, onLoadConcepts, onRefreshGraph, onSetActiveRevisionId, onSetEditorValue, onSetLoading, onSetLoadingMessage])

  const discardSuggestion = useCallback((index: number) => {
    setSuggestions((prev) => prev ? prev.filter((_, i) => i !== index) : prev)
  }, [])

  const actionLabelForAction = (action: string, payload: SuggestionPayload): { actionLabel: string; graphDescription: string; hasPayloadData: boolean } => {
    const payloadConcepts = payload.concepts || []
    const payloadRelations = payload.relations || []
    const payloadRevisions = payload.revisions || []
    const hasPayloadData = payloadConcepts.length > 0 || payloadRelations.length > 0 || payloadRevisions.length > 0 || !!payload.conceptKey || !!payload.markdown

    let actionLabel = ""
    let graphDescription = ""

    const normalizedAction = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();

    switch (normalizedAction) {
      case 'Create':
        actionLabel = "Create"
        graphDescription = [
          payloadConcepts.length > 0 && `${payloadConcepts.length} concept(s)`,
          payloadRelations.length > 0 && `${payloadRelations.length} relation(s)`,
          payloadRevisions.length > 0 && `${payloadRevisions.length} revision(s)`,
        ].filter(Boolean).join(", ") || "No graph data"
        break
      case 'Revise':
      case 'Update':
        actionLabel = "Revise"
        graphDescription = payload.conceptKey
          ? `concept "${payload.conceptKey}" — update its revision content`
          : "No graph data"
        break
      case 'Discard':
      case 'Cancel':
      case 'Reject':
        actionLabel = "Discard"
        graphDescription = "No graph changes"
        break
      default:
        actionLabel = action
        graphDescription = hasPayloadData ? "Graph changes available" : "No graph data"
        break
    }

    return { actionLabel, graphDescription, hasPayloadData }
  }

  const buildConfirmMessage = (suggestion: EvaluatorSuggestion): { confirmMessage: string; confirmLabel: string } => {
    const { action, payload } = suggestion
    const payloadConcepts = payload.concepts || []
    const payloadRelations = payload.relations || []
    const payloadRevisions = payload.revisions || []
    const hasPayloadData = payloadConcepts.length > 0 || payloadRelations.length > 0 || payloadRevisions.length > 0 || !!payload.conceptKey || !!payload.markdown

    if (["Discard", "Cancel", "Reject"].includes(action)) {
      return { confirmMessage: "No updates will be performed. Discard this suggestion?", confirmLabel: "Discard" }
    } else if (["Revise", "Update"].includes(action) && payload.conceptKey) {
      return { confirmMessage: `Revision will be created for concept "${payload.conceptKey}". Continue?`, confirmLabel: "Continue" }
    } else if (action === "Create") {
      const parts: string[] = []
      if (payloadConcepts.length > 0) parts.push(`${payloadConcepts.length} concept(s)`)
      if (payloadRelations.length > 0) parts.push(`${payloadRelations.length} relation(s)`)
      if (payloadRevisions.length > 0) parts.push(`${payloadRevisions.length} revision(s)`)
      const desc = parts.join(", ") || "no graph data"
      return { confirmMessage: `${desc} will be created. Continue?`, confirmLabel: "Continue" }
    } else {
      return {
        confirmMessage: hasPayloadData
          ? "This action will modify the graph. Continue?"
          : "No updates can be performed. Discard this suggestion?",
        confirmLabel: hasPayloadData ? "Continue" : "Discard",
      }
    }
  }

  return (
    <section data-agent="llm-suggestions-section">
      <div className="title">👺 Evaluate work item with LLM</div>

      <label
        style={{
          fontFamily: "monospace",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={evaluateDemoMode}
          onChange={(e) => setEvaluateDemoMode(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        Demo report mode
      </label>

      <button
        data-agent="btn-llm-suggestions"
        onClick={() => {
          const action = () => { suggestWithLLM(selectedWorkItem) }

          if (activeRevisionId) {
            onSetPendingConfirm({
              message: "You have an active revision in progress. Discard it and generate suggestions with LLM?",
              onConfirm: action,
            })
          } else {
            action()
          }
        }}
        style={brutal.button}
      >
        Evaluate
      </button>

      <article>
        {!!suggestions && selectedWorkItemData && (
          <>
            <h1>Completeness Report: {selectedWorkItemData.name}</h1>
          </>
        )}
        {!!suggestions && (
          [...suggestions].sort((a, b) => {
            const order: Record<SuggestionImportance, number> = { "Very high": 4, "High": 3, "Medium": 2, "Low": 1 }
            return (order[b.importance ?? "Low"] ?? 0) - (order[a.importance ?? "Low"] ?? 0)
          }).map((suggestion, index) => {
            const suggestionKey = suggestion.text.slice(0, 64).replaceAll(" ", "-")
            const { actionLabel, graphDescription, hasPayloadData } = actionLabelForAction(suggestion.action, suggestion.payload)

            return (
              <div
                key={suggestionKey}
                style={{
                  ...brutal.box,
                }}
              >
                <>
                  <p data-agent={`suggestion-${suggestionKey}`}>
                    {suggestion.importance && (
                      <span
                        style={{
                          ...brutal.tag,
                          background: importanceColor[suggestion.importance] || "#999",
                          marginRight: 8,
                        }}
                      >
                        {suggestion.importance}
                      </span>
                    )}
                    {suggestion.text}
                  </p>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                    <span
                      style={{
                        ...brutal.tag,
                        background: actionColor[actionLabel] || "#999",
                      }}
                    >
                      {actionLabel}
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: hasPayloadData ? "#333" : "#999",
                        fontStyle: hasPayloadData ? "normal" : "italic",
                      }}
                    >
                      {graphDescription}
                    </span>
                  </div>

                  {suggestion.reason && (
                    <p>Reason: {suggestion.reason}</p>
                  )}
                </>
                <div style={brutal.actions}>
                  <button
                    data-agent={`btn-act-on-suggestion-${index}`}
                    onClick={() => {
                      const { confirmMessage, confirmLabel } = buildConfirmMessage(suggestion)

                      if (activeRevisionId) {
                        onSetPendingConfirm({
                          message: `You have an active revision in progress. ${confirmMessage}`,
                          onConfirm: () => actOnSuggestion(suggestion),
                          confirmLabel,
                          cancelLabel: "Cancel",
                        })
                      } else {
                        onSetPendingConfirm({
                          message: confirmMessage,
                          onConfirm: () => actOnSuggestion(suggestion),
                          confirmLabel,
                          cancelLabel: "Cancel",
                        })
                      }
                    }}
                    style={{ ...brutal.button, background: SemanticColor.SUCCESS } as React.CSSProperties}
                  >
                    Act on
                  </button>
                  <button
                    data-agent={`btn-discard-suggestion-${index}`}
                    onClick={() => discardSuggestion(index)}
                    style={{ ...brutal.button, background: SemanticColor.DANGER }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )
          })
        )}
      </article>
    </section>
  )
}
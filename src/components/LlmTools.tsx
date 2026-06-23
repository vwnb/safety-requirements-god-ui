import { useCallback, useEffect, useState } from "react"
import { brutal } from "../App"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"

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
  actedOn?: "ACTED_ON" | "DISCARDED"
  actedOnBy?: { name?: string }
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
  const [latestReportNotFound, setLatestReportNotFound] = useState(false)
  const [evaluationResultId, setEvaluationResultId] = useState<string | null>(null)

  useEffect(() => {
    setSuggestions(null)
    setLatestReportNotFound(false)
    setEvaluationResultId(null)
    if (selectedWorkItem) {
      apiFetch(`${API}/work-items/${selectedWorkItem}/evaluation-results/latest`, {
        headers: { "x-suppress-error-toast": "404" }
      })
        .then(res => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Failed to load latest suggestions")
        })
        .then(data => {
          if (data) {
            if (data.id) setEvaluationResultId(data.id)
            if (data.suggestions) {
              // Propagate the top-level actedOn/actedOnById to each suggestion if they don't have their own
              const suggestionsArr = data.suggestions as EvaluatorSuggestion[]
              const enriched = data.actedOn
                ? suggestionsArr.map((s: EvaluatorSuggestion) => ({
                    ...s,
                    actedOn: s.actedOn || (data.actedOn as "ACTED_ON" | "DISCARDED"),
                    actedOnBy: s.actedOnBy || (data.actedOnById ? { name: data.actedOnById } : undefined),
                  }))
                : suggestionsArr
              setSuggestions(enriched)
            }
          }
        })
        .catch(err => {
          if (err?.status === 404) {
            setLatestReportNotFound(true)
          } else {
            console.error(err)
          }
        })
    }
  }, [selectedWorkItem, API, apiFetch])

  const actOnEvaluationResult = useCallback(async (evaluationResultId: string, actedOn: "ACTED_ON" | "DISCARDED") => {
    try {
      const res = await apiFetch(`${API}/evaluation-results/${evaluationResultId}/act`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actedOn }),
      })
      if (res.ok) {
        const updated = await res.json()
        if (updated.suggestions) {
          const suggestionsArr = updated.suggestions as EvaluatorSuggestion[]
          const enriched = updated.actedOn
            ? suggestionsArr.map((s: EvaluatorSuggestion) => ({
                ...s,
                actedOn: s.actedOn || (updated.actedOn as "ACTED_ON" | "DISCARDED"),
                actedOnBy: s.actedOnBy || (updated.actedOnById ? { name: updated.actedOnById } : undefined),
              }))
            : suggestionsArr
          setSuggestions(enriched)
        }
      }
    } catch (err) {
      console.error("Failed to act on evaluation result", err)
    }
  }, [apiFetch, API])

  const suggestWithLLM = async (workItemId: string) => {
    if (!selectedWorkItem) return

    onSetLoading(true)
    onSetLoadingMessage("👺 Generating suggestions with LLM...")

    try {
      const res = await apiFetch(`${API}/evaluate-work-item/${workItemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo: false,
          user: actorForApi,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate suggestions")

      const suggestionsData = await res.json()
      if (suggestionsData.suggestions) {
        const suggestionsArr = suggestionsData.suggestions as EvaluatorSuggestion[]
        const enriched = suggestionsData.actedOn
          ? suggestionsArr.map((s: EvaluatorSuggestion) => ({
              ...s,
              actedOn: s.actedOn || (suggestionsData.actedOn as "ACTED_ON" | "DISCARDED"),
              actedOnBy: s.actedOnBy || (suggestionsData.actedOnById ? { name: suggestionsData.actedOnById } : undefined),
            }))
          : suggestionsArr
        setSuggestions(enriched)
      }
      if (suggestionsData.id) setEvaluationResultId(suggestionsData.id)
      setLatestReportNotFound(false)
    } catch (err) {
      console.error(err)
    } finally {
      onSetLoading(false)
    }
  }

  const markSuggestion = useCallback((index: number, status: "ACTED_ON" | "DISCARDED") => {
    setSuggestions((prev) => {
      if (!Array.isArray(prev)) return prev
      const updated = [...prev]
      updated[index] = { ...updated[index], actedOn: status, actedOnBy: { name: actorForApi } }
      return updated
    })
  }, [actorForApi])

  const actOnSuggestion = useCallback(async (suggestion: EvaluatorSuggestion, index: number) => {
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

          // Mark evaluation result as acted on
          if (evaluationResultId) {
            actOnEvaluationResult(evaluationResultId, "ACTED_ON")
          }

          markSuggestion(index, "ACTED_ON")
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

          // Mark evaluation result as acted on
          if (evaluationResultId) {
            actOnEvaluationResult(evaluationResultId, "ACTED_ON")
          }

          markSuggestion(index, "ACTED_ON")
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
        // Mark evaluation result as discarded
        if (evaluationResultId) {
          actOnEvaluationResult(evaluationResultId, "DISCARDED")
        }
        markSuggestion(index, "DISCARDED")
        break
      }

      default:
        break
    }
  }, [apiFetch, selectedWorkItem, actorForApi, onLoadConcepts, onRefreshGraph, onSetActiveRevisionId, onSetEditorValue, onSetLoading, onSetLoadingMessage, evaluationResultId, actOnEvaluationResult, markSuggestion])

  const discardSuggestion = useCallback((index: number) => {
    // Mark evaluation result as discarded
    if (evaluationResultId) {
      actOnEvaluationResult(evaluationResultId, "DISCARDED")
    }
    markSuggestion(index, "DISCARDED")
  }, [evaluationResultId, actOnEvaluationResult, markSuggestion])

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
      <div className="title" style={{ display: "flex", alignItems: "center" }}>
        Evaluate work item with LLM
        <InfoButton
          title="Evaluate Work Item with LLM"
          content="LLM evaluation gives you a quick safety review of a work item. It helps spot missing links, overlooked hazards, and gaps in safety requirements."
        />
      </div>

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
        {latestReportNotFound && (
          <div>
            No completeness report has been generated yet. Evaluate the work item to see LLM suggestions.
          </div>
        )}
        {!!suggestions && selectedWorkItemData && (
          <h1>Completeness Report: {selectedWorkItemData.name}</h1>
        )}
        {!!suggestions && (
          [...suggestions].sort((a, b) => {
            const order: Record<SuggestionImportance, number> = { "Very high": 4, "High": 3, "Medium": 2, "Low": 1 }
            return (order[b.importance ?? "Low"] ?? 0) - (order[a.importance ?? "Low"] ?? 0)
          }).map((suggestion, index) => {
            const suggestionKey = suggestion.text.slice(0, 64).replaceAll(" ", "-")
            const { actionLabel, graphDescription, hasPayloadData } = actionLabelForAction(suggestion.action, suggestion.payload)
            const suggestionStatus = suggestion.actedOn

            return (
              <div
                key={suggestionKey}
                style={{
                  ...brutal.box,
                  border: "2px dashed black",
                  background: "rgba(255,255,255,0.5)",
                  opacity: suggestionStatus ? 0.7 : 1,
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
                    {suggestionStatus && (
                      <span
                        style={{
                          ...brutal.tag,
                          background: suggestionStatus === "ACTED_ON" ? SemanticColor.SUCCESS : SemanticColor.DANGER,
                        }}
                      >
                        {suggestionStatus === "ACTED_ON" ? "Acted on" : "Discarded"}
                        {suggestion.actedOnBy?.name && (
                          <span style={{ fontFamily: "monospace", fontSize: 11, marginLeft: 4 }}>
                            by {suggestion.actedOnBy.name}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {suggestion.reason && (
                    <p>Reason: {suggestion.reason}</p>
                  )}
                </>
                {!suggestionStatus && (
                  <div style={brutal.actions}>
                    <button
                      data-agent={`btn-act-on-suggestion-${index}`}
                      onClick={() => {
                        const { confirmMessage, confirmLabel } = buildConfirmMessage(suggestion)

                        if (activeRevisionId) {
                          onSetPendingConfirm({
                            message: `You have an active revision in progress. ${confirmMessage}`,
                            onConfirm: () => actOnSuggestion(suggestion, index),
                            confirmLabel,
                            cancelLabel: "Cancel",
                          })
                        } else {
                          onSetPendingConfirm({
                            message: confirmMessage,
                            onConfirm: () => actOnSuggestion(suggestion, index),
                            confirmLabel,
                            cancelLabel: "Cancel",
                          })
                        }
                      }}
                      style={{ ...brutal.button, fontSize: 10, padding: "4px 8px", background: SemanticColor.SUCCESS } as React.CSSProperties}
                    >
                      Act on
                    </button>
                    <button
                      data-agent={`btn-discard-suggestion-${index}`}
                      onClick={() => discardSuggestion(index)}
                      style={{ ...brutal.button, fontSize: 10, padding: "4px 8px", background: SemanticColor.DANGER }}
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </article>
    </section>
  )
}
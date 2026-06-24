import { useCallback, useEffect, useState } from "react"
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
  id?: string
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
  const [evaluationResults, setEvaluationResults] = useState<Array<{ id: string; createdAt: string }>>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)

  // Fetch list of evaluation results for the dropdown
  useEffect(() => {
    if (!selectedWorkItem) return
    let cancelled = false
    apiFetch(`${API}/work-items/${selectedWorkItem}/evaluation-results`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load evaluation results list")
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        const list: Array<{ id: string; createdAt: string }> = Array.isArray(data) ? data : (Array.isArray(data?.evaluationResults) ? data.evaluationResults : [])
        console.debug("Loaded evaluation results list", list)
        setEvaluationResults(list)
        // auto-select latest report by createdAt desc
        if (list.length > 0) {
          const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setSelectedReportId(sorted[0].id)
        }
      })
      .catch(err => {
        if (!cancelled) console.error(err)
      })
    return () => { cancelled = true }
  }, [selectedWorkItem, API, apiFetch])

  // Fetch selected report by id
  useEffect(() => {
    if (!selectedWorkItem) return
    setSuggestions(null)
    setReportCreatedAt(null)
    if (!selectedReportId) {
      setLatestReportNotFound(false)
      return
    }
    apiFetch(`${API}/evaluation-results/${selectedReportId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load selected evaluation result")
        return res.json()
      })
      .then(data => {
        if (data) {
          if (data.suggestions) {
            setSuggestions(data.suggestions as EvaluatorSuggestion[])
          }
          if (data.createdAt) {
            setReportCreatedAt(data.createdAt)
          }
          setLatestReportNotFound(false)
        }
      })
      .catch(err => {
        console.error(err)
        setLatestReportNotFound(true)
      })
  }, [selectedWorkItem, selectedReportId, API, apiFetch])

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
        setSuggestions(suggestionsData.suggestions as EvaluatorSuggestion[])
      }
      setLatestReportNotFound(false)
    } catch (err) {
      console.error(err)
    } finally {
      onSetLoading(false)
    }
  }

  const actOnSuggestionApi = useCallback(async (suggestionId: string, actedOn: "ACTED_ON" | "DISCARDED") => {
    try {
      const res = await apiFetch(`${API}/suggestions/${suggestionId}/act`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actedOn }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error("Failed to act on suggestion", err)
    }
    return null
  }, [apiFetch, API])

  const markSuggestion = useCallback((index: number, status: "ACTED_ON" | "DISCARDED") => {
    setSuggestions((prev) => {
      if (!Array.isArray(prev)) return prev
      const updated = [...prev]
      const suggestion = updated[index]
      const suggestionId = suggestion.id
      updated[index] = { ...suggestion, actedOn: status }
      if (suggestionId) {
        actOnSuggestionApi(suggestionId, status).then((result) => {
          if (result?.actedOnBy) {
            setSuggestions((prev) => {
              if (!Array.isArray(prev)) return prev
              const updated = [...prev]
              const current = updated[index]
              if (current) {
                updated[index] = { ...current, actedOnBy: result.actedOnBy }
              }
              return updated
            })
          }
        })
      }
      return updated
    })
  }, [actOnSuggestionApi])

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
        markSuggestion(index, "DISCARDED")
        break
      }

      default:
        break
    }
  }, [apiFetch, selectedWorkItem, actorForApi, onLoadConcepts, onRefreshGraph, onSetActiveRevisionId, onSetEditorValue, onSetLoading, onSetLoadingMessage, markSuggestion])

  const discardSuggestion = useCallback((index: number) => {
    markSuggestion(index, "DISCARDED")
  }, [markSuggestion])

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
      <div className="title llm-tools-header">
        Evaluate work item with LLM
        <InfoButton
          title="Evaluate work item with LLM"
          content="LLM evaluation gives you a quick safety review of a work item. It helps spot missing links, overlooked hazards, and gaps in safety requirements."
        />
      </div>

      <div className="llm-actions cms-layout">
        <div>
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
            className="btn btn-generate"
          >
            Generate new completeness report
          </button>
        </div>
        {selectedWorkItem && (
          <div className="report-archive">
            <label htmlFor="report-select">Select report: </label>
            <select
              id="report-select"
              value={selectedReportId ?? ""}
              onChange={e => {
                const val = e.target.value
                setSelectedReportId(val ? val : null)
              }}
            >
              <option value="">-- Select report --</option>
              {evaluationResults.map(r => (
                <option key={r.id} value={r.id}>
                  {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <article>
        {latestReportNotFound && (
          <div>
            No completeness report has been generated yet. Evaluate the work item to see LLM suggestions.
          </div>
        )}
        {!!suggestions && selectedWorkItemData && (
          <>
            <h1>Completeness report: {selectedWorkItemData.name}</h1>
            {reportCreatedAt && (
              <div className="report-meta">Created: {new Date(reportCreatedAt).toLocaleString()}</div>
            )}
          </>
        )}
        {!!suggestions && (
          [...suggestions].sort((a, b) => {
            const order: Record<SuggestionImportance, number> = { "Very high": 4, "High": 3, "Medium": 2, "Low": 1 }
            return (order[b.importance ?? "Low"] ?? 0) - (order[a.importance ?? "Low"] ?? 0)
          }).map((suggestion, index) => {
            const suggestionKey = suggestion.text.slice(0, 64).replaceAll(" ", "-")
            const { actionLabel, graphDescription, hasPayloadData } = actionLabelForAction(suggestion.action, suggestion.payload)
            const suggestionStatus = suggestion.actedOn

            const cardClass = suggestionStatus ? "card suggestion-card suggestion-card-processed" : "card suggestion-card"

            return (
              <div
                key={suggestionKey}
                className={cardClass}
              >
                <>
                  <p data-agent={`suggestion-${suggestionKey}`}>
                    {suggestion.importance && (
                      <span
                        className="tag suggestion-importance"
                        style={{ background: importanceColor[suggestion.importance] || "#999" }}
                      >
                        {suggestion.importance}
                      </span>
                    )}
                    {suggestion.text}
                  </p>

                  <div className="suggestion-meta">
                    <span
                      className="tag"
                      style={{ background: actionColor[actionLabel] || "#999" }}
                    >
                      {actionLabel}
                    </span>
                    <span
                      className={hasPayloadData ? "suggestion-graph-description" : "suggestion-graph-description-empty"}
                    >
                      {graphDescription}
                    </span>
                  </div>

                  {suggestion.reason && (
                    <p>Reason: {suggestion.reason}</p>
                  )}
                </>
                <hr className="suggestion-divider" />
                {!suggestionStatus && (
                  <div className="suggestion-actions">
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
                      className="btn btn-success"
                    >
                      Act on
                    </button>
                    <button
                      data-agent={`btn-discard-suggestion-${index}`}
                      onClick={() => discardSuggestion(index)}
                      className="btn btn-danger"
                    >
                      Discard
                    </button>
                  </div>
                )}
                {suggestionStatus && (
                  <span
                    className="tag suggestion-status"
                    style={{ background: suggestionStatus === "ACTED_ON" ? SemanticColor.SUCCESS : SemanticColor.DANGER }}
                  >
                    {suggestionStatus === "ACTED_ON" ? "Acted on" : "Discarded"}
                    {suggestion.actedOnBy?.name && (
                      <span className="suggestion-status-name">
                        by {suggestion.actedOnBy.name}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )
          })
        )}
      </article>
    </section>
  )
}
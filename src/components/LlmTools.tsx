import { useCallback, useEffect, useRef, useState } from "react"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"
import Modal from "./Modal"

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

type SuggestionAction = "Create" | "Revise" | "Remove" | "Update" | "Discard" | "Cancel" | "Reject"

type SuggestionImportance = "Very high" | "High" | "Medium" | "Low"

type PayloadConcept = {
  key: string
  title: string
  type: string
  // Legacy / optional enrichment fields still accepted but not part of the schema.
  phase?: string
  asil?: string
  sil?: string
  pl?: string
  standards?: string[]
}

type PayloadRevision = {
  conceptKey: string
  markdown: string
  versionMajor: number
  versionMinor: number
  versionPatch: number
}

type PayloadRelation = {
  fromKey: string
  toKey: string
  type: string
  rationale?: string
}

type SuggestionPayload = {
  concepts?: PayloadConcept[]
  revisions?: PayloadRevision[]
  relations?: PayloadRelation[]
  conceptKey?: string
  markdown?: string
  // Remove action payload
  relationIds?: string[]
  // Remove action payload (concept delete)
  conceptKeys?: string[]
}

type EvaluatorSuggestion = {
  id?: string
  text: string
  importance: SuggestionImportance
  action: SuggestionAction
  payload: SuggestionPayload
  reason: string
  actedOn?: "ACTED_ON" | "DISCARDED"
  actedOnBy?: { name?: string }
}

// Coerce an unknown suggestions payload (from API responses) into an array.
// This guards the render path (which spreads `suggestions`) from ever receiving a
// non-iterable value, which would throw "X is not iterable" and crash the UI.
function toSuggestionArray(raw: unknown): EvaluatorSuggestion[] {
  if (Array.isArray(raw)) return raw as EvaluatorSuggestion[]
  // Some/nested/object-shaped responses may wrap the list under `suggestions`.
  if (raw && typeof raw === "object") {
    const wrapped = (raw as { suggestions?: unknown }).suggestions
    if (Array.isArray(wrapped)) return wrapped as EvaluatorSuggestion[]
  }
  return []
}

// Convert a thrown error (e.g. the ApiError thrown by apiFetch on non-2xx) into
// readable text so it can be surfaced in the warnings modal instead of silently
// choking the "Act on suggestion" handler.
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return String(err)
}

const actionColor: Record<string, string> = {
  "Create": SemanticColor.SUCCESS,
  "Revise": SemanticColor.SUCCESS,
  "Remove": SemanticColor.DANGER,
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
  concepts: Array<{ id: string; key: string }> | null
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
  concepts,
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

  // Warnings collected while acting on a suggestion are surfaced in a modal.
  type CollectedWarning = { message: string; payload?: unknown }
  const warningsRef = useRef<CollectedWarning[]>([])
  const [warningsModal, setWarningsModal] = useState<CollectedWarning[] | null>(null)

  // Collect a console.warn so it can be shown to the user in a modal.
  // The textual message and the JSON payload are stored separately.
  const collectWarning = useCallback((message: string, payload?: unknown) => {
    console.warn(message, payload ?? "")
    warningsRef.current.push({ message, payload })
  }, [])

  // Fetch the full list of evaluation results for the dropdown.
  // We always read the whole list from the API so newly generated reports
  // show up reliably instead of relying on merging data from a single POST.
  const loadEvaluationResults = useCallback(async (): Promise<Array<{ id: string; createdAt: string }>> => {
    if (!selectedWorkItem) return []
    const res = await apiFetch(`${API}/work-items/${selectedWorkItem}/evaluation-results`)
    if (!res.ok) throw new Error("Failed to load evaluation results list")
    const data = await res.json()
    return Array.isArray(data) ? data : (Array.isArray(data?.evaluationResults) ? data.evaluationResults : [])
  }, [selectedWorkItem, API, apiFetch])

  useEffect(() => {
    if (!selectedWorkItem) return
    let cancelled = false
    loadEvaluationResults()
      .then(list => {
        if (cancelled) return
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
  }, [selectedWorkItem, loadEvaluationResults])

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
            setSuggestions(toSuggestionArray(data.suggestions))
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
      const newSuggestions = toSuggestionArray(
        suggestionsData && typeof suggestionsData === "object"
          ? (Array.isArray(suggestionsData) ? suggestionsData : suggestionsData.suggestions)
          : suggestionsData
      )
      setSuggestions(newSuggestions)
      
      const createdAt = (suggestionsData && typeof suggestionsData === "object"
        ? suggestionsData.createdAt ?? suggestionsData.report?.createdAt
        : undefined
      )
      setReportCreatedAt(createdAt ?? null)
      setLatestReportNotFound(newSuggestions.length === 0)

      try {
        const list = await loadEvaluationResults()
        setEvaluationResults(list)

        const newReport = suggestionsData && typeof suggestionsData === "object"
          ? (suggestionsData.report ?? suggestionsData)
          : null
        const newReportId = newReport && typeof newReport === "object"
          && typeof (newReport.id ?? newReport.reportId) === "string"
          ? (newReport.id ?? newReport.reportId)
          : null

        if (newReportId && list.some(r => r.id === newReportId)) {
          setSelectedReportId(newReportId)
        } else if (list.length > 0) {
          const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setSelectedReportId(sorted[0].id)
        }
      } catch (err) {
        console.error(err)
      }
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

  const markSuggestion = useCallback((suggestionId: string | undefined, status: "ACTED_ON" | "DISCARDED") => {
    setSuggestions((prev) => {
      if (!Array.isArray(prev)) return prev
      const updated = prev.map((s) => {
        if (s.id && s.id === suggestionId) {
          return { ...s, actedOn: status }
        }
        return s
      })
      if (suggestionId) {
        actOnSuggestionApi(suggestionId, status).then((result) => {
          if (result?.actedOnBy) {
            setSuggestions((prevInner) => {
              if (!Array.isArray(prevInner)) return prevInner
              return prevInner.map((s) => {
                if (s.id && s.id === suggestionId) {
                  return { ...s, actedOnBy: result.actedOnBy }
                }
                return s
              })
            })
          }
        })
      }
      return updated
    })
  }, [actOnSuggestionApi])

  const actOnSuggestion = useCallback(async (suggestion: EvaluatorSuggestion) => {
    warningsRef.current = []

    try {
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
              sourceConceptKey: r.fromKey,
              targetConceptKey: r.toKey,
              fromKey: r.fromKey,
              toKey: r.toKey,
              type: r.type,
            }))

            let res: Response
            try {
              res = await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
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
                collectWarning(`Failed to create from suggestion (HTTP ${res.status})`, payload)
                return
              }
            } catch (err) {
              collectWarning(`Failed to create from suggestion: ${describeError(err)}`, payload)
              return
            }

            await onLoadConcepts(selectedWorkItem)
            await onRefreshGraph(selectedWorkItem)
            markSuggestion(suggestion.id, "ACTED_ON")
          } finally {
            onSetLoading(false)
          }
          return
        }

        case 'Revise': {
          if (!selectedWorkItem) return

          if (!payload.conceptKey || !payload.markdown) {
            collectWarning("Revise suggestion is missing conceptKey/markdown", payload)
            return
          }

          const concept = (concepts ?? []).find((c) => c.key === payload.conceptKey)
          if (!concept) {
            collectWarning(`Revise suggestion references unknown concept "${payload.conceptKey}"`, payload)
            return
          }

          onSetLoading(true)
          onSetLoadingMessage("Revising from suggestion...")

          try {
            let res: Response
            try {
              res = await apiFetch(`${API}/workflow/submit-change`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conceptId: concept.id,
                  markdown: payload.markdown,
                  user: actorForApi,
                }),
              })

              if (!res.ok) {
                collectWarning(`Failed to revise from suggestion (HTTP ${res.status})`, payload)
                return
              }
            } catch (err) {
              collectWarning(`Failed to revise from suggestion: ${describeError(err)}`, payload)
              return
            }

            await onLoadConcepts(selectedWorkItem)
            await onRefreshGraph(selectedWorkItem)
            markSuggestion(suggestion.id, "ACTED_ON")
          } finally {
            onSetLoading(false)
          }
          return
        }

      case 'Remove': {
          if (!selectedWorkItem) return

          const relationIds = payload.relationIds ?? []
          const conceptKeys = payload.conceptKeys ?? []

          if (relationIds.length === 0 && conceptKeys.length === 0) {
            collectWarning("Remove suggestion has no relationIds or conceptKeys; nothing to remove.", payload)
            markSuggestion(suggestion.id, "ACTED_ON")
            return
          }

          onSetLoading(true)
          onSetLoadingMessage("Removing from suggestion...")

          try {
            // Delete concepts by key (removes all of their revisions and related relations)
            for (const conceptKey of conceptKeys) {
              const concept = (concepts ?? []).find((c) => c.key === conceptKey)
              if (!concept) {
                collectWarning(`Remove suggestion references unknown concept "${conceptKey}"`, payload)
                continue
              }
              try {
                const res = await apiFetch(`${API}/concepts/${concept.id}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                })
                if (!res.ok) {
                  collectWarning(`Failed to remove concept "${conceptKey}" (HTTP ${res.status})`, payload)
                  return
                }
              } catch (err) {
                collectWarning(`Failed to remove concept "${conceptKey}": ${describeError(err)}`, payload)
                return
              }
            }

            // Delete relations by id
            for (const relationId of relationIds) {
              try {
                const res = await apiFetch(`${API}/relations/${relationId}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                })
                if (!res.ok) {
                  collectWarning(`Failed to remove relation "${relationId}" (HTTP ${res.status})`, payload)
                  return
                }
              } catch (err) {
                collectWarning(`Failed to remove relation "${relationId}": ${describeError(err)}`, payload)
                return
              }
            }

            await onLoadConcepts(selectedWorkItem)
            await onRefreshGraph(selectedWorkItem)
            markSuggestion(suggestion.id, "ACTED_ON")
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
          markSuggestion(suggestion.id, "DISCARDED")
          break
        }

        default:
          break
      }
    } finally {
      if (warningsRef.current.length > 0) {
        setWarningsModal([...warningsRef.current])
      }
    }
  }, [apiFetch, selectedWorkItem, actorForApi, concepts, onLoadConcepts, onRefreshGraph, onSetActiveRevisionId, onSetEditorValue, onSetLoading, onSetLoadingMessage, markSuggestion, collectWarning])

  const discardSuggestion = useCallback((suggestionId: string | undefined) => {
    markSuggestion(suggestionId, "DISCARDED")
  }, [markSuggestion])

  const actionLabelForAction = (action: string, payload: SuggestionPayload): { actionLabel: string; graphDescription: string; hasPayloadData: boolean } => {
    const payloadConcepts = payload.concepts || []
    const payloadRelations = payload.relations || []
    const payloadRevisions = payload.revisions || []
    const hasPayloadData = payloadConcepts.length > 0 || payloadRelations.length > 0 || payloadRevisions.length > 0 || !!payload.conceptKey || !!payload.markdown || (payload.relationIds?.length ?? 0) > 0 || (payload.conceptKeys?.length ?? 0) > 0

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
      case 'Remove':
        actionLabel = "Remove"
        {
          const relationCount = payload.relationIds?.length ?? 0
          const conceptCount = payload.conceptKeys?.length ?? 0
          graphDescription = relationCount && conceptCount
            ? `${relationCount} relation(s) and ${conceptCount} concept(s) to remove`
            : relationCount
              ? `${relationCount} relation(s) to remove`
              : conceptCount
                ? `${conceptCount} concept(s) to remove`
                : "No graph data"
        }
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
    const hasPayloadData = payloadConcepts.length > 0 || payloadRelations.length > 0 || payloadRevisions.length > 0 || !!payload.conceptKey || !!payload.markdown || (payload.conceptKeys?.length ?? 0) > 0

    if (["Discard", "Cancel", "Reject"].includes(action)) {
      return { confirmMessage: "No updates will be performed. Discard this suggestion?", confirmLabel: "Discard" }
    } else if (["Revise", "Update"].includes(action) && payload.conceptKey) {
      return { confirmMessage: `Revision will be created for concept "${payload.conceptKey}". Continue?`, confirmLabel: "Continue" }
    } else if (action === "Remove") {
      const relationCount = payload.relationIds?.length ?? 0
      const conceptCount = payload.conceptKeys?.length ?? 0
      if (conceptCount > 0 && relationCount > 0) {
        return { confirmMessage: `${conceptCount} concept(s) and ${relationCount} relation(s) will be removed from the graph. Continue?`, confirmLabel: "Continue" }
      } else if (conceptCount > 0) {
        return { confirmMessage: `${conceptCount} concept(s) (including all of their revisions and related relations) will be removed from the graph. Continue?`, confirmLabel: "Continue" }
      } else if (relationCount > 0) {
        return { confirmMessage: `${relationCount} relation(s) will be removed from the graph. Continue?`, confirmLabel: "Continue" }
      }
      return { confirmMessage: "No relations or concepts to remove. Discard this suggestion?", confirmLabel: "Discard" }
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
            Generate new refinement report
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
            No refinement report has been generated yet. Evaluate the work item to see LLM suggestions.
          </div>
        )}
        {!!suggestions && selectedWorkItemData && (
          <>
            <h1>Refinement report: {selectedWorkItemData.name}</h1>
            {reportCreatedAt && (
              <div className="report-meta">Created: {new Date(reportCreatedAt).toLocaleString()}</div>
            )}
          </>
        )}
        {!!suggestions && (
          [...suggestions]
            .sort((a, b) => {
              const order: Record<SuggestionImportance, number> = { "Very high": 4, "High": 3, "Medium": 2, "Low": 1 };
              return (order[b.importance ?? "Low"] ?? 0) - (order[a.importance ?? "Low"] ?? 0);
            })
            .map((suggestion, index) => {
            const { actionLabel, graphDescription, hasPayloadData } = actionLabelForAction(suggestion.action, suggestion.payload)
            const suggestionStatus = suggestion.actedOn

            const cardClass = suggestionStatus ? "card suggestion-card suggestion-card-processed" : "card suggestion-card"

            return (
              <div
                key={suggestion.id}
                className={cardClass}
              >
                <>
                  <p data-agent={`suggestion-${suggestion.id}`}>
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
                      className="btn btn-success"
                    >
                      Act on
                    </button>
                    <button
                      data-agent={`btn-discard-suggestion-${index}`}
                      onClick={() => discardSuggestion(suggestion.id)}
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

      {warningsModal && (
        <Modal
          title="LLM action stopped"
          onClose={() => setWarningsModal(null)}
          width={520}
        >
          <article>
            {warningsModal.map((w, i) => (
              <section key={i}>
                <p>{w.message}</p>
                {w.payload !== undefined && (
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      background: "#fff",
                      border: "2px solid black",
                      borderRadius: 4,
                      padding: "10px 12px",
                    }}
                  >
                    {JSON.stringify(w.payload, null, 2)}
                  </pre>
                )}
              </section>
            ))}
          </article>
          <div className="mt-16">
            <button
              data-agent="btn-close-llm-warnings"
              onClick={() => setWarningsModal(null)}
              className="btn btn-danger"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
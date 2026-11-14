import { useCallback, useEffect, useRef, useState } from "react"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"
import Modal from "./Modal"
import AiLabel from "./AiLabel"
import { brutal } from "../App"
import { resolveModelName } from "../lib/resolveModelName"

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
  thumbnail?: string
}

// Evaluation lifecycle exposed by the backend. One evaluation commits one approved selection.
type EvaluationState = "CREATED" | "EVALUATING" | "READY_FOR_REVIEW" | "APPROVED" | "COMMITTED" | "CONFLICTED" | "SUPERSEDED"
type EvaluationLifecycle = {
  state?: EvaluationState
  approvedSuggestionIds?: string[]
  approvedAt?: string | null
  committedAt?: string | null
  conflictReason?: string | null
  supersededById?: string | null
}
const isSelectable = (s: EvaluatorSuggestion) => !!s.id && !s.actedOn && ["Create", "Revise", "Remove"].includes(s.action)

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
  actorName?: string
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  onLoadConcepts: (workItemId?: string) => Promise<void>
  onRefreshGraph: (workItemId: string) => Promise<void>
  onSetPendingConfirm: (confirm: { message: string; onConfirm: () => void; confirmLabel?: string; cancelLabel?: string } | null) => void
  onSetLoading: (loading: boolean) => void
  onSetLoadingMessage: (message: string) => void
  llmPrompt: string
  onSetLlmPrompt: (prompt: string) => void
}

export function LlmTools({
  selectedWorkItem,
  selectedWorkItemData,
  activeRevisionId,
  actorForApi,
  actorName,
  apiFetch,
  onLoadConcepts,
  onRefreshGraph,
  onSetPendingConfirm,
  onSetLoading,
  onSetLoadingMessage,
  llmPrompt,
  onSetLlmPrompt,
}: LlmToolsProps) {
  const API = import.meta.env.VITE_API_URL || ""
  const displayName = actorName || actorForApi

  const [suggestions, setSuggestions] = useState<EvaluatorSuggestion[] | null>(null)
  const [latestReportNotFound, setLatestReportNotFound] = useState(false)
  const [evaluationResults, setEvaluationResults] = useState<Array<{ id: string; createdAt: string; userPrompt?: string; state?: EvaluationState }>>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)
  const [reportUserPrompt, setReportUserPrompt] = useState<string | null>(null)
  const [lifecycle, setLifecycle] = useState<EvaluationLifecycle | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  // Reports from a not-yet-migrated backend have no state; treat them as reviewable.
  const reportState: EvaluationState = lifecycle?.state ?? "READY_FOR_REVIEW"

  // Load persisted suggestions + lifecycle. The approved set is fixed once approved;
  // otherwise default the selection to every pending applicable suggestion.
  const applyReportData = useCallback((data: EvaluationLifecycle & { suggestions?: unknown }) => {
    const list = toSuggestionArray(data.suggestions)
    setSuggestions(list)
    setLifecycle(data)
    setSelection(data.approvedSuggestionIds?.length ? data.approvedSuggestionIds : list.filter(isSelectable).map(s => s.id!))
  }, [])

  // Warnings collected while acting on a suggestion are surfaced in a modal.
  type CollectedWarning = { message: string; payload?: unknown }
  const [warningsModal, setWarningsModal] = useState<CollectedWarning[] | null>(null)

  const [runnerResults, setRunnerResults] = useState<{
    acted: EvaluatorSuggestion[]
    discarded: EvaluatorSuggestion[]
    errors: { suggestion: EvaluatorSuggestion; message: string }[]
  } | null>(null)
  const [runnerModalOpen, setRunnerModalOpen] = useState(false)

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
    // Reset any stale report selection immediately so effects below cannot
    // keep displaying the previous work item's refinement report.
    setSelectedReportId(null)
    setEvaluationResults([])
    loadEvaluationResults()
      .then(list => {
        if (cancelled) return
        setEvaluationResults(list)
        // auto-select latest report by createdAt desc
        if (list.length > 0) {
          const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setSelectedReportId(sorted[0].id)
        } else {
          setSelectedReportId(null)
        }
      })
      .catch(err => {
        if (!cancelled) console.error(err)
      })
    return () => { cancelled = true }
  }, [selectedWorkItem, loadEvaluationResults])

  const reportHeadingRef = useRef<HTMLHeadingElement>(null)
  const lastScrolledReportIdRef = useRef<string | null>(null)
  const pendingScrollRef = useRef(false)

  // Scroll to the refinement report heading whenever a (new) report finishes
  // loading, so the heading stays in view even when its full-height children
  // (the suggestion cards) push the page down.
  useEffect(() => {
    if (!suggestions) return
    if (!selectedReportId) return
    if (!pendingScrollRef.current) return
    if (lastScrolledReportIdRef.current === selectedReportId) return
    lastScrolledReportIdRef.current = selectedReportId
    pendingScrollRef.current = false
    const timeoutId = window.setTimeout(() => {
      reportHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(timeoutId)
  }, [suggestions, selectedReportId])

  // Fetch selected report by id
  useEffect(() => {
    if (!selectedWorkItem) return
    let cancelled = false
    setSuggestions(null)
    setReportCreatedAt(null)
    setReportUserPrompt(null)
    setLifecycle(null)
    setSelection([])
    if (!selectedReportId) {
      setLatestReportNotFound(false)
      return () => { cancelled = true }
    }
    apiFetch(`${API}/evaluation-results/${selectedReportId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load selected evaluation result")
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (data) {
          if (data.suggestions) {
            applyReportData(data)
          }
          if (data.createdAt) {
            setReportCreatedAt(data.createdAt)
            setReportUserPrompt(data.userPrompt ?? (data as { report?: { userPrompt?: string } }).report?.userPrompt ?? null)
          }
          setLatestReportNotFound(false)
        }
      })
      .catch(err => {
        if (cancelled) return
        console.error(err)
        setLatestReportNotFound(true)
      })
    return () => { cancelled = true }
  }, [selectedWorkItem, selectedReportId, API, apiFetch, applyReportData])

  const suggestWithLLM = async (workItemId: string) => {
    if (!selectedWorkItem) return

    onSetLoading(true)

    const modelName = await resolveModelName(apiFetch, API)

    onSetLoadingMessage(`Generating suggestions with ${modelName}...`)

    try {
      const res = await apiFetch(`${API}/evaluate-work-item/${workItemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo: false,
          user: actorForApi,
          prompt: llmPrompt,
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

        pendingScrollRef.current = true
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

  // Approve (persist the exact selection) or apply (approve + commit all-or-nothing).
  const submitSelection = useCallback(async (step: "approve" | "apply") => {
    if (!selectedReportId || !selectedWorkItem || !selection.length) return
    const warnings: CollectedWarning[] = []
    let applied = false
    onSetLoading(true)
    onSetLoadingMessage(step === "approve" ? "Approving selection..." : "Applying approved selection...")
    try {
      const response = await apiFetch(`${API}/work-items/${selectedWorkItem}/evaluation-results/${selectedReportId}/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds: selection }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Request failed (HTTP ${response.status})`)
      if (step === "apply") {
        const failed = (result.results ?? []).filter((r: { status: string }) => !["applied", "already_applied"].includes(r.status))
        if (failed.length) {
          const messages = [...new Set<string>(failed.map((r: { error?: string }) => r.error ?? "Suggestion was not applied"))]
          warnings.push({ message: "No changes were committed." }, ...messages.map(message => ({ message })))
        } else {
          applied = true
          setRunnerResults({ acted: (suggestions ?? []).filter(s => s.id && selection.includes(s.id)), discarded: [], errors: [] })
        }
      }
    } catch (error) {
      warnings.push({ message: describeError(error) })
    }
    // Refresh persisted lifecycle/review state as well as the affected graph.
    const refreshed = await Promise.allSettled([
      (async () => {
        const report = await apiFetch(`${API}/evaluation-results/${selectedReportId}`)
        if (!report.ok) throw new Error("Report refresh failed")
        applyReportData(await report.json())
      })(),
      ...(applied ? [onLoadConcepts(selectedWorkItem), onRefreshGraph(selectedWorkItem)] : []),
    ])
    if (refreshed.some(r => r.status === "rejected")) {
      warnings.push({ message: "Some views could not refresh. Reload the work item and report." })
    }
    onSetLoading(false)
    if (applied) setRunnerModalOpen(true)
    if (warnings.length) setWarningsModal(warnings)
  }, [API, apiFetch, selectedWorkItem, selectedReportId, selection, suggestions, applyReportData, onLoadConcepts, onRefreshGraph, onSetLoading, onSetLoadingMessage])

  const discardSuggestion = useCallback((suggestionId: string | undefined) => {
    markSuggestion(suggestionId, "DISCARDED")
    setSelection(prev => prev.filter(id => id !== suggestionId))
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

  return (
    <section data-agent="llm-suggestions-section">
      <div className="llm-tools-header title">
        Modify work item with LLM
        <InfoButton
          title="Modify work item with LLM"
          content="LLM free prompting can be used to insert, modify or delete graph data. Refinement reports help spot missing links, overlooked hazards, and gaps in safety requirements. The prompt for the refinement report is optional."
        />
      </div>

      <div>
        <input type="text" placeholder="Prompt for refinement report" value={llmPrompt} onChange={e => onSetLlmPrompt(e.target.value)} style={{ ...brutal.input, marginBottom: 10 }} />
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
        <div style={{ marginTop: 10 }}>
          <label htmlFor="report-select">Report archive: </label>
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
                {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {r.userPrompt ? `- ${r.userPrompt.slice(0, 32)}` : "(No prompt)"}{r.state ? ` [${r.state.replace(/_/g, " ").toLowerCase()}]` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <article>
        {latestReportNotFound && (
          <div>
            No refinement report has been generated yet. Evaluate the work item to see LLM suggestions.
          </div>
        )}
        {!!suggestions && selectedWorkItemData && (
          <>
            <h1 ref={reportHeadingRef} id='refinement-report-heading' data-agent='refinement-report-heading'>Refinement report: {selectedWorkItemData.name}</h1>
            <p data-agent="refinement-report-ai-disclosure">
              <AiLabel variant="generated" height={44} text="These suggestions were written by AI. Review them before applying." />
            </p>
            {reportCreatedAt && (
              <div className="report-meta">
                Created: {new Date(reportCreatedAt).toLocaleString()}<br />
                User prompt: {reportUserPrompt ? <span>{reportUserPrompt}</span> : "(No user prompt)"}<br />
                State: {reportState.replace(/_/g, " ").toLowerCase()}
                {lifecycle?.approvedAt && <><br />Approved: {new Date(lifecycle.approvedAt).toLocaleString()}</>}
                {lifecycle?.committedAt && <><br />Committed: {new Date(lifecycle.committedAt).toLocaleString()}</>}
                {lifecycle?.conflictReason && <><br />Conflict: {lifecycle.conflictReason}</>}
                {lifecycle?.supersededById && <><br />Superseded by a newer report.</>}
              </div>
            )}
            {reportState === "READY_FOR_REVIEW" && suggestions.some(isSelectable) && (
              <div className="suggestion-actions" style={{ marginTop: "2em", marginBottom: "1em" }}>
                <button
                  data-agent="btn-approve-selection"
                  disabled={!selection.length}
                  onClick={() => submitSelection("approve")}
                  className="btn"
                >
                  Approve selection ({selection.length})
                </button>
                <button
                  data-agent="btn-runner-mode"
                  disabled={!selection.length}
                  onClick={() => onSetPendingConfirm({
                    message: `${activeRevisionId ? "You have an active revision in progress. " : ""}${selection.length} selected suggestion(s) will be committed together. If any fails, none are applied. Continue?`,
                    onConfirm: () => submitSelection("apply"),
                    confirmLabel: "Continue",
                    cancelLabel: "Cancel",
                  })}
                  className="btn btn-success"
                >
                  Approve and apply selected ({selection.length})
                </button>
              </div>
            )}
            {reportState === "APPROVED" && (
              <button
                data-agent="btn-apply-approved"
                onClick={() => submitSelection("apply")}
                className="btn btn-success"
                style={{ marginTop: "2em", marginBottom: "1em" }}
              >
                Apply approved selection ({selection.length})
              </button>
            )}
            <p>The selected suggestions are committed together: if any fails or conflicts, none are applied. Each report commits one approved selection; to apply a different set, generate a new report. Suggestions that modify the same concept cannot be selected together.</p>
          </>
        )}
        {!suggestions || suggestions.length === 0 && (
          <p>
            This refinement report is empty.
          </p>
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
                    <div style={{ margin: "-8px 0 0 -8px" }}>
                      <AiLabel variant="generated" height={36} />
                    </div>
                    {suggestion.thumbnail && (
                      <img
                        src={suggestion.thumbnail}
                        alt="Suggestion thumbnail"
                        width={128}
                        height={128}
                        style={{ float: 'right' }}
                      />
                    )}
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
                      {isSelectable(suggestion) && (reportState === "READY_FOR_REVIEW" || reportState === "APPROVED") && (
                        <label data-agent={`select-suggestion-${index}`}>
                          <input
                            type="checkbox"
                            checked={selection.includes(suggestion.id!)}
                            disabled={reportState !== "READY_FOR_REVIEW"}
                            onChange={e => {
                              const id = suggestion.id!
                              setSelection(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id))
                            }}
                          />{" "}
                          {reportState === "APPROVED" ? "Approved" : "Include in approved set"}
                        </label>
                      )}
                      {!(reportState === "APPROVED" && selection.includes(suggestion.id!)) && (
                        <button
                          data-agent={`btn-discard-suggestion-${index}`}
                          onClick={() => discardSuggestion(suggestion.id)}
                          className="btn btn-danger"
                        >
                          Discard
                        </button>
                      )}
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

      {runnerModalOpen && runnerResults && (
        <Modal
          title="Runner results"
          onClose={() => setRunnerModalOpen(false)}
          width={560}
        >
          <article>
            <p><strong>Acted on {runnerResults.acted.length} suggestions.</strong></p>
            {runnerResults.acted.length > 0 && (
              <ul>
                {runnerResults.acted.map((s) => (
                  <li key={s.id}>{s.text}</li>
                ))}
              </ul>
            )}
            {runnerResults.discarded.length > 0 && (
              <p>Discarded {runnerResults.discarded.length} suggestions.</p>
            )}
            {runnerResults.errors.length > 0 && (
              <div>
                <p>Errors:</p>
                <ul>
                  {runnerResults.errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <p>
              All changes above were signed in your name: {displayName}
            </p>
          </article>
          <div className="mt-16">
            <button
              data-agent="btn-close-runner-results"
              onClick={() => setRunnerModalOpen(false)}
              className="btn btn-danger"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

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

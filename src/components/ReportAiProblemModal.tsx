import { useState } from "react"
import Modal from "./Modal"

// Lets a user report a problem with an AI suggestion. Reports go to WCGW's
// AI incident register (EN 18286 QMS, EU AI Act Art. 73), where the provider
// triages them; the user does not set severity.
const fieldStyle = { opacity: 1, cursor: "text", background: "white", border: "2px solid black", padding: "6px", fontFamily: "monospace", width: "100%", flex: 1 } as const

export default function ReportAiProblemModal({
  apiFetch,
  api,
  evaluationResultId,
  suggestionId,
  suggestionText,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  api: string
  evaluationResultId?: string | null
  suggestionId?: string
  suggestionText?: string
  onClose: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const ready = title.trim().length > 0 && description.trim().length > 0 && !sending

  const submit = async () => {
    if (!ready) return
    setSending(true)
    setError(null)
    try {
      const res = await apiFetch(`${api}/ai-incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          evaluationResultId: evaluationResultId ?? undefined,
          suggestionId,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Report failed (${res.status})`)
      }
      const created = await res.json()
      setReportId(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  if (reportId) {
    return (
      <Modal title="Problem reported" onClose={onClose} width={520}>
        <article>
          <p>Thank you. Your report is in our AI incident register and will be triaged, investigated and closed with a corrective action.</p>
          <p>Reference: <code>{reportId}</code></p>
        </article>
        <div className="form-actions">
          <button data-agent="btn-close-ai-problem-report" onClick={onClose} className="btn">Close</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Report a problem with an AI suggestion" onClose={onClose} width={560}>
      {suggestionText && (
        <p style={{ marginTop: 0 }}>
          Suggestion: <em>{suggestionText}</em>
        </p>
      )}
      <div className="form-row">
        <div className="field-label">Summary</div>
        <input
          data-agent="input-ai-problem-title"
          placeholder="e.g. Suggested relation removes a safety requirement"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="license-value"
          style={fieldStyle}
        />
      </div>
      <div className="form-row">
        <div className="field-label">What went wrong</div>
        <textarea
          data-agent="input-ai-problem-description"
          placeholder="What did the suggestion say, why is it wrong, and did anyone act on it?"
          maxLength={10000}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="license-value"
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <div className="form-actions">
        <button
          data-agent="btn-submit-ai-problem-report"
          onClick={submit}
          className="btn"
          disabled={!ready}
          style={{ opacity: ready ? 1 : 0.6, cursor: ready ? "pointer" : "not-allowed" }}
        >
          {sending ? "Sending…" : "Send report"}
        </button>
        <button data-agent="btn-cancel-ai-problem-report" onClick={onClose} className="btn btn-danger">
          Cancel
        </button>
      </div>
    </Modal>
  )
}

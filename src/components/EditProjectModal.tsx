import { useState } from "react"
import Modal from "./Modal"

const API = import.meta.env.VITE_API_URL || ""

export function EditProjectModal({
  apiFetch,
  projectId,
  currentKey,
  onUpdated,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  projectId: string
  currentKey: string
  onUpdated: () => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(currentKey)
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch(`${API}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: name.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to update project")
      await onUpdated()
      onClose()
    } catch {
      setError("Failed to update project.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit Project" onClose={onClose}>
      {error && (
        <div className="error-box">
          <p className="error-text">{error}</p>
        </div>
      )}
      <div className="form-row">
        <div className="field-label">Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
          autoFocus
        />
      </div>
      <div className="form-row">
        <div className="field-label">Description</div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
        />
      </div>
      <button
        onClick={handleUpdate}
        disabled={submitting || !name.trim()}
        className="btn"
        style={{ opacity: (submitting || !name.trim()) ? 0.6 : 1, cursor: (submitting || !name.trim()) ? 'not-allowed' : 'pointer' }}
      >
        {submitting ? "Saving..." : "Save"}
      </button>
    </Modal>
  )
}
import { useState } from "react"
import Modal from "./Modal"

const API = import.meta.env.VITE_API_URL || ""

export function CreateProjectModal({
  apiFetch,
  onCreated,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  onCreated: () => Promise<void>
  onClose: () => void
}) {
  const [key, setKey] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!key.trim() || !name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch(`${API}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to create project")
      await onCreated()
      onClose()
    } catch {
      setError("Failed to create project.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Create Project" onClose={onClose}>
      {error && (
        <div className="error-box">
          <p className="error-text">{error}</p>
        </div>
      )}
      <div className="form-row">
        <div className="field-label">Key</div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. MY-PROJECT"
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
          autoFocus
        />
      </div>
      <div className="form-row">
        <div className="field-label">Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
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
        onClick={handleCreate}
        disabled={submitting || !key.trim() || !name.trim()}
        className="btn"
        style={{ opacity: (submitting || !key.trim() || !name.trim()) ? 0.6 : 1, cursor: (submitting || !key.trim() || !name.trim()) ? 'not-allowed' : 'pointer' }}
      >
        {submitting ? "Creating..." : "Create"}
      </button>
    </Modal>
  )
}
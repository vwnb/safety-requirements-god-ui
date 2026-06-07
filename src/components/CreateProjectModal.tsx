import { useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"
import { SemanticColor } from "../lib/SemanticColor"

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
        <div style={{ ...brutal.box, borderColor: SemanticColor.DANGER, marginBottom: 12 }}>
          <p style={{ color: SemanticColor.DANGER, margin: 0 }}>{error}</p>
        </div>
      )}
      <div style={brutal.formRow}>
        <div style={brutal.label}>Key</div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. MY-PROJECT"
          style={brutal.input}
          autoFocus
        />
      </div>
      <div style={brutal.formRow}>
        <div style={brutal.label}>Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
          style={brutal.input}
        />
      </div>
      <div style={brutal.formRow}>
        <div style={brutal.label}>Description</div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          style={brutal.input}
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={submitting || !key.trim() || !name.trim()}
        style={{
          ...brutal.button,
          ...(submitting || !key.trim() || !name.trim() ? brutal.disabled : {}),
        }}
      >
        {submitting ? "Creating..." : "Create"}
      </button>
    </Modal>
  )
}
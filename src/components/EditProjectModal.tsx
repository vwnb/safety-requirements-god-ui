import { useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"

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
        <div style={{ ...brutal.box, border: "2px solid black", marginBottom: 12 }}>
          <p style={{ color: "black", margin: 0 }}>{error}</p>
        </div>
      )}
      <div style={brutal.formRow}>
        <div style={brutal.label}>Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={brutal.input}
          autoFocus
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
        onClick={handleUpdate}
        disabled={submitting || !name.trim()}
        style={{
          ...brutal.button,
          ...(submitting || !name.trim() ? brutal.disabled : {}),
        }}
      >
        {submitting ? "Saving..." : "Save"}
      </button>
    </Modal>
  )
}
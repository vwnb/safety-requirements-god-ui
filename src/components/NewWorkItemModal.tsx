import { useState } from "react"
import Modal from "./Modal"

export default function NewWorkItemModal({
  onCreate,
  onClose,
}: {
  onCreate: (key: string, title: string) => void
  onClose: () => void
}) {
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")

  const handleCreate = () => {
    if (key.trim() && title.trim()) {
      onCreate(key, title)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Modal title="New work item" onClose={onClose}>
      <div className="form-row">
        <div className="field-label">Key</div>
        <input
          data-agent="input-new-work-item-key"
          placeholder="e.g. MYPROJ-001"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        />
      </div>

      <div className="form-row">
        <div className="field-label">Title</div>
        <input
          data-agent="input-new-work-item-title"
          placeholder="e.g. Brake-by-wire system"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        />
      </div>

      <div className="form-actions">
        <button
          data-agent="btn-create-work-item"
          onClick={handleCreate}
          className="btn"
          style={{ opacity: (key.trim() && title.trim()) ? 1 : 0.6, cursor: (key.trim() && title.trim()) ? 'pointer' : 'not-allowed' }}
        >
          Create
        </button>
        <button
          data-agent="btn-cancel-new-work-item"
          onClick={handleCancel}
          className="btn btn-danger"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
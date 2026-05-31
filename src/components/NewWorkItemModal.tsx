import { useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"

export default function NewWorkItemModal({
  onCreate,
  onClose,
}: {
  onCreate: (key: string, title: string) => void
  onClose: () => void
}) {
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")

  return (
    <Modal title="New work item" onClose={onClose}>
      <div style={brutal.formRow}>
        <div style={brutal.label}>Key</div>
        <input
          data-agent="input-new-work-item-key"
          placeholder="e.g. MYPROJ-001"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ ...brutal.input, flex: 1 }}
        />
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>Title</div>
        <input
          data-agent="input-new-work-item-title"
          placeholder="e.g. Brake-by-wire system"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...brutal.input, flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          data-agent="btn-create-work-item"
          onClick={() => onCreate(key, title)}
          style={brutal.button}
        >
          Create
        </button>
        <button
          data-agent="btn-cancel-new-work-item"
          onClick={onClose}
          style={{ ...brutal.button, backgroundColor: "#F2B8B5" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
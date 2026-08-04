import { useState } from "react"
import { brutal } from "../App"
import Modal from "./Modal"

const RELATION_TYPES = [
  "DERIVES_FROM",
  "VALIDATES",
  "VIOLATES",
  "MITIGATES",
  "DEPENDS_ON",
  "REFINES",
  "DUPLICATES",
  "SUPERSEDES",
]

export default function RelationTypePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void
  onClose: () => void
}) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  const close = () => {
    setOpen(false)
    onClose()
  }

  return (
    <Modal onClose={close} width={260}>
      <div
        data-agent="relation-type-picker-title"
        className="title"
      >
        Select relation type
      </div>

      <div className="list-input">
        {RELATION_TYPES.map((t) => (
          <div
            data-agent={`relation-type-${t}`}
            key={t}
            onClick={() => {
              onSelect(t)
              setOpen(false)
            }}
            className="option"
            onMouseEnter={(e) => {
              ; (e.currentTarget.style.background = "black")
                ; (e.currentTarget.style.color = "white")
            }}
            onMouseLeave={(e) => {
              ; (e.currentTarget.style.background = "white")
                ; (e.currentTarget.style.color = "black")
            }}
          >
            {t}
          </div>
        ))}
      </div>

      <button
        data-agent="btn-cancel-relation"
        onClick={close}
        style={brutal.button}
      >
        Cancel
      </button>
    </Modal>
  )
}
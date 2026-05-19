import { useEffect, useRef, useState } from "react"
import { brutal } from "../App"

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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  if (!open) return null

  return (
    <div
      data-agent="relation-type-picker"
      ref={ref}
      style={{
        background: "rgb(233, 237, 233)",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        border: "2px solid black",
        fontFamily: "monospace",
        padding: "2rem",
        zIndex: 9999,
        width: 260,
        borderRadius: 8,
        borderLeftWidth: 6,
      }}
    >
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
        onClick={() => {
          setOpen(false)
          onClose()
        }}
        style={brutal.button}
      >
        Cancel
      </button>
    </div>
  )
}
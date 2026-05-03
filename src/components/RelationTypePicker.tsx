import { useEffect, useRef, useState } from "react"

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
      ref={ref}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        border: "2px solid black",
        background: "white",
        fontFamily: "monospace",
        padding: "2rem",
        zIndex: 9999,
        width: 260,
      }}
    >
      <div
        style={{
          padding: 8,
          borderBottom: "2px solid black",
          fontWeight: "bold",
        }}
      >
        SELECT RELATION
      </div>

      {RELATION_TYPES.map((t) => (
        <div
          key={t}
          onClick={() => {
            onSelect(t)
            setOpen(false)
          }}
          style={{
            padding: 8,
            borderBottom: "1px solid black",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget.style.background = "black")
            ;(e.currentTarget.style.color = "white")
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget.style.background = "white")
            ;(e.currentTarget.style.color = "black")
          }}
        >
          {t}
        </div>
      ))}

      <div
        onClick={() => {
          setOpen(false)
          onClose()
        }}
        style={{
          padding: 8,
          borderTop: "2px solid black",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        CANCEL
      </div>
    </div>
  )
}
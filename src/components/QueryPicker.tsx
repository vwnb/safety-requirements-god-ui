import { useEffect, useRef, useState } from "react"
import { brutal } from "../App"

type QueryOption = {
  value: string
  label: string
}

type QueryCategory = {
  category: string
  options: QueryOption[]
}

type QueryPickerProps = {
  sourceName: string
  categories: QueryCategory[]
  onSelect: (value: string) => void
  onClose: () => void
}

export default function QueryPicker({ sourceName, categories, onSelect, onClose }: QueryPickerProps) {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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
      data-agent="query-picker"
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
        width: 380,
        maxHeight: "80vh",
        overflowY: "auto",
        borderRadius: 8,
      }}
    >
      <div className="title" style={{ marginBottom: 16 }}>
        Query graph from node:
        <br />
        {sourceName}
      </div>

      {categories.map((cat) => (
        <div key={cat.category} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontWeight: "bold",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              opacity: 0.6,
              marginBottom: 6,
              borderBottom: "1px solid rgba(0,0,0,0.2)",
              paddingBottom: 4,
            }}
          >
            {cat.category}
          </div>
          <div className="list-input">
            {cat.options.map((option) => (
              <div
                data-agent={`query-option-${option.value}`}
                key={option.value}
                className="option"
                onClick={() => {
                  onSelect(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        data-agent="query-picker-cancel"
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
import { useState } from "react"
import { brutal } from "../App"
import Modal from "./Modal"
import type { ConceptCentricQueryType } from "./GraphView"

type QueryOption = {
  value: ConceptCentricQueryType
  label: string
}

type QueryCategory = {
  category: string
  options: QueryOption[]
}

type QueryPickerProps = {
  sourceName: string
  categories: QueryCategory[]
  onSelect: (value: ConceptCentricQueryType) => void
  onClose: () => void
}

export default function QueryPicker({ sourceName, categories, onSelect, onClose }: QueryPickerProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  const close = () => {
    setOpen(false)
    onClose()
  }

  return (
    <Modal onClose={close} width={380}>
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
        onClick={close}
        style={brutal.button}
      >
        Cancel
      </button>
    </Modal>
  )
}
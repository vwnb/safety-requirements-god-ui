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
  loading: boolean
  onSelect: (value: ConceptCentricQueryType) => void
  onClose: () => void
}

export default function QueryPicker({
  sourceName,
  categories,
  loading,
  onSelect,
  onClose,
}: QueryPickerProps) {
  return (
    <Modal onClose={onClose} width={380}>
      <div className="title" style={{ marginBottom: 16 }}>
        Query graph from node:
        <br />
        {sourceName}
      </div>

      {loading ? (
        <div
          role="status"
          data-agent="query-picker-loading"
          style={{ opacity: 0.7, marginBottom: 16, fontFamily: "monospace", color: "#555" }}
        >
          Loading query options…
        </div>
      ) : categories.length === 0 ? (
        <p style={{ opacity: 0.7, marginBottom: 16 }}>No query categories available.</p>
      ) : (
        categories.map((cat) => (
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
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <button
        type="button"
        data-agent="query-picker-cancel"
        onClick={onClose}
        style={brutal.button}
      >
        Cancel
      </button>
    </Modal>
  )
}
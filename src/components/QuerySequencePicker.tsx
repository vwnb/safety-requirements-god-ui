import { brutal } from "../App"
import Modal from "./Modal"
import type { QuerySequenceResult, QuerySequenceStep } from "./QuerySequenceTypes"

type QuerySequencePickerProps = {
  goal: string
  running: boolean
  error: string | null
  result: QuerySequenceResult | null
  resolveSourceLabel: (sourceRevisionId: string | null) => string
  onViewStep: (payload: { type: string; sourceRevisionId: string | null }) => void
  onAnimate: () => void
  onClose: () => void
}

export default function QuerySequencePicker({
  goal,
  running,
  error,
  result,
  resolveSourceLabel,
  onViewStep,
  onAnimate,
  onClose,
}: QuerySequencePickerProps) {
  return (
    <Modal onClose={onClose} width={520}>
      <div className="title" style={{ marginBottom: 16 }}>
        Query graph sequence
      </div>

      {goal && (
        <div
          style={{
            marginBottom: 16,
            border: "2px solid black",
            borderLeftWidth: 6,
            borderRadius: 8,
            background: "white",
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: "bold" }}>Goal: </span>
          {goal}
        </div>
      )}

      {running && (
        <p style={{ opacity: 0.8, marginBottom: 16, fontFamily: "monospace" }}>
          Planning and running sequence…
        </p>
      )}

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          <p className="error-text">{error}</p>
        </div>
      )}

      {result && result.steps.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            data-agent="animate-queries-button"
            onClick={onAnimate}
            disabled={running}
            style={{
              ...brutal.button,
              margin: 0,
              background: "white",
              borderLeftColor: "#FF5A00",
            }}
          >
            Animate queries
          </button>
        </div>
      )}

      {result && result.steps.length === 0 && !running && (
        <p style={{ opacity: 0.7, marginBottom: 16 }}>No steps were planned for this goal.</p>
      )}

      {result &&
        result.steps.map((step: QuerySequenceStep, index: number) => (
          <div
            key={`${step.payload.type}-${step.payload.sourceRevisionId || "graph-wide"}-${index}`}
            style={{ marginBottom: 16 }}
          >
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
              Step {index + 1}
            </div>

            <div className="list-input">
              <div className="option" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                  {step.payload.type}
                  <span style={{ opacity: 0.6, fontWeight: "normal" }}>
                    {" "}
                    · {resolveSourceLabel(step.payload.sourceRevisionId)}
                  </span>
                </span>
                <button
                  data-agent={`view-sequence-step-${index}`}
                  onClick={() => onViewStep(step.payload)}
                  style={{
                    ...brutal.button,
                    padding: "4px 10px",
                    fontSize: 11,
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  View on graph
                </button>
              </div>

              {step.result?.explanations && (
                <div style={{ padding: "8px 10px", opacity: 0.85, lineHeight: 1.4, fontSize: 12 }}>
                  <strong>{step.result.explanations.title}</strong>
                  <div>{step.result.explanations.content}</div>
                </div>
              )}

              {(!step.result?.explanations) && (
                <div style={{ padding: "8px 10px", opacity: 0.7, lineHeight: 1.4, fontSize: 12 }}>
                  {step.result?.nodes?.length ?? 0} node{(step.result?.nodes?.length ?? 0) === 1 ? "" : "s"},{" "}
                  {step.result?.edges?.length ?? 0} edge{(step.result?.edges?.length ?? 0) === 1 ? "" : "s"}
                </div>
              )}
            </div>
          </div>
        ))}

      <button data-agent="query-sequence-picker-cancel" onClick={onClose} style={brutal.button}>
        Close
      </button>
    </Modal>
  )
}

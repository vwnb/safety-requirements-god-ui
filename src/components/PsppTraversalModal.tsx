import Modal from "./Modal"
import { brutal } from "../App"

export default function PsppTraversalModal({
  revisionId,
  result,
  loading,
  error,
  onClose,
}: {
  revisionId: string
  result: unknown
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  return (
    <Modal title="PSPP graph traversal" onClose={onClose} width="min(900px, calc(100vw - 32px))">
      <div style={{ fontFamily: "monospace", marginBottom: 12 }}>
        Source revision: {revisionId}
      </div>
      {loading ? (
        <p role="status">Loading traversal result...</p>
      ) : error ? (
        <p role="alert" style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</p>
      ) : (
        <pre
          data-agent="pspp-traversal-result"
          style={{
            maxHeight: "65vh",
            overflow: "auto",
            padding: 12,
            border: "2px solid black",
            background: "white",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize: 12,
          }}
        >
          {JSON.stringify(result, null, 2) ?? String(result)}
        </pre>
      )}
      <button type="button" onClick={onClose} style={brutal.button}>Close</button>
    </Modal>
  )
}

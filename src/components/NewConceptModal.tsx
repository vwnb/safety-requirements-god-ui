import { useState } from "react"
import Modal from "./Modal"

export default function NewConceptModal({
  onCreate,
  onClose,
}: {
  onCreate: (key: string, title: string, type: string) => void
  onClose: () => void
}) {
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")
  const [type, setType] = useState("")

  const handleCreate = () => {
    if (key.trim() && title.trim() && type) {
      onCreate(key, title, type)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Modal title="New concept" onClose={onClose}>
      <div className="form-row">
        <div className="field-label">Key</div>
        <input
          data-agent="input-new-concept-key"
          placeholder="e.g. HAZARD-001"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        />
      </div>

      <div className="form-row">
        <div className="field-label">Title</div>
        <input
          data-agent="input-new-concept-title"
          placeholder="e.g. Loss of braking"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        />
      </div>

      <div className="form-row">
        <div className="field-label">Type</div>
        <select
          data-agent="select-new-concept-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        >
          <option value="">-- Select Type --</option>
          <option value="ITEM">Item</option>
          <option value="ARCHITECTURE">Architecture</option>
          <option value="HAZARD">Hazard</option>
          <option value="HARM">Harm</option>
          <option value="ANOMALY">Anomaly</option>
          <option value="FAILURE_RATE">Failure Rate</option>
          <option value="COMMON_CAUSE_FAILURE">Common Cause Failure</option>
          <option value="SAFETY_GOAL">Safety Goal</option>
          <option value="SAFETY_CASE">Safety Case</option>
          <option value="FUNCTIONAL_SAFETY_REQUIREMENT">Functional Safety Requirement</option>
          <option value="TECHNICAL_SAFETY_REQUIREMENT">Technical Safety Requirement</option>
          <option value="SOFTWARE_REQUIREMENT">Software Requirement</option>
          <option value="SOFTWARE_SAFETY_REQUIREMENT">Software Safety Requirement</option>
          <option value="HARDWARE_REQUIREMENT">Hardware Requirement</option>
          <option value="HARDWARE_SAFETY_REQUIREMENT">Hardware Safety Requirement</option>
          <option value="ASSUMPTION">Assumption</option>
          <option value="CONSTRAINT">Constraint</option>
          <option value="TEST_CASE">Test Case</option>
          <option value="TEST_RESULT">Test Result</option>
          <option value="PROOF_TEST">Proof Test</option>
          <option value="VERIFICATION_REPORT">Verification Report</option>
          <option value="VALIDATION_REPORT">Validation Report</option>
          <option value="SAFETY_MANUAL">Safety Manual</option>
          <option value="CHANGE_REQUEST">Change Request</option>
          <option value="DIAGNOSTIC_COVERAGE">Diagnostic Coverage</option>
          <option value="IMPLEMENTATION">Implementation</option>
          <option value="VERIFICATION">Verification</option>
        </select>
      </div>

      <div className="form-actions">
        <button
          data-agent="btn-create-concept"
          onClick={handleCreate}
          className="btn"
          style={{ opacity: (key.trim() && title.trim() && type) ? 1 : 0.6, cursor: (key.trim() && title.trim() && type) ? 'pointer' : 'not-allowed' }}
        >
          Create
        </button>
        <button
          data-agent="btn-cancel-new-concept"
          onClick={handleCancel}
          className="btn btn-danger"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
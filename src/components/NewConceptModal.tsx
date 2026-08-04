import { useState } from "react"
import Modal from "./Modal"

type Standard = "ISO_26262" | "IEC_61508" | "ISO_13849"

export default function NewConceptModal({
  onCreate,
  onClose,
}: {
  onCreate: (key: string, title: string, type: string, phase: string, asil: string, sil: string, pl: string, standards: Standard[]) => void
  onClose: () => void
}) {
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")
  const [type, setType] = useState("")
  const [phase, setPhase] = useState("")
  const [asil, setAsil] = useState("")
  const [sil, setSil] = useState("")
  const [pl, setPl] = useState("")
  const [standards, setStandards] = useState<Standard[]>([])

  const handleCreate = () => {
    if (key.trim() && title.trim() && type) {
      onCreate(key, title, type, phase, asil, sil, pl, standards)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  const toggleStandard = (s: Standard) => {
    setStandards(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
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

      <div className="form-row">
        <div className="field-label">Phase</div>
        <select
          data-agent="select-new-concept-phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        >
          <option value="">-- Select Phase --</option>
          <option value="ITEM_DEFINITION">Item Definition</option>
          <option value="HARA">HARA</option>
          <option value="FUNCTIONAL_SAFETY">Functional Safety</option>
          <option value="TECHNICAL_SAFETY">Technical Safety</option>
          <option value="SYSTEM_DESIGN">System Design</option>
          <option value="SOFTWARE_DESIGN">Software Design</option>
          <option value="IMPLEMENTATION">Implementation</option>
          <option value="VERIFICATION">Verification</option>
          <option value="VALIDATION">Validation</option>
        </select>
      </div>

      <div className="form-row">
        <div className="field-label">ASIL</div>
        <select
          data-agent="select-new-concept-asil"
          value={asil}
          onChange={(e) => setAsil(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        >
          <option value="">-- Select ASIL --</option>
          <option value="QM">QM</option>
          <option value="ASIL_A">ASIL A</option>
          <option value="ASIL_B">ASIL B</option>
          <option value="ASIL_C">ASIL C</option>
          <option value="ASIL_D">ASIL D</option>
        </select>
      </div>

      <div className="form-row">
        <div className="field-label">SIL</div>
        <select
          data-agent="select-new-concept-sil"
          value={sil}
          onChange={(e) => setSil(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        >
          <option value="">-- Select SIL --</option>
          <option value="SIL_1">SIL 1</option>
          <option value="SIL_2">SIL 2</option>
          <option value="SIL_3">SIL 3</option>
          <option value="SIL_4">SIL 4</option>
        </select>
      </div>

      <div className="form-row">
        <div className="field-label">PL</div>
        <select
          data-agent="select-new-concept-pl"
          value={pl}
          onChange={(e) => setPl(e.target.value)}
          className="license-value"
          style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%', flex: 1 }}
        >
          <option value="">-- Select PL --</option>
          <option value="PL_A">PL a</option>
          <option value="PL_B">PL b</option>
          <option value="PL_C">PL c</option>
          <option value="PL_D">PL d</option>
          <option value="PL_E">PL e</option>
        </select>
      </div>

      <div className="form-row">
        <div className="field-label">Standards</div>
        <div className="flex-wrap">
          {(["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]).map((s) => (
            <label key={s} className="checkbox-label">
              <input
                type="checkbox"
                checked={standards.includes(s)}
                onChange={() => toggleStandard(s)}
              />
              {s.replace("_", " ")}
            </label>
          ))}
        </div>
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
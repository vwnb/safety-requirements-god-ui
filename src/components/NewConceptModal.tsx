import { useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"

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
  const [type, setType] = useState("ITEM")
  const [phase, setPhase] = useState("ITEM_DEFINITION")
  const [asil, setAsil] = useState("")
  const [sil, setSil] = useState("")
  const [pl, setPl] = useState("")
  const [standards, setStandards] = useState<Standard[]>([])

  return (
    <Modal title="New concept" onClose={onClose}>
      <div style={brutal.formRow}>
        <div style={brutal.label}>Key</div>
        <input
          data-agent="input-new-concept-key"
          placeholder="e.g. BRAKE_FAILURE"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ ...brutal.input, flex: 1 }}
        />
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>Title</div>
        <input
          data-agent="input-new-concept-title"
          placeholder="optional"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...brutal.input, flex: 1 }}
        />
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>Phase</div>
        <select
          data-agent="select-new-concept-phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          style={{ ...brutal.select, flex: 1 }}
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
        </select>
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>ASIL</div>
        <select
          data-agent="select-new-concept-asil"
          value={asil}
          onChange={(e) => setAsil(e.target.value)}
          style={{ ...brutal.select, flex: 1 }}
        >
          <option value="">-- Select ASIL --</option>
          <option value="QM">QM</option>
          <option value="ASIL_A">ASIL_A</option>
          <option value="ASIL_B">ASIL_B</option>
          <option value="ASIL_C">ASIL_C</option>
          <option value="ASIL_D">ASIL_D</option>
        </select>
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>SIL</div>
        <select
          data-agent="select-new-concept-sil"
          value={sil}
          onChange={(e) => setSil(e.target.value)}
          style={{ ...brutal.select, flex: 1 }}
        >
          <option value="">-- Select SIL --</option>
          <option value="SIL1">SIL 1</option>
          <option value="SIL2">SIL 2</option>
          <option value="SIL3">SIL 3</option>
          <option value="SIL4">SIL 4</option>
        </select>
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>PL</div>
        <select
          data-agent="select-new-concept-pl"
          value={pl}
          onChange={(e) => setPl(e.target.value)}
          style={{ ...brutal.select, flex: 1 }}
        >
          <option value="">-- Select PL --</option>
          <option value="PL_a">PL a</option>
          <option value="PL_b">PL b</option>
          <option value="PL_c">PL c</option>
          <option value="PL_d">PL d</option>
          <option value="PL_e">PL e</option>
        </select>
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>Standards</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {(["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]).map((s) => (
            <label key={s} style={{ fontFamily: "monospace", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={standards.includes(s)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setStandards([...standards, s])
                  } else {
                    setStandards(standards.filter((x) => x !== s))
                  }
                }}
              />
              {s.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>

      <div style={brutal.formRow}>
        <div style={brutal.label}>Type</div>
        <select
          data-agent="select-new-concept-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ ...brutal.select, flex: 1 }}
        >
          <option value="">-- Select Type --</option>
          <option value="ITEM">Item</option>
          <option value="HAZARD">Hazard</option>
          <option value="HARM">Harm</option>
          <option value="SAFETY_GOAL">Safety goal</option>
          <option value="FSR">Functional safety requirement</option>
          <option value="TSR">Technical safety requirement</option>
          <option value="SSR">Software safety requirement</option>
          <option value="HARDWARE_REQUIREMENT">Hardware requirement</option>
          <option value="SOFTWARE_REQUIREMENT">Software requirement</option>
          <option value="ASSUMPTION">Assumption</option>
          <option value="CONSTRAINT">Constraint</option>
          <option value="TEST_CASE">Test case</option>
          <option value="TEST_RESULT">Test result</option>
          <option value="VERIFICATION_REPORT">Verification report</option>
          <option value="VALIDATION_REPORT">Validation report</option>
          <option value="SAFETY_CASE">Safety case</option>
          <option value="SAFETY_MANUAL">Safety manual</option>
          <option value="CHANGE_REQUEST">Change request</option>
          <option value="ANOMALY">Anomaly</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          data-agent="btn-create-concept"
          onClick={() => onCreate(key, title, type, phase, asil, sil, pl, standards)}
          style={brutal.button}
        >
          Create
        </button>
        <button
          data-agent="btn-cancel-new-concept"
          onClick={onClose}
          style={{ ...brutal.button, backgroundColor: "#F2B8B5" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
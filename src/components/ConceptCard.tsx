import { useState } from "react"
import { brutal, typeColor, type LifecyclePhase, type ASIL, type SIL, type PL, type Standard, type Concept } from "../App"

const PHASES = [
  "ITEM_DEFINITION", "HARA", "FUNCTIONAL_SAFETY", "TECHNICAL_SAFETY",
  "SYSTEM_DESIGN", "SOFTWARE_DESIGN", "IMPLEMENTATION", "VERIFICATION",
] as LifecyclePhase[]

const ASIL_OPTIONS = ["QM", "ASIL_A", "ASIL_B", "ASIL_C", "ASIL_D"] as ASIL[]
const SIL_OPTIONS = ["SIL1", "SIL2", "SIL3", "SIL4"] as SIL[]
const PL_OPTIONS = ["PL_a", "PL_b", "PL_c", "PL_d", "PL_e"] as PL[]
const STANDARDS = ["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]

const TYPES = [
  "ITEM", "HAZARD", "HARM", "SAFETY_GOAL", "FSR", "TSR", "SSR",
  "HARDWARE_REQUIREMENT", "SOFTWARE_REQUIREMENT", "ASSUMPTION", "CONSTRAINT",
  "TEST_CASE", "TEST_RESULT", "VERIFICATION_REPORT", "VALIDATION_REPORT",
  "SAFETY_CASE", "SAFETY_MANUAL", "CHANGE_REQUEST", "ANOMALY",
] as const

const fieldLabel: React.CSSProperties = {
  fontWeight: 600,
  minWidth: 140,
  flexShrink: 0,
  color: "#000",
}

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 3,
  fontSize: 11,
  fontWeight: 600,
  marginRight: 4,
  marginBottom: 2,
}

export default function ConceptCard({
  concept,
  editKey,
  editTitle,
  editType,
  editPhase,
  editAsil,
  editSil,
  editPl,
  editStandards,
  onEditKey,
  onEditTitle,
  onEditType,
  onEditPhase,
  onEditAsil,
  onEditSil,
  onEditPl,
  onEditStandards,
  onSave,
  onPendingConfirm,
}: {
  concept: Concept | null
  editKey: string
  editTitle: string
  editType: string
  editPhase: string
  editAsil: string
  editSil: string
  editPl: string
  editStandards: Standard[]
  onEditKey: (v: string) => void
  onEditTitle: (v: string) => void
  onEditType: (v: string) => void
  onEditPhase: (v: string) => void
  onEditAsil: (v: string) => void
  onEditSil: (v: string) => void
  onEditPl: (v: string) => void
  onEditStandards: (v: Standard[]) => void
  onSave: () => void
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void } | null) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (!concept) return null

  const handleSave = () => {
    onSave()
    setIsEditing(false)
  }

  const handleCancel = () => {
    onPendingConfirm({
      message: "Discard changes?",
      onConfirm: () => {
        setIsEditing(false)
      },
    })
  }

  const typeLabel = concept.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div data-agent="concept-card" style={{ marginTop: 20, marginBottom: 20, padding: 12, border: "2px solid black" }}>
      {!isEditing ? (
        <article>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span style={{
                display: "inline-block",
                padding: "1px 8px",
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 600,
                background: typeColor[concept.type] || "#ccc",
                width: "fit-content",
              }}>
                {typeLabel}
              </span>
              <h2>
                {concept.key} {concept.title && `— ${concept.title}`}
              </h2>
            </div>
            <button
              data-agent="btn-edit-concept"
              onClick={() => setIsEditing(true)}
              style={brutal.button}
            >
              Edit
            </button>
          </div>

          <p style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", fontSize: 13 }}>
            <span><span style={fieldLabel}>Created by</span> {concept.createdBy?.name || "—"}</span>
            {concept.phase && (
              <span><span style={fieldLabel}>Phase</span> {concept.phase.replace(/_/g, " ")}</span>
            )}
          </p>

          <p style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {concept.asil && <span style={{ ...tagStyle, background: "#F2B8B5" }}>ASIL: {concept.asil}</span>}
            {concept.sil && <span style={{ ...tagStyle, background: "#A8E6CF" }}>SIL: {concept.sil}</span>}
            {concept.pl && <span style={{ ...tagStyle, background: "#F3D9A2" }}>PL: {concept.pl}</span>}
            {(concept.standards ?? []).map((s) => (
              <span key={s} style={{ ...tagStyle, background: "#DCE7F5" }}>{s.replace(/_/g, " ")}</span>
            ))}
          </p>
        </article>
      ) : (
        <>
          <div className="title" style={{ marginTop: 0, marginBottom: 12 }}>Edit concept details</div>

          <div style={brutal.formRow}>
            <div style={brutal.label}>Key</div>
            <input
              data-agent="input-edit-concept-key"
              value={editKey}
              onChange={(e) => onEditKey(e.target.value)}
              style={brutal.input}
            />
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Created by</div>
            <div style={{ ...brutal.input, ...brutal.disabled }}>
              {concept.createdBy?.name || ""}
            </div>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Title</div>
            <input
              data-agent="input-edit-concept-title"
              value={editTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              style={brutal.input}
            />
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Type</div>
            <select
              data-agent="select-edit-concept-type"
              value={editType}
              onChange={(e) => onEditType(e.target.value)}
              style={brutal.select}
            >
              <option value="">-- Select Type --</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Phase</div>
            <select
              data-agent="select-edit-concept-phase"
              value={editPhase}
              onChange={(e) => onEditPhase(e.target.value)}
              style={brutal.select}
            >
              <option value="">-- Select Phase --</option>
              {PHASES.map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>ASIL</div>
            <select
              data-agent="select-edit-concept-asil"
              value={editAsil}
              onChange={(e) => onEditAsil(e.target.value)}
              style={brutal.select}
            >
              <option value="">-- Select ASIL --</option>
              {ASIL_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>SIL</div>
            <select
              data-agent="select-edit-concept-sil"
              value={editSil}
              onChange={(e) => onEditSil(e.target.value)}
              style={brutal.select}
            >
              <option value="">-- Select SIL --</option>
              {SIL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("SIL", "SIL ")}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>PL</div>
            <select
              data-agent="select-edit-concept-pl"
              value={editPl}
              onChange={(e) => onEditPl(e.target.value)}
              style={brutal.select}
            >
              <option value="">-- Select PL --</option>
              {PL_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Standards</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
              {STANDARDS.map((s) => (
                <label key={s} style={{ fontFamily: "monospace", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={editStandards.includes(s)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onEditStandards([...editStandards, s])
                      } else {
                        onEditStandards(editStandards.filter((x) => x !== s))
                      }
                    }}
                  />
                  {s.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button data-agent="btn-save-concept" style={brutal.button} onClick={handleSave}>Save concept</button>
            <button data-agent="btn-cancel-edit-concept" onClick={handleCancel} style={{ ...brutal.button, backgroundColor: "#F2B8B5" }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
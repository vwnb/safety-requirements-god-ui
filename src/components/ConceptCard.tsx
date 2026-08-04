import { useState } from "react"
import { typeColor, type LifecyclePhase, type ASIL, type SIL, type PL, type Standard, type Concept } from "../App"

const PHASES = [
  "ITEM_DEFINITION", "HARA", "FUNCTIONAL_SAFETY", "TECHNICAL_SAFETY",
  "SYSTEM_DESIGN", "SOFTWARE_DESIGN", "IMPLEMENTATION", "VERIFICATION",
  "VALIDATION", "PRODUCTION", "OPERATION", "DECOMMISSIONING",
] as LifecyclePhase[]

const ASIL_OPTIONS = ["QM", "ASIL_A", "ASIL_B", "ASIL_C", "ASIL_D"] as ASIL[]
const SIL_OPTIONS = ["SIL_1", "SIL_2", "SIL_3", "SIL_4"] as SIL[]
const PL_OPTIONS = ["PL_A", "PL_B", "PL_C", "PL_D", "PL_E"] as PL[]
const STANDARDS = ["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]

const TYPES = [
  "ITEM", "HAZARD", "HARM", "SAFETY_GOAL",
  "FUNCTIONAL_SAFETY_REQUIREMENT", "TECHNICAL_SAFETY_REQUIREMENT",
  "HARDWARE_REQUIREMENT", "SOFTWARE_REQUIREMENT",
  "HARDWARE_SAFETY_REQUIREMENT", "SOFTWARE_SAFETY_REQUIREMENT",
  "ASSUMPTION", "CONSTRAINT",
  "TEST_CASE", "TEST_RESULT", "PROOF_TEST",
  "VERIFICATION_REPORT", "VALIDATION_REPORT",
  "SAFETY_CASE", "SAFETY_MANUAL",
  "CHANGE_REQUEST", "ANOMALY",
  "FAILURE_RATE", "DIAGNOSTIC_COVERAGE", "COMMON_CAUSE_FAILURE",
  "ARCHITECTURE",
] as const


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
  onEditingChange,
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
  onSave: (onSuccess: () => void) => void
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void; clearRevisionOnConfirm?: boolean } | null) => void
  onEditingChange?: (isEditing: boolean) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (!concept) return null

  const setEditingState = (state: boolean) => {
    setIsEditing(state)
    onEditingChange?.(state)
  }

  const handleSave = () => {
    onSave(() => {
      setEditingState(false)
    })
  }

  const handleCancel = () => {
    onPendingConfirm({
      message: "Discard changes?",
      onConfirm: () => {
        setEditingState(false)
      },
      clearRevisionOnConfirm: false
    })
  }

  const typeLabel = concept.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div data-agent="concept-card" className="card">
      {!isEditing ? (
        <article>
          <div className="card-header-row">
            <h2>
              <span className="tag" style={{ background: typeColor[concept.type] || "#ccc" }}>
                {typeLabel}
              </span>
              {concept.key} {concept.title && `— ${concept.title}`}
            </h2>

            <button
              data-agent="btn-edit-concept"
              onClick={() => setEditingState(true)}
              className="btn"
            >
              Edit
            </button>
          </div>

          <p className="info-row">
            <span><span className="field-label">Created by</span> {concept.createdBy?.name || "—"}</span>
            {concept.phase && (
              <span><span className="field-label">Phase</span> {concept.phase.replace(/_/g, " ")}</span>
            )}
          </p>
        </article>
      ) : (
        <>
          <div className="title mt-0" style={{ marginBottom: 12 }}>Edit concept details</div>

          <div className="form-row">
            <div className="field-label">Key</div>
            <input
              data-agent="input-edit-concept-key"
              value={editKey}
              onChange={(e) => onEditKey(e.target.value)}
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-row">
            <div className="field-label">Created by</div>
            <div className="license-value" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              {concept.createdBy?.name || ""}
            </div>
          </div>
          <div className="form-row">
            <div className="field-label">Title</div>
            <input
              data-agent="input-edit-concept-title"
              value={editTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-row">
            <div className="field-label">Type</div>
            <select
              data-agent="select-edit-concept-type"
              value={editType}
              onChange={(e) => onEditType(e.target.value)}
            >
              <option value="">-- Select Type --</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field-label">Phase</div>
            <select
              data-agent="select-edit-concept-phase"
              value={editPhase}
              onChange={(e) => onEditPhase(e.target.value)}
            >
              <option value="">-- Select Phase --</option>
              {PHASES.map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field-label">ASIL</div>
            <select
              data-agent="select-edit-concept-asil"
              value={editAsil}
              onChange={(e) => onEditAsil(e.target.value)}
            >
              <option value="">-- Select ASIL --</option>
              {ASIL_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field-label">SIL</div>
            <select
              data-agent="select-edit-concept-sil"
              value={editSil}
              onChange={(e) => onEditSil(e.target.value)}
            >
              <option value="">-- Select SIL --</option>
              {SIL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field-label">PL</div>
            <select
              data-agent="select-edit-concept-pl"
              value={editPl}
              onChange={(e) => onEditPl(e.target.value)}
            >
              <option value="">-- Select PL --</option>
              {PL_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field-label">Standards</div>
            <div className="flex-wrap">
              {STANDARDS.map((s) => (
                <label key={s} className="checkbox-label">
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
          <div className="form-actions">
            <button data-agent="btn-save-concept" className="btn" onClick={handleSave}>Save concept</button>
            <button data-agent="btn-cancel-edit-concept" className="btn btn-danger" onClick={handleCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
import { useState } from "react"
import { typeColor, type Concept, type PsppDimension, type SotifCategory } from "../App"

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

const PSPP_DIMENSIONS: PsppDimension[] = ["PROCESS", "STRUCTURE", "PROPERTY", "PERFORMANCE"]

const SOTIF_CATEGORIES: { value: SotifCategory; label: string }[] = [
  { value: "TriggeringCondition", label: "Triggering condition" },
  { value: "FunctionalInsufficiency", label: "Functional insufficiency" },
  { value: "UnknownUnsafeScenario", label: "Unknown unsafe scenario" },
  { value: "KnownUnsafeScenario", label: "Known unsafe scenario" },
]

export default function ConceptCard({
  concept,
  editKey,
  editTitle,
  editType,
  editPsppDimension,
  onEditKey,
  onEditTitle,
  onEditType,
  onEditPsppDimension,
  editSotifCategory,
  onEditSotifCategory,
  editOpbTerm,
  onEditOpbTerm,
  onSave,
  onPendingConfirm,
  onEditingChange,
}: {
  concept: Concept | null
  editKey: string
  editTitle: string
  editType: string
  editPsppDimension: PsppDimension | ""
  onEditKey: (v: string) => void
  onEditTitle: (v: string) => void
  onEditType: (v: string) => void
  onEditPsppDimension: (v: PsppDimension | "") => void
  editSotifCategory: SotifCategory | ""
  onEditSotifCategory: (v: SotifCategory | "") => void
  editOpbTerm: string
  onEditOpbTerm: (v: string) => void
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
              onClick={() => {
                onEditSotifCategory(concept.sotifCategory || "")
                onEditOpbTerm(concept.opbTerm || "")
                setEditingState(true)
              }}
              className="btn"
            >
              Edit
            </button>
          </div>

          <p className="info-row">
            <span><span className="field-label">Created by</span> {concept.createdBy?.name || "—"}</span>
            <span><span className="field-label">PSPP dimension</span> {concept.psppDimension || "—"}</span>
            <span><span className="field-label">SOTIF category</span> {SOTIF_CATEGORIES.find(category => category.value === concept.sotifCategory)?.label || "—"}</span>
            <span style={{ overflowWrap: "anywhere" }}><span className="field-label">OPB term</span> {concept.opbTerm || "—"}</span>
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
            <div className="field-label">PSPP dimension</div>
            <select
              data-agent="select-edit-concept-pspp-dimension"
              value={editPsppDimension}
              onChange={(e) => onEditPsppDimension(e.target.value as PsppDimension | "")}
            >
              <option value="">-- Select PSPP dimension --</option>
              {PSPP_DIMENSIONS.map((dimension) => (
                <option key={dimension} value={dimension}>{dimension}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="edit-concept-sotif">SOTIF category</label>
            <select
              id="edit-concept-sotif"
              data-agent="select-edit-concept-sotif-category"
              value={editSotifCategory}
              onChange={(e) => onEditSotifCategory(e.target.value as SotifCategory | "")}
            >
              <option value="">-- Not set --</option>
              {SOTIF_CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="edit-concept-opb">OPB term IRI</label>
            <input
              id="edit-concept-opb"
              data-agent="input-edit-concept-opb-term"
              value={editOpbTerm}
              onChange={(e) => onEditOpbTerm(e.target.value)}
              aria-describedby="edit-concept-opb-help"
              placeholder="Paste the class IRI from BioPortal"
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
            <small id="edit-concept-opb-help" style={{ marginLeft: 8 }}>
              <a href="https://bioportal.bioontology.org/ontologies/OPB" target="_blank" rel="noreferrer">Browse OPB in BioPortal</a>
            </small>
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
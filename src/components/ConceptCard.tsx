import { useState } from "react"
import { stpaFieldsOf, typeColor, type Concept, type PsppDimension, type SotifCategory, type StpaFields, type StpaRole, type UcaType } from "../App"

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

const STPA_ROLES: { value: StpaRole; label: string }[] = [
  { value: "LOSS", label: "Loss" },
  { value: "CONTROLLER", label: "Controller" },
  { value: "CONTROL_ACTION", label: "Control action" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "ACTUATOR", label: "Actuator" },
  { value: "CONTROLLED_PROCESS", label: "Controlled process" },
  { value: "UCA", label: "Unsafe control action (UCA)" },
  { value: "LOSS_SCENARIO", label: "Loss scenario" },
]

const UCA_TYPES: { value: UcaType; label: string }[] = [
  { value: "NOT_PROVIDED", label: "Not provided" },
  { value: "PROVIDED_UNSAFE", label: "Provided, causing hazard" },
  { value: "WRONG_TIMING_OR_ORDER", label: "Too early, too late or out of order" },
  { value: "STOPPED_TOO_SOON_OR_TOO_LONG", label: "Stopped too soon or applied too long" },
]

const labelOf = <T extends string>(options: { value: T; label: string }[], value: T | null | undefined) =>
  options.find((option) => option.value === value)?.label

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
  editStpa,
  onEditStpa,
  onSave,
  onPendingConfirm,
  onEditingChange,
  onDelete,
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
  editStpa: StpaFields
  onEditStpa: (v: StpaFields) => void
  onSave: (onSuccess: () => void) => void
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void; clearRevisionOnConfirm?: boolean } | null) => void
  onEditingChange?: (isEditing: boolean) => void
  onDelete?: () => void
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

            <div style={{ display: "flex", gap: 8 }}>
              <button
                data-agent="btn-edit-concept"
                onClick={() => {
                  onEditSotifCategory(concept.sotifCategory || "")
                  onEditOpbTerm(concept.opbTerm || "")
                  onEditStpa(stpaFieldsOf(concept))
                  setEditingState(true)
                }}
                className="btn"
              >
                Edit
              </button>
              {onDelete && (
                <button
                  data-agent="btn-delete-concept"
                  onClick={onDelete}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <p className="info-row">
            <span><span className="field-label">Created by</span> {concept.createdBy?.name || "—"}</span>
            <span><span className="field-label">PSPP dimension</span> {concept.psppDimension || "—"}</span>
            <span><span className="field-label">SOTIF category</span> {SOTIF_CATEGORIES.find(category => category.value === concept.sotifCategory)?.label || "—"}</span>
            <span style={{ overflowWrap: "anywhere" }}><span className="field-label">OPB term</span> {concept.opbTerm || "—"}</span>
            <span><span className="field-label">STPA role</span> {labelOf(STPA_ROLES, concept.stpaRole) || "—"}</span>
            {concept.stpaRole === "UCA" && (
              <>
                <span><span className="field-label">UCA type</span> {labelOf(UCA_TYPES, concept.ucaType) || "—"}</span>
                <span style={{ overflowWrap: "anywhere" }}><span className="field-label">UCA context</span> {concept.ucaContext || "—"}</span>
              </>
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
          <div className="form-row">
            <label className="field-label" htmlFor="edit-concept-stpa-role">STPA role</label>
            <select
              id="edit-concept-stpa-role"
              data-agent="select-edit-concept-stpa-role"
              value={editStpa.stpaRole}
              onChange={(e) => onEditStpa({ ...editStpa, stpaRole: e.target.value as StpaRole | "" })}
            >
              <option value="">-- Not set --</option>
              {STPA_ROLES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {editStpa.stpaRole === "UCA" && (
            <>
              <div className="form-row">
                <label className="field-label" htmlFor="edit-concept-uca-type">UCA type</label>
                <select
                  id="edit-concept-uca-type"
                  data-agent="select-edit-concept-uca-type"
                  value={editStpa.ucaType}
                  onChange={(e) => onEditStpa({ ...editStpa, ucaType: e.target.value as UcaType | "" })}
                >
                  <option value="">-- Not set --</option>
                  {UCA_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="edit-concept-uca-context">UCA context</label>
                <input
                  id="edit-concept-uca-context"
                  data-agent="input-edit-concept-uca-context"
                  value={editStpa.ucaContext}
                  onChange={(e) => onEditStpa({ ...editStpa, ucaContext: e.target.value })}
                  placeholder="When is this control action unsafe?"
                  className="license-value"
                  style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
                />
              </div>
            </>
          )}
          <div className="form-actions">
            <button data-agent="btn-save-concept" className="btn" onClick={handleSave}>Save concept</button>
            <button data-agent="btn-cancel-edit-concept" className="btn btn-danger" onClick={handleCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
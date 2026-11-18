import { useState } from "react"
import { stpaFieldsOf, typeColor, type Concept, type ConceptIntegrityLevel, type Category13849, type HazardLevels, type HazardRatingFields, type Iso13849Fields, type PsppDimension, type SotifCategory, type StpaFields, type StpaRole, type UcaType } from "../App"
import { hazardRatingOf } from "../lib/hazardRating"
import { iso13849FieldsOf } from "../lib/iso13849"

const TYPES = [
  "ITEM", "HAZARD", "HARM", "SAFETY_GOAL", "SAFETY_FUNCTION",
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

/** The six rating selects, grouped by standard. Option values are the backend enum values. */
const HAZARD_RATING_GROUPS: {
  title: string
  help: string
  fields: { field: keyof HazardRatingFields; label: string; options: { value: string; label: string }[] }[]
}[] = [
  {
    title: "ISO 26262-3 hazard rating",
    help: "The ASIL is derived from S + E + C once all three are set.",
    fields: [
      { field: "haraSeverity", label: "Severity", options: [
        { value: "S0", label: "S0 – no injuries" },
        { value: "S1", label: "S1 – light and moderate injuries" },
        { value: "S2", label: "S2 – severe injuries, survival probable" },
        { value: "S3", label: "S3 – life-threatening or fatal injuries" },
      ] },
      { field: "haraExposure", label: "Exposure", options: [
        { value: "E0", label: "E0 – incredible" },
        { value: "E1", label: "E1 – very low probability" },
        { value: "E2", label: "E2 – low probability" },
        { value: "E3", label: "E3 – medium probability" },
        { value: "E4", label: "E4 – high probability" },
      ] },
      { field: "haraControllability", label: "Controllability", options: [
        { value: "C0", label: "C0 – controllable in general" },
        { value: "C1", label: "C1 – simply controllable" },
        { value: "C2", label: "C2 – normally controllable" },
        { value: "C3", label: "C3 – difficult to control or uncontrollable" },
      ] },
    ],
  },
  {
    title: "ISO 13849-1 risk graph",
    help: "The required performance level (PLr) is derived from S + F + P once all three are set.",
    fields: [
      { field: "plrSeverity", label: "Severity of injury", options: [
        { value: "S1", label: "S1 – slight, normally reversible" },
        { value: "S2", label: "S2 – serious, normally irreversible, or death" },
      ] },
      { field: "plrFrequency", label: "Frequency / duration of exposure", options: [
        { value: "F1", label: "F1 – seldom to less often, or short" },
        { value: "F2", label: "F2 – frequent to continuous, or long" },
      ] },
      { field: "plrAvoidance", label: "Possibility of avoidance", options: [
        { value: "P1", label: "P1 – possible under specific conditions" },
        { value: "P2", label: "P2 – scarcely possible" },
      ] },
    ],
  },
]

/** Read-only tags for a hazard's derived levels, e.g. "ASIL C (S3 E3 C2)", "PLr D (S2 F1 P2)". */
function hazardLevelLabels(levels: HazardLevels | null | undefined): { label: string; title: string }[] {
  if (!levels) return []
  const out: { label: string; title: string }[] = []
  if (levels.haraRating) {
    out.push({
      label: levels.asil ? `${levels.asil.replace("_", " ")} (${levels.haraRating})` : `HARA ${levels.haraRating}`,
      title: levels.asil ? "ASIL derived from the ISO 26262-3 S/E/C rating" : "ISO 26262-3 rating incomplete; ASIL not derived yet",
    })
  }
  if (levels.plrRating) {
    out.push({
      label: levels.plr ? `PLr ${levels.plr.replace("PL_", "")} (${levels.plrRating})` : `Risk graph ${levels.plrRating}`,
      title: levels.plr ? "PLr derived from the ISO 13849-1 risk graph" : "ISO 13849-1 rating incomplete; PLr not derived yet",
    })
  }
  return out
}

const CATEGORIES_13849: { value: Category13849; label: string }[] = [
  { value: "B", label: "B" },
  { value: "CAT_1", label: "1" },
  { value: "CAT_2", label: "2" },
  { value: "CAT_3", label: "3" },
  { value: "CAT_4", label: "4" },
]

const ISO13849_NUMBER_FIELDS: { field: Exclude<keyof Iso13849Fields, "category13849">; label: string; help: string; min: number; max?: number; step: string }[] = [
  { field: "mttfdYears", label: "MTTFD per channel (years)", help: "Low 3–10, medium 10–30, high 30 and up; below 3 is not acceptable.", min: 0, step: "any" },
  { field: "dcavgPercent", label: "DCavg (%)", help: "None < 60, low 60–90, medium 90–99, high 99 and up.", min: 0, max: 100, step: "any" },
  { field: "ccfScore", label: "CCF score (Annex F)", help: "Whole number 0–100; Categories 2, 3 and 4 need at least 65.", min: 0, max: 100, step: "1" },
]

const categoryLabel = (value: Category13849 | null | undefined) => CATEGORIES_13849.find((c) => c.value === value)?.label

const display = (value: number | null | undefined, unit = "") => (value != null ? `${value}${unit}` : "—")

const labelOf = <T extends string>(options: { value: T; label: string }[], value: T | null | undefined) =>
  options.find((option) => option.value === value)?.label

/** Read-only labels for a concept's inherited integrity level, e.g. ["ASIL B(D)", "SIL 2"]. */
function integrityLevelLabels(level: ConceptIntegrityLevel | null | undefined): string[] {
  if (!level) return []
  return [level.asilNotation, level.sil, level.pl]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace("_", " "))
}

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
  editHazardRating,
  onEditHazardRating,
  editIso13849,
  onEditIso13849,
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
  editHazardRating: HazardRatingFields
  onEditHazardRating: (v: HazardRatingFields) => void
  editIso13849: Iso13849Fields
  onEditIso13849: (v: Iso13849Fields) => void
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
              {integrityLevelLabels(concept.integrityLevel).map((label) => (
                <span
                  key={label}
                  data-agent="concept-integrity-level"
                  className="tag tag-risk"
                  style={{ marginLeft: 8 }}
                  title={concept.integrityLevel?.source === "ASIL_DECOMPOSITION"
                    ? "ASIL decomposition (ISO 26262-9); other levels are inherited from the work item"
                    : "Inherited from the work item"}
                >
                  {label}
                </span>
              ))}
              {hazardLevelLabels(concept.hazardLevels).map(({ label, title }) => (
                <span
                  key={label}
                  data-agent="concept-hazard-level"
                  className="tag tag-risk"
                  style={{ marginLeft: 8 }}
                  title={title}
                >
                  {label}
                </span>
              ))}
              {concept.achievedPl?.pl && (
                <span
                  data-agent="concept-achieved-pl"
                  className="tag tag-risk"
                  style={{ marginLeft: 8 }}
                  title="Achieved PL derived by the ISO 13849-1 simplified procedure (Category, DCavg, MTTFD); does not cover PFHD, systematic failures or software"
                >
                  Achieved {concept.achievedPl.pl.replace("_", " ")}
                </span>
              )}
            </h2>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                data-agent="btn-edit-concept"
                onClick={() => {
                  onEditSotifCategory(concept.sotifCategory || "")
                  onEditOpbTerm(concept.opbTerm || "")
                  onEditStpa(stpaFieldsOf(concept))
                  onEditHazardRating(hazardRatingOf(concept))
                  onEditIso13849(iso13849FieldsOf(concept))
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
            {concept.type === "SAFETY_FUNCTION" && (
              <>
                <span><span className="field-label">Category</span> {categoryLabel(concept.category13849) || "—"}</span>
                <span><span className="field-label">MTTFD</span> {display(concept.mttfdYears, " y")}</span>
                <span><span className="field-label">DCavg</span> {display(concept.dcavgPercent, " %")}</span>
                <span><span className="field-label">CCF score</span> {display(concept.ccfScore)}</span>
                {concept.achievedPl && !concept.achievedPl.pl && concept.achievedPl.reason && (
                  <span data-agent="concept-achieved-pl-reason"><span className="field-label">Achieved PL</span> not derived: {concept.achievedPl.reason}</span>
                )}
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
          {editType === "HAZARD" && HAZARD_RATING_GROUPS.map((group) => (
            <fieldset key={group.title} data-agent="hazard-rating-group" style={{ border: "2px solid black", padding: "8px 12px", margin: "12px 0" }}>
              <legend className="field-label">{group.title}</legend>
              <small style={{ display: "block", marginBottom: 8 }}>{group.help}</small>
              {group.fields.map(({ field, label, options }) => (
                <div className="form-row" key={field}>
                  <label className="field-label" htmlFor={`edit-concept-${field}`}>{label}</label>
                  <select
                    id={`edit-concept-${field}`}
                    data-agent={`select-edit-concept-${field}`}
                    value={editHazardRating[field]}
                    onChange={(e) => onEditHazardRating({ ...editHazardRating, [field]: e.target.value })}
                  >
                    <option value="">-- Not set --</option>
                    {options.map(({ value, label: optionLabel }) => (
                      <option key={value} value={value}>{optionLabel}</option>
                    ))}
                  </select>
                </div>
              ))}
            </fieldset>
          ))}
          {editType === "SAFETY_FUNCTION" && (
            <fieldset data-agent="iso13849-parameters" style={{ border: "2px solid black", padding: "8px 12px", margin: "12px 0" }}>
              <legend className="field-label">ISO 13849-1 parameters</legend>
              <small style={{ display: "block", marginBottom: 8 }}>
                The achieved PL is derived from Category, DCavg and MTTFD by the simplified procedure once these are set.
              </small>
              <div className="form-row">
                <label className="field-label" htmlFor="edit-concept-category13849">Category</label>
                <select
                  id="edit-concept-category13849"
                  data-agent="select-edit-concept-category13849"
                  value={editIso13849.category13849}
                  onChange={(e) => onEditIso13849({ ...editIso13849, category13849: e.target.value as Category13849 | "" })}
                >
                  <option value="">-- Not set --</option>
                  {CATEGORIES_13849.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {ISO13849_NUMBER_FIELDS.map(({ field, label, help, min, max, step }) => (
                <div className="form-row" key={field}>
                  <label className="field-label" htmlFor={`edit-concept-${field}`}>{label}</label>
                  <input
                    id={`edit-concept-${field}`}
                    data-agent={`input-edit-concept-${field}`}
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step={step}
                    value={editIso13849[field]}
                    onChange={(e) => onEditIso13849({ ...editIso13849, [field]: e.target.value })}
                    aria-describedby={`edit-concept-${field}-help`}
                    className="license-value"
                    style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
                  />
                  <small id={`edit-concept-${field}-help`} style={{ marginLeft: 8 }}>{help}</small>
                </div>
              ))}
            </fieldset>
          )}
          {editType !== "SAFETY_FUNCTION" && concept.type === "SAFETY_FUNCTION" && (concept.category13849 || concept.mttfdYears != null || concept.dcavgPercent != null || concept.ccfScore != null) && (
            <p data-agent="iso13849-clear-notice"><small>ISO 13849 parameters apply only to safety functions; saving with this type clears them.</small></p>
          )}
          {editType !== "HAZARD" && concept.hazardLevels && (
            <p data-agent="hazard-rating-clear-notice"><small>Hazard ratings apply only to hazards; saving with this type clears them.</small></p>
          )}
          <div className="form-actions">
            <button data-agent="btn-save-concept" className="btn btn-success" onClick={handleSave}>Save concept</button>
            <button data-agent="btn-cancel-edit-concept" className="btn btn-danger" onClick={handleCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
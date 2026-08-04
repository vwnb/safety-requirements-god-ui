import { useState, useEffect } from "react"
import { type LifecyclePhase, type ASIL, type SIL, type PL, type Standard, type WorkItem, type WorkItemCompleteness } from "../App"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"

const PHASES = [
  "ITEM_DEFINITION", "HARA", "FUNCTIONAL_SAFETY", "TECHNICAL_SAFETY",
  "SYSTEM_DESIGN", "SOFTWARE_DESIGN", "IMPLEMENTATION", "VERIFICATION",
  "VALIDATION", "PRODUCTION", "OPERATION", "DECOMMISSIONING",
] as LifecyclePhase[]

const ASIL_OPTIONS = ["QM", "ASIL_A", "ASIL_B", "ASIL_C", "ASIL_D"] as ASIL[]
const SIL_OPTIONS = ["SIL_1", "SIL_2", "SIL_3", "SIL_4"] as SIL[]
const PL_OPTIONS = ["PL_A", "PL_B", "PL_C", "PL_D", "PL_E"] as PL[]
const STANDARDS = ["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]


export default function WorkItemCard({
  workItem,
  completeness,
  editName,
  editDescription,
  editPhase,
  editAsil,
  editSil,
  editPl,
  editStandards,
  editApplicationContext,
  editSystemBoundary,
  onEditName,
  onEditDescription,
  onEditPhase,
  onEditAsil,
  onEditSil,
  onEditPl,
  onEditStandards,
  onEditApplicationContext,
  onEditSystemBoundary,
  onSave,
  onPendingConfirm,
  onEditingChange,
}: {
  workItem: WorkItem | null
  completeness?: WorkItemCompleteness | null
  editName: string
  editDescription: string
  editPhase: LifecyclePhase | ""
  editAsil: ASIL | ""
  editSil: SIL | ""
  editPl: PL | ""
  editStandards: Standard[]
  editApplicationContext: string
  editSystemBoundary: string
  onEditName: (v: string) => void
  onEditDescription: (v: string) => void
  onEditPhase: (v: LifecyclePhase | "") => void
  onEditAsil: (v: ASIL | "") => void
  onEditSil: (v: SIL | "") => void
  onEditPl: (v: PL | "") => void
  onEditStandards: (v: Standard[]) => void
  onEditApplicationContext: (v: string) => void
  onEditSystemBoundary: (v: string) => void
  onSave: (onSuccess: () => void) => void
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void; clearRevisionOnConfirm?: boolean } | null) => void
  onEditingChange?: (isEditing: boolean) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  if (!workItem) return null

  const completenessPercent = typeof completeness?.completeness === "number"
    ? Math.round(completeness.completeness > 1 ? completeness.completeness : completeness.completeness * 100)
    : null

  const coverageRows = completeness
    ? [
      {
        label: "Overall completeness",
        percent: completenessPercent ?? 0,
        totalLabel: null,
        description: "Overall progress across the work item’s coverage signals.",
        barColor: completenessPercent != null && completenessPercent >= 80
          ? SemanticColor.SUCCESS
          : completenessPercent != null && completenessPercent >= 50
            ? SemanticColor.METRIC
            : SemanticColor.DANGER,
      },
      {
        label: "Requirement test coverage",
        percent: completeness.requirementTestCoverage.total > 0
          ? Math.round((completeness.requirementTestCoverage.covered / completeness.requirementTestCoverage.total) * 100)
          : 0,
        totalLabel: `${completeness.requirementTestCoverage.covered}/${completeness.requirementTestCoverage.total}`,
        description: "How many requirement tests are tied to the work item.",
        barColor: SemanticColor.FUNCTIONAL,
      },
      {
        label: "System behavior safety goal coverage",
        percent: completeness.systemBehaviorSafetyGoalCoverage.total > 0
          ? Math.round((completeness.systemBehaviorSafetyGoalCoverage.covered / completeness.systemBehaviorSafetyGoalCoverage.total) * 100)
          : 0,
        totalLabel: `${completeness.systemBehaviorSafetyGoalCoverage.covered}/${completeness.systemBehaviorSafetyGoalCoverage.total}`,
        description: "How many system-behavior safety goals are covered.",
        barColor: SemanticColor.ARGUMENT,
      },
      {
        label: "Hazard mitigation coverage",
        percent: completeness.hazardMitigationCoverage.total > 0
          ? Math.round((completeness.hazardMitigationCoverage.covered / completeness.hazardMitigationCoverage.total) * 100)
          : 0,
        totalLabel: `${completeness.hazardMitigationCoverage.covered}/${completeness.hazardMitigationCoverage.total}`,
        description: "How many hazards have mitigation evidence linked to them.",
        barColor: SemanticColor.RISK,
      },
    ]
    : []

  const handleSave = () => {
    onSave(() => {
      setIsEditing(false)
    })
  }

  const handleCancel = () => {
    onPendingConfirm({
      message: "Discard changes?",
      onConfirm: () => {
        setIsEditing(false)
      },
      clearRevisionOnConfirm: false
    })
  }

  return (
    <div data-agent="work-item-card" className="card">
      {!isEditing ? (
        <article>
          <div className="card-header-row-start">
            <h2>
              {workItem.key} — {workItem.name}
            </h2>
            <button
              data-agent="btn-edit-work-item"
              onClick={() => setIsEditing(true)}
              className="btn"
            >
              Edit
            </button>
          </div>

          {workItem.description && (
            <p className="description-text">
              {workItem.description}
            </p>
          )}

          <p className="info-row">
            <span><span className="field-label">Created by</span> {workItem.createdBy?.name || "—"}</span>
            {workItem.phase && (
              <span><span className="field-label">Phase</span> {workItem.phase.replace(/_/g, " ")}</span>
            )}
          </p>

          <p className="info-row-tags">
            {workItem.asil && <span className="tag tag-risk">ASIL: {workItem.asil}</span>}
            {workItem.sil && <span className="tag tag-functional">SIL: {workItem.sil}</span>}
            {workItem.pl && <span className="tag tag-metric">PL: {workItem.pl}</span>}
            {(workItem.standards ?? []).map((s) => (
              <span key={s} className="tag tag-structure">{s.replace(/_/g, " ")}</span>
            ))}
          </p>

          {completeness && (
            <div className="completeness-meter" style={{ marginTop: 10 }}>
              {coverageRows.map((row) => (
                <div key={row.label} className="completeness-row">
                  <div className="completeness-row-header">
                    <div className="completeness-label-group">
                      <span className="completeness-label">{row.label}</span>
                      <InfoButton title={row.label} content={row.description} />
                    </div>
                    <span className="completeness-value">
                      {row.totalLabel ?? `${row.percent}%`}
                    </span>
                  </div>
                  <div className="usage-bar-track completeness-track">
                    <div
                      className="usage-bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, row.percent))}%`, background: row.barColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="info-row">
            {workItem.applicationContext && (
              <span><span className="field-label">Application Context</span> {workItem.applicationContext}</span>
            )}
            {workItem.systemBoundary && (
              <span><span className="field-label">System Boundary</span> {workItem.systemBoundary}</span>
            )}
          </p>
        </article>
      ) : (
        <>
          <div className="title mt-0">Edit work item details</div>

          <div className="form-row">
            <div className="field-label">Key</div>
            <div data-agent="input-work-item-key" className="license-value" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              {workItem.key}
            </div>
          </div>
          <div className="form-row">
            <div className="field-label">Created by</div>
            <div data-agent="input-work-item-created-by" className="license-value" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              {workItem.createdBy?.name || ""}
            </div>
          </div>
          <div className="form-row">
            <div className="field-label">Name</div>
            <input
              data-agent="input-work-item-name"
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-row">
            <div className="field-label">Description</div>
            <textarea
              data-agent="input-work-item-description"
              value={editDescription}
              onChange={(e) => onEditDescription(e.target.value)}
              className="license-value form-row-textarea"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-row">
            <div className="field-label">Phase</div>
            <select
              data-agent="select-work-item-phase"
              value={editPhase}
              onChange={(e) => onEditPhase(e.target.value as LifecyclePhase | "")}
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
              data-agent="select-work-item-asil"
              value={editAsil}
              onChange={(e) => onEditAsil(e.target.value as ASIL | "")}
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
              data-agent="select-work-item-sil"
              value={editSil}
              onChange={(e) => onEditSil(e.target.value as SIL | "")}
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
              data-agent="select-work-item-pl"
              value={editPl}
              onChange={(e) => onEditPl(e.target.value as PL | "")}
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
          <div className="form-row">
            <div className="field-label">Application Context</div>
            <input
              data-agent="input-work-item-application-context"
              value={editApplicationContext}
              onChange={(e) => onEditApplicationContext(e.target.value)}
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-row">
            <div className="field-label">System Boundary</div>
            <input
              data-agent="input-work-item-system-boundary"
              value={editSystemBoundary}
              onChange={(e) => onEditSystemBoundary(e.target.value)}
              className="license-value"
              style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
            />
          </div>
          <div className="form-actions">
            <button data-agent="btn-save-changes" className="btn" onClick={handleSave}>Save changes</button>
            <button data-agent="btn-cancel-edit-work-item" className="btn btn-danger" onClick={handleCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
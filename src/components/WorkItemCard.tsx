import { useState } from "react"
import { brutal, type LifecyclePhase, type ASIL, type SIL, type PL, type Standard, type WorkItem } from "../App"
import { SemanticColor } from "../lib/SemanticColor"

const PHASES = [
  "ITEM_DEFINITION", "HARA", "FUNCTIONAL_SAFETY", "TECHNICAL_SAFETY",
  "SYSTEM_DESIGN", "SOFTWARE_DESIGN", "IMPLEMENTATION", "VERIFICATION",
  "VALIDATION", "PRODUCTION", "OPERATION", "DECOMMISSIONING",
] as LifecyclePhase[]

const ASIL_OPTIONS = ["QM", "ASIL_A", "ASIL_B", "ASIL_C", "ASIL_D"] as ASIL[]
const SIL_OPTIONS = ["SIL_1", "SIL_2", "SIL_3", "SIL_4"] as SIL[]
const PL_OPTIONS = ["PL_A", "PL_B", "PL_C", "PL_D", "PL_E"] as PL[]
const STANDARDS = ["ISO_26262", "IEC_61508", "ISO_13849"] as Standard[]

const fieldLabel: React.CSSProperties = {
  fontWeight: 600,
  minWidth: 140,
  flexShrink: 0,
  color: "#000",
}

export default function WorkItemCard({
  workItem,
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
}: {
  workItem: WorkItem | null
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
  onSave: () => void
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void } | null) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (!workItem) return null

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

  return (
    <div data-agent="work-item-card" style={{ marginTop: 20, marginBottom: 20, padding: 12, border: "2px solid black" }}>
      {!isEditing ? (
        <article>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <h2>
              {workItem.key} — {workItem.name}
            </h2>
            <button
              data-agent="btn-edit-work-item"
              onClick={() => setIsEditing(true)}
              style={brutal.button}
            >
              Edit
            </button>
          </div>

          {workItem.description && (
            <p style={{ marginTop: 6, lineHeight: 1.5, color: "#222" }}>
              {workItem.description}
            </p>
          )}

          <p style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", fontSize: 13 }}>
            <span><span style={fieldLabel}>Created by</span> {workItem.createdBy?.name || "—"}</span>
            {workItem.phase && (
              <span><span style={fieldLabel}>Phase</span> {workItem.phase.replace(/_/g, " ")}</span>
            )}
          </p>

          <p style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {workItem.asil && <span style={{ ...brutal.tag, background: SemanticColor.RISK }}>ASIL: {workItem.asil}</span>}
            {workItem.sil && <span style={{ ...brutal.tag, background: SemanticColor.FUNCTIONAL }}>SIL: {workItem.sil}</span>}
            {workItem.pl && <span style={{ ...brutal.tag, background: SemanticColor.METRIC }}>PL: {workItem.pl}</span>}
            {(workItem.standards ?? []).map((s) => (
              <span key={s} style={{ ...brutal.tag, background: SemanticColor.STRUCTURE }}>{s.replace(/_/g, " ")}</span>
            ))}
          </p>

          <p style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", fontSize: 13 }}>
            {workItem.applicationContext && (
              <span><span style={fieldLabel}>Application Context</span> {workItem.applicationContext}</span>
            )}
            {workItem.systemBoundary && (
              <span><span style={fieldLabel}>System Boundary</span> {workItem.systemBoundary}</span>
            )}
          </p>
        </article>
      ) : (
        <>
          <div className="title" style={{ marginTop: 0 }}>Edit work item details</div>

          <div style={brutal.formRow}>
            <div style={brutal.label}>Key</div>
            <div data-agent="input-work-item-key" style={{ ...brutal.input, ...brutal.disabled }}>
              {workItem.key}
            </div>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Created by</div>
            <div data-agent="input-work-item-created-by" style={{ ...brutal.input, ...brutal.disabled }}>
              {workItem.createdBy?.name || ""}
            </div>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Name</div>
            <input
              data-agent="input-work-item-name"
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              style={brutal.input}
            />
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Description</div>
            <textarea
              data-agent="input-work-item-description"
              value={editDescription}
              onChange={(e) => onEditDescription(e.target.value)}
              style={{ ...brutal.input, height: 60 }}
            />
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>Phase</div>
            <select
              data-agent="select-work-item-phase"
              value={editPhase}
              onChange={(e) => onEditPhase(e.target.value as LifecyclePhase | "")}
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
              data-agent="select-work-item-asil"
              value={editAsil}
              onChange={(e) => onEditAsil(e.target.value as ASIL | "")}
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
              data-agent="select-work-item-sil"
              value={editSil}
              onChange={(e) => onEditSil(e.target.value as SIL | "")}
              style={brutal.select}
            >
              <option value="">-- Select SIL --</option>
              {SIL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>PL</div>
            <select
              data-agent="select-work-item-pl"
              value={editPl}
              onChange={(e) => onEditPl(e.target.value as PL | "")}
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
          <div style={brutal.formRow}>
            <div style={brutal.label}>Application Context</div>
            <input
              data-agent="input-work-item-application-context"
              value={editApplicationContext}
              onChange={(e) => onEditApplicationContext(e.target.value)}
              style={brutal.input}
            />
          </div>
          <div style={brutal.formRow}>
            <div style={brutal.label}>System Boundary</div>
            <input
              data-agent="input-work-item-system-boundary"
              value={editSystemBoundary}
              onChange={(e) => onEditSystemBoundary(e.target.value)}
              style={brutal.input}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button data-agent="btn-save-changes" style={brutal.button} onClick={handleSave}>Save changes</button>
            <button data-agent="btn-cancel-edit-work-item" onClick={handleCancel} style={{ ...brutal.button, backgroundColor: SemanticColor.DANGER }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
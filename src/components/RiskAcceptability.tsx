import { SemanticColor } from "../lib/SemanticColor"
import {
  cellAcceptable,
  draftThresholds,
  linesOf,
  type RiskAcceptability,
  type RiskAcceptabilityDraft,
} from "../lib/iso14971"

/**
 * ISO 14971 risk acceptability matrix: rows are severity (most severe on top), columns probability.
 * The backend validates the criteria and decides acceptability of real risks; the matrix only
 * previews what the criteria say.
 */
function Matrix({ severityLevels, probabilityLevels, thresholds }: {
  severityLevels: string[]
  probabilityLevels: string[]
  thresholds: Array<number | null>
}) {
  const cell = { border: "1px solid black", padding: "4px 6px", fontSize: 12 }
  return (
    <div style={{ overflowX: "auto" }}>
      <table data-agent="risk-acceptability-matrix" style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: "left" }}>Severity ↓ / Probability →</th>
            {probabilityLevels.map((p, i) => <th key={p} style={cell}>{i + 1} {p}</th>)}
          </tr>
        </thead>
        <tbody>
          {severityLevels.map((s, si) => ({ s, si })).reverse().map(({ s, si }) => (
            <tr key={s}>
              <th style={{ ...cell, textAlign: "left" }}>{si + 1} {s}</th>
              {probabilityLevels.map((p, pi) => {
                const ok = cellAcceptable(thresholds[si] ?? null, pi + 1)
                return (
                  <td key={p} style={{ ...cell, background: ok ? SemanticColor.SUCCESS : SemanticColor.DANGER, textAlign: "center" }}
                    title={ok ? "Acceptable" : "Not acceptable"}>
                    {ok ? "✓" : "✗"}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RiskAcceptabilityView({ policy }: { policy: RiskAcceptability }) {
  return (
    <div data-agent="risk-acceptability-view" style={{ margin: "8px 0" }}>
      <div className="field-label" style={{ marginBottom: 4 }}>ISO 14971 risk acceptability</div>
      <Matrix severityLevels={policy.severityLevels} probabilityLevels={policy.probabilityLevels} thresholds={policy.unacceptableFrom} />
    </div>
  )
}

const textareaStyle = { background: "white", border: "2px solid black", padding: "6px", fontFamily: "monospace", width: "100%", minHeight: 96 }

export function RiskAcceptabilityEditor({ draft, onChange }: {
  draft: RiskAcceptabilityDraft
  onChange: (draft: RiskAcceptabilityDraft) => void
}) {
  const severityLevels = linesOf(draft.severityLevels)
  const probabilityLevels = linesOf(draft.probabilityLevels)
  const thresholds = draftThresholds(draft)
  const setThreshold = (index: number, value: string) => {
    const next = [...thresholds]
    next[index] = value
    onChange({ ...draft, unacceptableFrom: next })
  }

  return (
    <fieldset data-agent="risk-acceptability-editor" style={{ border: "2px solid black", padding: "8px 12px", margin: "12px 0" }}>
      <legend className="field-label">ISO 14971 risk acceptability criteria</legend>
      <small style={{ display: "block", marginBottom: 8 }}>
        From your risk management plan. One level per line, lowest first (2–10 levels). For each severity, pick the lowest
        probability at which the risk is not acceptable; a more severe level may not accept more. Clear both lists to remove the criteria.
      </small>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 200px" }}>
          <span className="field-label">Severity levels</span>
          <textarea
            data-agent="input-risk-severity-levels"
            value={draft.severityLevels}
            onChange={(e) => onChange({ ...draft, severityLevels: e.target.value })}
            placeholder={"Negligible\nMinor\nSerious\nCritical\nCatastrophic"}
            style={textareaStyle}
          />
        </label>
        <label style={{ flex: "1 1 200px" }}>
          <span className="field-label">Probability levels</span>
          <textarea
            data-agent="input-risk-probability-levels"
            value={draft.probabilityLevels}
            onChange={(e) => onChange({ ...draft, probabilityLevels: e.target.value })}
            placeholder={"Improbable\nRemote\nOccasional\nProbable\nFrequent"}
            style={textareaStyle}
          />
        </label>
      </div>
      {severityLevels.length > 0 && probabilityLevels.length > 0 && (
        <>
          {severityLevels.map((s, i) => (
            <div className="form-row" key={`${i}-${s}`}>
              <label className="field-label" htmlFor={`risk-threshold-${i}`}>{s}: not acceptable from</label>
              <select
                id={`risk-threshold-${i}`}
                data-agent={`select-risk-threshold-${i}`}
                value={thresholds[i]}
                onChange={(e) => setThreshold(i, e.target.value)}
              >
                <option value="">never (always acceptable)</option>
                {probabilityLevels.map((p, pi) => <option key={p} value={String(pi + 1)}>{pi + 1} – {p}</option>)}
              </select>
            </div>
          ))}
          <Matrix
            severityLevels={severityLevels}
            probabilityLevels={probabilityLevels}
            thresholds={thresholds.map((t) => (t === "" ? null : Number(t)))}
          />
        </>
      )}
    </fieldset>
  )
}

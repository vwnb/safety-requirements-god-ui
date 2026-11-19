import type { StandardCheck, StandardChecksResult } from "../App"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"

const STANDARD_LABEL: Record<string, string> = {
  ISO_26262: "ISO 26262",
  IEC_61508: "IEC 61508",
  ISO_13849: "ISO 13849",
  ISO_14971: "ISO 14971",
  IEC_61800: "IEC 61800-5-2",
}

function CheckRow({ check }: { check: StandardCheck }) {
  const failing = check.missing.length > 0
  return (
    <li data-agent="standard-check" data-check-id={check.id} style={{ marginBottom: 6 }}>
      <span className="tag" style={{ background: failing ? SemanticColor.DANGER : SemanticColor.SUCCESS, marginRight: 6 }}>
        {check.covered}/{check.total}
      </span>
      {check.title} <small style={{ opacity: 0.7 }}>({check.reference})</small>
      {check.note && <InfoButton title={check.title} content={check.note} />}
      {failing && (
        <div style={{ marginLeft: 8, overflowWrap: "anywhere" }}>
          <small><span className="field-label">Missing</span> {check.missing.join(", ")}</small>
        </div>
      )}
    </li>
  )
}

/**
 * The backend's per-standard traceability checks (graph evidence for review, not a compliance
 * verdict). Failing checks are listed first with the concept keys that fail them.
 */
export default function StandardChecksPanel({ result }: { result: StandardChecksResult }) {
  return (
    <div data-agent="standard-checks" style={{ marginTop: 10 }}>
      <div className="completeness-label-group">
        <span className="completeness-label">Standard checks</span>
        <InfoButton title="Standard checks" content={result.note} />
      </div>
      {result.standards.length === 0 && (
        <p data-agent="standard-checks-empty" style={{ margin: "4px 0" }}>
          <small>No standards tagged. Edit the work item and tag {Object.values(STANDARD_LABEL).join(", ")} to run that standard's checks.</small>
        </p>
      )}
      {result.standards.map((standard) => {
        const checks = result.checks.filter((c) => c.standard === standard)
        if (checks.length === 0) return null
        const failing = checks.filter((c) => c.missing.length > 0)
        const passing = checks.filter((c) => c.missing.length === 0)
        return (
          <details key={standard} open={failing.length > 0} style={{ margin: "8px 0" }}>
            <summary>
              <strong>{STANDARD_LABEL[standard] ?? standard}</strong> — {passing.length}/{checks.length} passing
            </summary>
            <ul style={{ listStyle: "none", paddingLeft: 8 }}>
              {[...failing, ...passing].map((check) => <CheckRow key={check.id} check={check} />)}
            </ul>
          </details>
        )
      })}
    </div>
  )
}

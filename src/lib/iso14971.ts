/**
 * ISO 14971 risk management in the UI. The backend owns the method: it validates the work item's
 * risk acceptability criteria and derives each hazardous situation's risk (`riskEstimate`). The UI
 * edits the stored levels and shows what the backend derived; it never computes risk itself.
 */

/** The manufacturer's criteria from the risk management plan, as stored on the work item. */
export type RiskAcceptability = {
  /** Least to most severe. */
  severityLevels: string[]
  /** Least to most probable. */
  probabilityLevels: string[]
  /** Per severity level, the lowest probability level (1-based) whose risk is not acceptable; null = always acceptable. */
  unacceptableFrom: Array<number | null>
}

export type RiskControlOption = "INHERENT_SAFETY_BY_DESIGN" | "PROTECTIVE_MEASURE" | "INFORMATION_FOR_SAFETY"

export const RISK_CONTROL_OPTIONS: { value: RiskControlOption; label: string }[] = [
  { value: "INHERENT_SAFETY_BY_DESIGN", label: "1 – Inherent safety by design" },
  { value: "PROTECTIVE_MEASURE", label: "2 – Protective measure" },
  { value: "INFORMATION_FOR_SAFETY", label: "3 – Information for safety" },
]

export type RiskLevel = { probability: number; probabilityLabel: string; acceptable: boolean }

/** Derived by the backend for HAZARDOUS_SITUATION concepts; read-only. */
export type RiskEstimate = {
  severity: number | null
  severityLabel: string | null
  worstHarm: string | null
  initial: RiskLevel | null
  residual: RiskLevel | null
  reason: string | null
}

/** ISO 14971 levels being edited; "" means not set. Levels are kept as select values. */
export type Iso14971Fields = {
  harmSeverity: string
  initialProbability: string
  residualProbability: string
  riskControlOption: RiskControlOption | ""
}

type Iso14971Source = {
  harmSeverity?: number | null
  initialProbability?: number | null
  residualProbability?: number | null
  riskControlOption?: RiskControlOption | null
}

const text = (value: number | null | undefined) => (value != null ? String(value) : "")
const level = (value: string) => (value === "" ? null : Number(value))

export function iso14971FieldsOf(concept: Iso14971Source): Iso14971Fields {
  return {
    harmSeverity: text(concept.harmSeverity),
    initialProbability: text(concept.initialProbability),
    residualProbability: text(concept.residualProbability),
    riskControlOption: concept.riskControlOption || "",
  }
}

/**
 * Edit-form values as API values, for the fields the concept's type owns. The backend rejects a
 * field on any other type and clears the fields of a type the concept no longer has.
 */
export function iso14971Payload(type: string, fields: Iso14971Fields) {
  if (type === "HARM") return { harmSeverity: level(fields.harmSeverity) }
  if (type === "HAZARDOUS_SITUATION") {
    return { initialProbability: level(fields.initialProbability), residualProbability: level(fields.residualProbability) }
  }
  if (type === "RISK_CONTROL_MEASURE") return { riskControlOption: fields.riskControlOption || null }
  return {}
}

export function iso14971FieldsOrNull(concept: Iso14971Source) {
  return {
    harmSeverity: concept.harmSeverity ?? null,
    initialProbability: concept.initialProbability ?? null,
    residualProbability: concept.residualProbability ?? null,
    riskControlOption: concept.riskControlOption ?? null,
  }
}

/** Select options for a scale: the policy's labels when it has them, otherwise bare levels 1-10. */
export function scaleOptions(labels: string[] | undefined): { value: string; label: string }[] {
  const names = labels && labels.length > 0 ? labels : Array.from({ length: 10 }, () => "")
  return names.map((name, i) => ({ value: String(i + 1), label: name ? `${i + 1} – ${name}` : String(i + 1) }))
}

/** A risk level for display, e.g. "Occasional · not acceptable". */
export const riskLevelText = (risk: RiskLevel) => `${risk.probabilityLabel} · ${risk.acceptable ? "acceptable" : "not acceptable"}`

/**
 * The risk acceptability editor's draft: scales as one level per line, lowest first, and per
 * severity line the "unacceptable from" probability level ("" = always acceptable).
 */
export type RiskAcceptabilityDraft = {
  severityLevels: string
  probabilityLevels: string
  unacceptableFrom: string[]
}

export const linesOf = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean)

export function riskAcceptabilityDraftOf(policy: RiskAcceptability | null | undefined): RiskAcceptabilityDraft {
  return {
    severityLevels: (policy?.severityLevels ?? []).join("\n"),
    probabilityLevels: (policy?.probabilityLevels ?? []).join("\n"),
    unacceptableFrom: (policy?.unacceptableFrom ?? []).map((t) => (t == null ? "" : String(t))),
  }
}

/** The draft's threshold for each severity line, padded or trimmed to the number of lines. */
export function draftThresholds(draft: RiskAcceptabilityDraft): string[] {
  return linesOf(draft.severityLevels).map((_, i) => draft.unacceptableFrom[i] ?? "")
}

/**
 * The draft as an API value: null clears the criteria when both scales are empty. Anything else is
 * sent as written; the backend validates it and answers 400 with the reason.
 */
export function riskAcceptabilityPayload(draft: RiskAcceptabilityDraft): RiskAcceptability | null {
  const severityLevels = linesOf(draft.severityLevels)
  const probabilityLevels = linesOf(draft.probabilityLevels)
  if (severityLevels.length === 0 && probabilityLevels.length === 0) return null
  return {
    severityLevels,
    probabilityLevels,
    unacceptableFrom: draftThresholds(draft).map((t) => (t === "" ? null : Number(t))),
  }
}

/** Whether a matrix cell is acceptable, for previews only; the backend decides for real risks. */
export const cellAcceptable = (threshold: number | null, probability: number) => threshold === null || probability < threshold

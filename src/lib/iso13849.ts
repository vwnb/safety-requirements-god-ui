import type { Concept, Iso13849Fields } from "../App"

type Iso13849Source = Partial<Pick<Concept, "category13849" | "mttfdYears" | "dcavgPercent" | "ccfScore">>

/** A safety function's ISO 13849-1 parameters as edit-form values; "" means not set. */
export function iso13849FieldsOf(concept: Iso13849Source): Iso13849Fields {
  return {
    category13849: concept.category13849 || "",
    mttfdYears: concept.mttfdYears != null ? String(concept.mttfdYears) : "",
    dcavgPercent: concept.dcavgPercent != null ? String(concept.dcavgPercent) : "",
    ccfScore: concept.ccfScore != null ? String(concept.ccfScore) : "",
  }
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value))

/** Edit-form values as API values; the backend range-checks the numbers and answers 400 with a message. */
export function iso13849Payload(fields: Iso13849Fields) {
  return {
    category13849: fields.category13849 || null,
    mttfdYears: numberOrNull(fields.mttfdYears),
    dcavgPercent: numberOrNull(fields.dcavgPercent),
    ccfScore: numberOrNull(fields.ccfScore),
  }
}

/** The stored parameters of a concept, as returned by the API (null when not set). */
export function iso13849FieldsOrNull(concept: Iso13849Source) {
  return {
    category13849: concept.category13849 ?? null,
    mttfdYears: concept.mttfdYears ?? null,
    dcavgPercent: concept.dcavgPercent ?? null,
    ccfScore: concept.ccfScore ?? null,
  }
}

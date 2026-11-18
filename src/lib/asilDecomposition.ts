import type { ASIL } from "../App"

/** Requirement types that may carry an ISO 26262-9 decomposed ASIL; safety goals and safety functions may not. */
export const DECOMPOSABLE_TYPES: ReadonlySet<string> = new Set([
  "FUNCTIONAL_SAFETY_REQUIREMENT",
  "TECHNICAL_SAFETY_REQUIREMENT",
  "HARDWARE_REQUIREMENT",
  "SOFTWARE_REQUIREMENT",
  "HARDWARE_SAFETY_REQUIREMENT",
  "SOFTWARE_SAFETY_REQUIREMENT",
])

export const ASIL_ORDER: ASIL[] = ["QM", "ASIL_A", "ASIL_B", "ASIL_C", "ASIL_D"]

const short = (asil: ASIL) => (asil === "QM" ? "QM" : asil.replace("ASIL_", ""))

/** ISO 26262 notation, matching the backend: "ASIL B(D)", "QM(D)", or "ASIL D" without a parent. */
export function asilNotation(asil: ASIL, decomposedFrom?: ASIL | null): string {
  const base = asil === "QM" ? "QM" : `ASIL ${short(asil)}`
  return decomposedFrom ? `${base}(${short(decomposedFrom)})` : base
}

/** Decomposed ASILs selectable under a work item's ASIL (never above it); empty when it has no ASIL of A or higher. */
export function decompositionOptions(workItemAsil: ASIL | null | undefined): ASIL[] {
  if (!workItemAsil || workItemAsil === "QM") return []
  return ASIL_ORDER.slice(0, ASIL_ORDER.indexOf(workItemAsil) + 1)
}

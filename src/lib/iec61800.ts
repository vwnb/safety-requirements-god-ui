import type { SIL } from "../App"

/**
 * IEC 61800-5-2 drive safety functions in the UI. The backend derives `driveSil` (the SIL the
 * drive supports: the lower of its SIL capability and PFH band); the UI only edits and shows.
 */

export type DriveSafetyFunction =
  | "STO" | "SS1_D" | "SS1_R" | "SS1_T" | "SS2_D" | "SS2_R" | "SS2_T"
  | "SOS" | "SLA" | "SAR" | "SLS" | "SSR" | "SLT" | "STR" | "SLP" | "SLI" | "SDI" | "SMT"
  | "SBC" | "SCA" | "SSM"

export type DriveFunctionKind = "STOPPING" | "MONITORING" | "OUTPUT"

/** Grouped as the backend classifies them; option values are the backend enum values. */
export const DRIVE_FUNCTION_GROUPS: { kind: DriveFunctionKind; label: string; options: { value: DriveSafetyFunction; label: string }[] }[] = [
  { kind: "STOPPING", label: "Stopping functions", options: [
    { value: "STO", label: "STO – Safe torque off (stop category 0)" },
    { value: "SS1_D", label: "SS1-d – Safe stop 1, deceleration monitored" },
    { value: "SS1_R", label: "SS1-r – Safe stop 1, ramp monitored" },
    { value: "SS1_T", label: "SS1-t – Safe stop 1, time controlled" },
    { value: "SS2_D", label: "SS2-d – Safe stop 2, deceleration monitored" },
    { value: "SS2_R", label: "SS2-r – Safe stop 2, ramp monitored" },
    { value: "SS2_T", label: "SS2-t – Safe stop 2, time controlled" },
  ] },
  { kind: "MONITORING", label: "Monitoring functions", options: [
    { value: "SOS", label: "SOS – Safe operating stop" },
    { value: "SLA", label: "SLA – Safely limited acceleration" },
    { value: "SAR", label: "SAR – Safe acceleration range" },
    { value: "SLS", label: "SLS – Safely limited speed" },
    { value: "SSR", label: "SSR – Safe speed range" },
    { value: "SLT", label: "SLT – Safely limited torque" },
    { value: "STR", label: "STR – Safe torque range" },
    { value: "SLP", label: "SLP – Safely limited position" },
    { value: "SLI", label: "SLI – Safely limited increment" },
    { value: "SDI", label: "SDI – Safe direction" },
    { value: "SMT", label: "SMT – Safe motor temperature" },
  ] },
  { kind: "OUTPUT", label: "Output functions", options: [
    { value: "SBC", label: "SBC – Safe brake control" },
    { value: "SCA", label: "SCA – Safe cam" },
    { value: "SSM", label: "SSM – Safe speed monitor" },
  ] },
]

/** Short display name, e.g. "SS1-d". */
export const driveFunctionShort = (fn: DriveSafetyFunction) => fn.replace("_", "-").replace(/-([DRT])$/, (_, v: string) => `-${v.toLowerCase()}`)

export const DRIVE_SIL_OPTIONS: SIL[] = ["SIL_1", "SIL_2", "SIL_3"]

/** Derived by the backend for SAFETY_FUNCTION concepts with a drive safety function; read-only. */
export type DriveSil = {
  sil: SIL | null
  pfhSil: SIL | null
  kind: DriveFunctionKind | null
  stopCategory: 0 | 1 | 2 | null
  reason: string | null
}

/** IEC 61800 fields being edited on a SAFETY_FUNCTION; "" means not set. PFH is kept as input text. */
export type Iec61800Fields = {
  driveSafetyFunction: DriveSafetyFunction | ""
  driveSilCapability: SIL | ""
  drivePfhPerHour: string
}

type Iec61800Source = {
  driveSafetyFunction?: DriveSafetyFunction | null
  driveSilCapability?: SIL | null
  drivePfhPerHour?: number | null
}

export function iec61800FieldsOf(concept: Iec61800Source): Iec61800Fields {
  return {
    driveSafetyFunction: concept.driveSafetyFunction || "",
    driveSilCapability: concept.driveSilCapability || "",
    drivePfhPerHour: concept.drivePfhPerHour != null ? String(concept.drivePfhPerHour) : "",
  }
}

/** Edit-form values as API values; the backend range-checks PFH and answers 400 with a message. */
export function iec61800Payload(fields: Iec61800Fields) {
  return {
    driveSafetyFunction: fields.driveSafetyFunction || null,
    driveSilCapability: fields.driveSilCapability || null,
    drivePfhPerHour: fields.drivePfhPerHour.trim() === "" ? null : Number(fields.drivePfhPerHour),
  }
}

export function iec61800FieldsOrNull(concept: Iec61800Source) {
  return {
    driveSafetyFunction: concept.driveSafetyFunction ?? null,
    driveSilCapability: concept.driveSilCapability ?? null,
    drivePfhPerHour: concept.drivePfhPerHour ?? null,
  }
}

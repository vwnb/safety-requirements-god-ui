/**
 * Client for POST /projects/:projectId/huggingface-dataset (admin only).
 *
 * The limits below mirror the backend's validation so the form can reject
 * bad input before spending the one-request-per-minute throttle. The server
 * stays authoritative. Nothing here persists the report or the redact terms.
 */
import type { ApiFetchFn } from "./apiFetchContext"

const API = import.meta.env.VITE_API_URL || ""

export const MAX_REDACT_TERMS = 200
export const MAX_REDACT_TERM_LENGTH = 200
export const MAX_EXTRA_FILES = 50
export const MAX_EXTRA_FILE_BYTES = 1_000_000
export const MAX_EXTRA_TOTAL_BYTES = 3_000_000
export const MAX_EXTRA_PATH_LENGTH = 200
export const MAX_EXTRA_PATH_DEPTH = 4
export const MAX_CARD_FIELD_LENGTH = 20_000
export const DEFAULT_LICENSE = "CC-BY-4.0"

export const EXTRA_FILE_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
}
export const EXTRA_FILE_ACCEPT = Object.keys(EXTRA_FILE_TYPES).join(",")

const GENERATED_PATHS = ["data.json", "dataset_info.json", "readme.md", "eu-ai-label.svg"]
const GENERATED_DIR = "refinement-reports/"
const PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/
const REPO_ID_PATTERN = /^[\w.-]{1,96}\/[\w.-]{1,96}$/
const LICENSE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/

export const CARD_FIELDS = ["title", "scope", "method", "limitations", "disclosure"] as const
/** Matches the server's MAX_WORK_ITEM_IDS. */
export const MAX_WORK_ITEM_IDS = 500

export type CardField = (typeof CARD_FIELDS)[number]

export interface ExtraFile {
  path: string
  content: string
  contentType: string
}

export interface ExportForm {
  redactTerms: string[]
  card: Record<CardField, string>
  license: string
  extraFiles: ExtraFile[]
  repoId: string
  private: boolean
  /** Work items to export; undefined means every work item in the project. */
  workItemIds?: string[]
}

export type PatternName = "EMAIL" | "URL" | "DID" | "ID" | "ADDRESS" | "HASH" | "IP" | "PHONE"

export interface PossibleLeak {
  term: string
  source: "caller" | "automatic" | "key"
  path: string
  count: number
}

export interface RedactionReport {
  redactTermCount: number
  terms: Array<{ term: string; count: number }>
  unmatchedTerms: string[]
  patterns: Partial<Record<PatternName, number>>
  pseudonymizedKeys: number
  files: Array<{ path: string; bytes: number; redactions: number }>
  possibleLeaks: PossibleLeak[]
}

export interface ExportFile {
  path: string
  contentType: string
  content: string
}

export interface DryRunResponse {
  projectId: string
  dryRun: true
  pushedToHub: false
  workItemCount: number
  files: ExportFile[]
  report: RedactionReport
}

export interface PublishResponse {
  projectId: string
  dryRun: false
  pushedToHub: true
  repoId: string
  datasetUrl: string
  workItemCount: number
  files: string[]
}

export type ExportResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "leaks"; error: string; possibleLeakCount: number; files: string[] }
  | { kind: "throttled"; error: string; retryAfterSeconds: number }
  | { kind: "error"; status: number; error: string }

/** Content type for an extra file path, or null when the extension is not allowed. */
export function contentTypeForPath(path: string): string | null {
  const lower = path.toLowerCase()
  const ext = Object.keys(EXTRA_FILE_TYPES).find((e) => lower.endsWith(e))
  return ext ? EXTRA_FILE_TYPES[ext] : null
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Splits a textarea into redact terms: one per line, trimmed, blanks and duplicates dropped. */
export function parseRedactTerms(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const term = line.trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    out.push(term)
  }
  return out
}

export function redactTermsError(terms: string[]): string | null {
  if (terms.length > MAX_REDACT_TERMS) return `At most ${MAX_REDACT_TERMS} redact terms (got ${terms.length}).`
  const long = terms.find((t) => t.length > MAX_REDACT_TERM_LENGTH)
  if (long) return `Redact terms can be at most ${MAX_REDACT_TERM_LENGTH} characters ("${long.slice(0, 20)}…").`
  return null
}

/** Path problems that would make the server reject the file, or null. */
export function extraFilePathError(path: string, redactTerms: string[] = []): string | null {
  if (path.length === 0 || path.length > MAX_EXTRA_PATH_LENGTH) {
    return `Path must be 1 to ${MAX_EXTRA_PATH_LENGTH} characters.`
  }
  if (!PATH_PATTERN.test(path)) {
    return "Path must be relative: letters, digits, '.', '_' and '-' separated by '/', each part starting with a letter or digit."
  }
  if (path.split("/").length > MAX_EXTRA_PATH_DEPTH) {
    return `Path can be at most ${MAX_EXTRA_PATH_DEPTH} levels deep.`
  }
  const lower = path.toLowerCase()
  if (GENERATED_PATHS.includes(lower) || lower.startsWith(GENERATED_DIR)) {
    return "Path collides with a file the export generates."
  }
  if (!contentTypeForPath(path)) {
    return `Path must end in ${Object.keys(EXTRA_FILE_TYPES).join(", ")}.`
  }
  // The server rejects a path the redactor would change. A plain substring
  // check is stricter than its word matching, which is the safe side.
  const hit = redactTerms.find((t) => t && lower.includes(t.toLowerCase()))
  if (hit) return "Path contains a redact term; rename the file."
  return null
}

/** Problems with one file's content, or null. */
export function extraFileContentError(file: ExtraFile): string | null {
  if (utf8Bytes(file.content) > MAX_EXTRA_FILE_BYTES) {
    return `File is larger than ${MAX_EXTRA_FILE_BYTES.toLocaleString()} bytes.`
  }
  if (file.contentType === "application/json") {
    try {
      JSON.parse(file.content)
    } catch {
      return "File is not valid JSON."
    }
  }
  return null
}

/** Per-file errors (keyed by index) and list-level errors for all extra files. */
export function validateExtraFiles(
  files: ExtraFile[],
  redactTerms: string[]
): { fileErrors: Record<number, string>; listErrors: string[] } {
  const fileErrors: Record<number, string> = {}
  const listErrors: string[] = []
  if (files.length > MAX_EXTRA_FILES) listErrors.push(`At most ${MAX_EXTRA_FILES} extra files (got ${files.length}).`)
  const seen = new Map<string, number>()
  let total = 0
  files.forEach((file, i) => {
    const error = extraFilePathError(file.path, redactTerms) ?? extraFileContentError(file)
    if (error) fileErrors[i] = error
    const key = file.path.toLowerCase()
    if (seen.has(key) && !fileErrors[i]) fileErrors[i] = "Path is used more than once."
    seen.set(key, i)
    total += utf8Bytes(file.content)
  })
  if (total > MAX_EXTRA_TOTAL_BYTES) {
    listErrors.push(`Extra files are ${total.toLocaleString()} bytes; the limit is ${MAX_EXTRA_TOTAL_BYTES.toLocaleString()} in total.`)
  }
  return { fileErrors, listErrors }
}

/** All blocking form errors. Empty means the request can be sent. */
export function validateForm(form: ExportForm): string[] {
  const errors: string[] = []
  const termsError = redactTermsError(form.redactTerms)
  if (termsError) errors.push(termsError)
  for (const field of CARD_FIELDS) {
    if (form.card[field].length > MAX_CARD_FIELD_LENGTH) {
      errors.push(`${field} can be at most ${MAX_CARD_FIELD_LENGTH.toLocaleString()} characters.`)
    }
  }
  if (form.license.trim() && !LICENSE_PATTERN.test(form.license.trim())) {
    errors.push("License must be a Hugging Face license identifier such as CC-BY-4.0.")
  }
  if (form.repoId.trim() && !REPO_ID_PATTERN.test(form.repoId.trim())) {
    errors.push("Repo ID must look like namespace/name.")
  }
  if (form.workItemIds && form.workItemIds.length === 0) {
    errors.push("Pick at least one work item, or export all of them.")
  }
  if (form.workItemIds && form.workItemIds.length > MAX_WORK_ITEM_IDS) {
    errors.push(`At most ${MAX_WORK_ITEM_IDS} work items can be picked.`)
  }
  const { fileErrors, listErrors } = validateExtraFiles(form.extraFiles, form.redactTerms)
  errors.push(...listErrors)
  for (const [i, error] of Object.entries(fileErrors)) {
    errors.push(`${form.extraFiles[Number(i)].path || `File ${Number(i) + 1}`}: ${error}`)
  }
  return errors
}

/** Request body for the form. Empty optional fields are left out so server defaults apply. */
export function buildRequestBody(
  form: ExportForm,
  opts: { dryRun: boolean; allowPossibleLeaks?: boolean }
): Record<string, unknown> {
  const body: Record<string, unknown> = { private: form.private }
  if (form.redactTerms.length) body.redactTerms = form.redactTerms
  if (form.workItemIds) body.workItemIds = form.workItemIds
  if (form.extraFiles.length) body.extraFiles = form.extraFiles
  for (const field of CARD_FIELDS) {
    if (form.card[field].trim()) body[field] = form.card[field]
  }
  if (form.license.trim()) body.license = form.license.trim()
  if (form.repoId.trim()) body.repoId = form.repoId.trim()
  if (opts.dryRun) body.dryRun = true
  if (opts.allowPossibleLeaks) body.allowPossibleLeaks = true
  return body
}

function retryAfter(res: Response, body: Record<string, unknown>): number {
  if (typeof body.retryAfterSeconds === "number" && body.retryAfterSeconds > 0) return Math.ceil(body.retryAfterSeconds)
  const header = Number(res.headers.get("Retry-After"))
  return Number.isFinite(header) && header > 0 ? Math.ceil(header) : 60
}

export async function postProjectDatasetExport<T extends DryRunResponse | PublishResponse>(
  apiFetch: ApiFetchFn,
  projectId: string,
  body: Record<string, unknown>
): Promise<ExportResult<T>> {
  let res: Response
  try {
    res = await apiFetch(`${API}/projects/${encodeURIComponent(projectId)}/huggingface-dataset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return { kind: "error", status: 0, error: err instanceof Error ? err.message : String(err) }
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  const error = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : `HTTP ${res.status}`
  if (res.ok) return { kind: "ok", data: data as unknown as T }
  if (res.status === 429) return { kind: "throttled", error, retryAfterSeconds: retryAfter(res, data) }
  if (res.status === 422) {
    return {
      kind: "leaks",
      error,
      possibleLeakCount: typeof data.possibleLeakCount === "number" ? data.possibleLeakCount : 0,
      files: Array.isArray(data.files) ? (data.files as string[]) : [],
    }
  }
  if (res.status === 404) return { kind: "error", status: 404, error: "Project not found." }
  if (res.status === 403) return { kind: "error", status: 403, error: "Only admins can export project datasets." }
  return { kind: "error", status: res.status, error }
}

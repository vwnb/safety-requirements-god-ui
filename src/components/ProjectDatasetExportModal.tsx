import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react"
import Modal from "./Modal"
import { SemanticColor } from "../lib/SemanticColor"
import type { ApiFetchFn } from "../lib/apiFetchContext"
import {
  CARD_FIELDS,
  DEFAULT_LICENSE,
  EXTRA_FILE_ACCEPT,
  MAX_CARD_FIELD_LENGTH,
  MAX_EXTRA_FILE_BYTES,
  MAX_EXTRA_FILES,
  MAX_REDACT_TERMS,
  buildRequestBody,
  contentTypeForPath,
  parseRedactTerms,
  postProjectDatasetExport,
  utf8Bytes,
  validateExtraFiles,
  validateForm,
  type CardField,
  type DryRunResponse,
  type ExportForm,
  type ExtraFile,
  type PossibleLeak,
  type PublishResponse,
} from "../lib/projectDatasetExport"

const inputStyle: CSSProperties = {
  background: "white",
  border: "2px solid black",
  padding: "6px",
  fontFamily: "monospace",
  width: "100%",
  boxSizing: "border-box",
}
const sectionStyle: CSSProperties = { border: "2px solid black", padding: 12, marginBottom: 12 }
const tableStyle: CSSProperties = { borderCollapse: "collapse", width: "100%", fontSize: 12, fontFamily: "monospace" }
const cellStyle: CSSProperties = { border: "1px solid black", padding: "2px 6px", textAlign: "left", verticalAlign: "top" }

const CARD_LABELS: Record<CardField, string> = {
  title: "Title",
  scope: "Scope",
  method: "Method",
  limitations: "Limitations",
  disclosure: "Disclosure",
}

const PATTERN_LABELS = ["EMAIL", "URL", "DID", "ID", "ADDRESS", "HASH", "IP", "PHONE"] as const

const emptyCard = (): Record<CardField, string> => ({ title: "", scope: "", method: "", limitations: "", disclosure: "" })

/** Highlights each occurrence of the given terms (case-sensitive, like the server's leak count). */
function highlight(content: string, terms: string[]): ReactNode {
  const uniq = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!uniq.length) return content
  const re = new RegExp(`(${uniq.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")
  return content.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} style={{ background: SemanticColor.DANGER, outline: "2px solid black" }}>{part}</mark>
    ) : (
      part
    )
  )
}

type Status =
  | { kind: "idle" }
  | { kind: "busy"; label: string }
  | { kind: "error"; message: string }
  | { kind: "leaks"; message: string; possibleLeakCount: number; files: string[] }
  | { kind: "published"; data: PublishResponse }

export function ProjectDatasetExportModal({
  apiFetch,
  projectId,
  projectKey,
  workItems,
  initialWorkItemIds,
  onClose,
}: {
  apiFetch: ApiFetchFn
  projectId: string
  projectKey: string
  /** The project's work items, in display order; null while loading. */
  workItems: Array<{ id: string; key: string; name: string }> | null
  /** Start with only these work items picked instead of the whole project. */
  initialWorkItemIds?: string[]
  onClose: () => void
}) {
  // Everything below lives in component state only; closing the modal drops it.
  const [termsText, setTermsText] = useState("")
  const [card, setCard] = useState(emptyCard)
  const [license, setLicense] = useState(DEFAULT_LICENSE)
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([])
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [repoId, setRepoId] = useState("")
  const [isPrivate, setIsPrivate] = useState(true)
  // null exports every work item; a set exports only those (kept in project order).
  const [pickedIds, setPickedIds] = useState<Set<string> | null>(() =>
    initialWorkItemIds ? new Set(initialWorkItemIds) : null
  )

  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null)
  const [dryRunBody, setDryRunBody] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (retryAt === null) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= retryAt) setRetryAt(null)
    }, 1000)
    return () => clearInterval(id)
  }, [retryAt])
  const retryIn = retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000))

  const redactTerms = useMemo(() => parseRedactTerms(termsText), [termsText])
  const workItemIds = useMemo(
    () => (pickedIds === null ? undefined : (workItems ?? []).filter((w) => pickedIds.has(w.id)).map((w) => w.id)),
    [pickedIds, workItems]
  )
  const form: ExportForm = useMemo(
    () => ({ redactTerms, card, license, extraFiles, repoId, private: isPrivate, workItemIds }),
    [redactTerms, card, license, extraFiles, repoId, isPrivate, workItemIds]
  )
  const formErrors = useMemo(() => validateForm(form), [form])
  const { fileErrors } = useMemo(() => validateExtraFiles(extraFiles, redactTerms), [extraFiles, redactTerms])
  const publishBody = useMemo(() => JSON.stringify(buildRequestBody(form, { dryRun: false })), [form])
  const dryRunIsCurrent = dryRunBody !== null && dryRunBody === publishBody

  const busy = status.kind === "busy"
  const blocked = busy || retryIn > 0 || formErrors.length > 0
  const selectionKey = (ids: Iterable<string> | null | undefined) => (ids ? [...ids].sort().join(",") : null)
  const selectionChanged = selectionKey(pickedIds) !== selectionKey(initialWorkItemIds)
  const dirty =
    !!termsText ||
    extraFiles.length > 0 ||
    !!repoId ||
    CARD_FIELDS.some((f) => card[f]) ||
    selectionChanged ||
    dryRun !== null

  const handleClose = () => {
    if (busy) return
    if (dirty && status.kind !== "published" && !confirm("Close the export? The form and dry-run report will be discarded.")) return
    onClose()
  }

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    const errors: string[] = []
    const added: ExtraFile[] = []
    for (const file of picked) {
      const contentType = contentTypeForPath(file.name)
      if (!contentType) {
        errors.push(`${file.name}: only ${EXTRA_FILE_ACCEPT} files can be added.`)
        continue
      }
      if (file.size > MAX_EXTRA_FILE_BYTES) {
        errors.push(`${file.name}: larger than ${MAX_EXTRA_FILE_BYTES.toLocaleString()} bytes.`)
        continue
      }
      if (extraFiles.length + added.length >= MAX_EXTRA_FILES) {
        errors.push(`${file.name}: at most ${MAX_EXTRA_FILES} extra files.`)
        continue
      }
      try {
        added.push({ path: file.name, content: await file.text(), contentType })
      } catch {
        errors.push(`${file.name}: could not be read.`)
      }
    }
    setUploadErrors(errors)
    if (added.length) setExtraFiles((prev) => [...prev, ...added])
  }

  const renameFile = (index: number, path: string) => {
    setExtraFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, path, contentType: contentTypeForPath(path) ?? f.contentType } : f))
    )
  }

  const runDryRun = async () => {
    if (blocked) return
    setStatus({ kind: "busy", label: "Running dry run…" })
    setConfirmPublish(false)
    const body = buildRequestBody(form, { dryRun: true })
    const result = await postProjectDatasetExport<DryRunResponse>(apiFetch, projectId, body)
    if (result.kind === "ok") {
      setDryRun(result.data)
      setDryRunBody(publishBody)
      setPreviewPath(null)
      setStatus({ kind: "idle" })
    } else if (result.kind === "throttled") {
      setRetryAt(Date.now() + result.retryAfterSeconds * 1000)
      setNow(Date.now())
      setStatus({ kind: "error", message: result.error })
    } else {
      setStatus({ kind: "error", message: result.error })
    }
  }

  const publish = async (allowPossibleLeaks: boolean) => {
    if (blocked) return
    setStatus({ kind: "busy", label: "Publishing to Hugging Face…" })
    setConfirmPublish(false)
    const body = buildRequestBody(form, { dryRun: false, allowPossibleLeaks })
    const result = await postProjectDatasetExport<PublishResponse>(apiFetch, projectId, body)
    if (result.kind === "ok") {
      setStatus({ kind: "published", data: result.data })
    } else if (result.kind === "leaks") {
      setStatus({ kind: "leaks", message: result.error, possibleLeakCount: result.possibleLeakCount, files: result.files })
    } else if (result.kind === "throttled") {
      setRetryAt(Date.now() + result.retryAfterSeconds * 1000)
      setNow(Date.now())
      setStatus({ kind: "error", message: result.error })
    } else {
      setStatus({ kind: "error", message: result.error })
    }
  }

  if (status.kind === "published") {
    const { data } = status
    return (
      <Modal title="Dataset published" onClose={onClose} width={560}>
        <p data-agent="hf-project-export-success" style={{ marginTop: 0 }}>
          {data.workItemCount} work items published to{" "}
          <a href={data.datasetUrl} target="_blank" rel="noreferrer">{data.repoId}</a>.
        </p>
        <details>
          <summary>{data.files.length} files uploaded</summary>
          <ul style={{ fontFamily: "monospace", fontSize: 12 }}>
            {data.files.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </details>
        <div className="form-actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </Modal>
    )
  }

  const report = dryRun?.report
  const leaksByPath = new Map<string, PossibleLeak[]>()
  for (const leak of report?.possibleLeaks ?? []) {
    leaksByPath.set(leak.path, [...(leaksByPath.get(leak.path) ?? []), leak])
  }
  const previewFile = dryRun?.files.find((f) => f.path === previewPath) ?? null

  return (
    <Modal title={`Hugging Face dataset — ${projectKey}`} onClose={handleClose} width={900}>
      <div data-agent="hf-project-export" style={{ maxHeight: "75vh", overflow: "auto", paddingRight: 4 }}>
        <p style={{ marginTop: 0, fontSize: 13 }}>
          Exports this project's work items, all or the ones you pick, as one anonymized dataset. Run a dry run and
          review the report before publishing. Exports are limited to one request per minute, dry runs included.
        </p>

        <section style={sectionStyle} data-agent="hf-project-export-work-items">
          <div className="title" style={{ marginBottom: 8 }}>Work items</div>
          {workItems === null ? (
            <p style={{ margin: 0, fontSize: 12 }}>Loading work items…</p>
          ) : (
            <>
              <label style={{ display: "block", fontSize: 13 }}>
                <input
                  type="radio"
                  data-agent="radio-hf-work-items-all"
                  checked={pickedIds === null}
                  onChange={() => setPickedIds(null)}
                />{" "}
                All {workItems.length} work items
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                <input
                  type="radio"
                  data-agent="radio-hf-work-items-pick"
                  checked={pickedIds !== null}
                  onChange={() => setPickedIds(new Set(workItems.map((w) => w.id)))}
                />{" "}
                Only the ones I pick
              </label>
              {pickedIds !== null && (
                <>
                  <p style={{ margin: "0 0 6px 0", fontSize: 12 }}>
                    Names from work items you leave out are still redacted from the ones you include.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <button type="button" onClick={() => setPickedIds(new Set(workItems.map((w) => w.id)))}>
                      Select all
                    </button>
                    <button type="button" onClick={() => setPickedIds(new Set())}>Select none</button>
                    <span style={{ fontSize: 12, alignSelf: "center" }}>
                      {pickedIds.size} of {workItems.length} selected
                    </span>
                  </div>
                  <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid black", padding: 6 }}>
                    {workItems.map((w) => (
                      <label key={w.id} style={{ display: "block", fontSize: 12, fontFamily: "monospace" }}>
                        <input
                          type="checkbox"
                          data-agent={`checkbox-hf-work-item-${w.key}`}
                          checked={pickedIds.has(w.id)}
                          onChange={(e) =>
                            setPickedIds((prev) => {
                              const next = new Set(prev ?? [])
                              if (e.target.checked) next.add(w.id)
                              else next.delete(w.id)
                              return next
                            })
                          }
                        />{" "}
                        {w.key} — {w.name}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section style={sectionStyle}>
          <div className="title" style={{ marginBottom: 8 }}>Redact terms</div>
          <p style={{ margin: "0 0 6px 0", fontSize: 12 }}>
            One per line. Names, slugs, addresses and ids to replace with [REDACTED]. Add spelling variants too.
            Project members and the project key are redacted automatically.
          </p>
          <textarea
            data-agent="input-hf-redact-terms"
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            rows={6}
            spellCheck={false}
            autoComplete="off"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, marginTop: 4 }}>{redactTerms.length} / {MAX_REDACT_TERMS} terms</div>
        </section>

        <section style={sectionStyle}>
          <div className="title" style={{ marginBottom: 8 }}>Data card</div>
          {CARD_FIELDS.map((field) => (
            <label key={field} style={{ display: "block", marginBottom: 8 }}>
              <div className="field-label" style={{ marginBottom: 2 }}>
                {CARD_LABELS[field]}{" "}
                <span style={{ fontWeight: 400, fontSize: 11 }}>
                  ({card[field].length.toLocaleString()} / {MAX_CARD_FIELD_LENGTH.toLocaleString()})
                </span>
              </div>
              {field === "title" ? (
                <input
                  data-agent={`input-hf-card-${field}`}
                  value={card[field]}
                  onChange={(e) => setCard((c) => ({ ...c, [field]: e.target.value }))}
                  style={inputStyle}
                />
              ) : (
                <textarea
                  data-agent={`input-hf-card-${field}`}
                  value={card[field]}
                  onChange={(e) => setCard((c) => ({ ...c, [field]: e.target.value }))}
                  rows={3}
                  style={inputStyle}
                />
              )}
            </label>
          ))}
          <label style={{ display: "block" }}>
            <div className="field-label" style={{ marginBottom: 2 }}>License</div>
            <input
              data-agent="input-hf-license"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder={DEFAULT_LICENSE}
              style={inputStyle}
            />
          </label>
        </section>

        <section style={sectionStyle}>
          <div className="title" style={{ marginBottom: 8 }}>Extra files</div>
          <p style={{ margin: "0 0 6px 0", fontSize: 12 }}>
            Markdown, CSV or JSON files to include ({MAX_EXTRA_FILES} files, 1 MB each, 3 MB total). Files are
            redacted like the rest of the dataset. Paths can include folders, e.g. <code>docs/method.md</code>.
          </p>
          <input data-agent="input-hf-extra-files" type="file" multiple accept={EXTRA_FILE_ACCEPT} onChange={handleFiles} />
          {uploadErrors.map((err) => (
            <div key={err} style={{ background: SemanticColor.DANGER, padding: 4, marginTop: 4, fontSize: 12 }}>{err}</div>
          ))}
          {extraFiles.length > 0 && (
            <table style={{ ...tableStyle, marginTop: 8 }}>
              <thead>
                <tr><th style={cellStyle}>Path</th><th style={cellStyle}>Type</th><th style={cellStyle}>Bytes</th><th style={cellStyle} /></tr>
              </thead>
              <tbody>
                {extraFiles.map((file, i) => (
                  <tr key={i} style={fileErrors[i] ? { background: SemanticColor.DANGER } : undefined}>
                    <td style={cellStyle}>
                      <input
                        aria-label={`Path of extra file ${i + 1}`}
                        value={file.path}
                        onChange={(e) => renameFile(i, e.target.value)}
                        style={{ ...inputStyle, padding: 2 }}
                      />
                      {fileErrors[i] && <div style={{ marginTop: 2 }}>{fileErrors[i]}</div>}
                    </td>
                    <td style={cellStyle}>{file.contentType}</td>
                    <td style={cellStyle}>{utf8Bytes(file.content).toLocaleString()}</td>
                    <td style={cellStyle}>
                      <button className="btn btn-xs" onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section style={sectionStyle}>
          <div className="title" style={{ marginBottom: 8 }}>Destination</div>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="field-label" style={{ marginBottom: 2 }}>Repo ID (namespace/name)</div>
            <input
              data-agent="input-hf-project-repo-id"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              placeholder="Leave empty for <token user>/safety-dataset-<project pseudonym>"
              style={inputStyle}
            />
          </label>
          <label className="checkbox-label">
            <input data-agent="input-hf-private" type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private repository
          </label>
        </section>

        {formErrors.length > 0 && (
          <div className="error-box" data-agent="hf-project-export-form-errors" style={{ background: SemanticColor.DANGER }}>
            {formErrors.map((err) => <div key={err} style={{ fontSize: 12 }}>{err}</div>)}
          </div>
        )}

        {status.kind === "error" && (
          <div className="error-box" data-agent="hf-project-export-error" style={{ background: SemanticColor.DANGER }}>
            <p className="error-text" style={{ marginBottom: 0 }}>{status.message}</p>
          </div>
        )}
        {retryIn > 0 && (
          <div className="error-box" data-agent="hf-project-export-throttled">
            Rate limited. You can send the next request in {retryIn}s.
          </div>
        )}

        {status.kind === "leaks" && (
          <div className="error-box" data-agent="hf-project-export-leaks" style={{ background: SemanticColor.DANGER }}>
            <p style={{ marginTop: 0 }}><strong>Publishing was stopped.</strong> {status.message}</p>
            <p>
              {status.possibleLeakCount} possible leak{status.possibleLeakCount === 1 ? "" : "s"} in:{" "}
              <code>{status.files.join(", ")}</code>
            </p>
            <p>Fix the redact terms and run a new dry run, or publish anyway if you have checked these are not identifying.</p>
            <div className="form-actions">
              <button className="btn" onClick={() => setStatus({ kind: "idle" })}>Back to the form</button>
              <button
                data-agent="btn-hf-publish-anyway"
                className="btn btn-danger"
                disabled={blocked}
                onClick={() => {
                  if (confirm(`Publish anyway? ${status.possibleLeakCount} possible leaks will be uploaded to Hugging Face.`)) {
                    void publish(true)
                  }
                }}
              >
                Publish anyway
              </button>
            </div>
          </div>
        )}

        {dryRun && report && (
          <section style={sectionStyle} data-agent="hf-project-export-report">
            <div className="title" style={{ marginBottom: 8 }}>
              Dry-run report {dryRunIsCurrent ? "" : <span style={{ background: SemanticColor.EVIDENCE, padding: "0 4px" }}>(form changed since)</span>}
            </div>
            <p style={{ marginTop: 0, fontSize: 13 }}>
              {dryRun.workItemCount} work items · {dryRun.files.length} files · {report.redactTermCount} redact terms ·{" "}
              {report.pseudonymizedKeys} keys pseudonymized
            </p>

            {report.possibleLeaks.length > 0 && (
              <div style={{ background: SemanticColor.DANGER, border: "2px solid black", padding: 8, marginBottom: 8 }} data-agent="hf-project-export-possible-leaks">
                <strong>{report.possibleLeaks.length} possible leaks</strong> — a term or original key still appears in the output, e.g. inside a longer word.
                <table style={{ ...tableStyle, marginTop: 6, background: "white" }}>
                  <thead><tr><th style={cellStyle}>Term</th><th style={cellStyle}>Source</th><th style={cellStyle}>File</th><th style={cellStyle}>Count</th></tr></thead>
                  <tbody>
                    {report.possibleLeaks.map((l, i) => (
                      <tr key={i}>
                        <td style={cellStyle}>{l.term}</td>
                        <td style={cellStyle}>{l.source}</td>
                        <td style={cellStyle}>
                          <button className="btn btn-xs" onClick={() => setPreviewPath(l.path)}>{l.path}</button>
                        </td>
                        <td style={cellStyle}>{l.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 260px" }}>
                <div className="field-label">Matched terms</div>
                <table style={tableStyle}>
                  <tbody>
                    {report.terms.length === 0 && <tr><td style={cellStyle}>None</td></tr>}
                    {report.terms.map((t) => (
                      <tr key={t.term}><td style={cellStyle}>{t.term}</td><td style={cellStyle}>{t.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <div className="field-label">Unmatched terms</div>
                <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {report.unmatchedTerms.length === 0 ? "None" : report.unmatchedTerms.join(", ")}
                </div>
                <div className="field-label" style={{ marginTop: 8 }}>Patterns</div>
                <table style={tableStyle}>
                  <tbody>
                    {PATTERN_LABELS.map((p) => (
                      <tr key={p}><td style={cellStyle}>{p}</td><td style={cellStyle}>{report.patterns[p] ?? 0}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="field-label" style={{ marginTop: 12 }}>Files</div>
            <table style={tableStyle}>
              <thead><tr><th style={cellStyle}>Path</th><th style={cellStyle}>Bytes</th><th style={cellStyle}>Redactions</th><th style={cellStyle} /></tr></thead>
              <tbody>
                {report.files.map((f) => (
                  <tr key={f.path} style={leaksByPath.has(f.path) ? { background: SemanticColor.DANGER } : undefined}>
                    <td style={cellStyle}>{f.path}</td>
                    <td style={cellStyle}>{f.bytes.toLocaleString()}</td>
                    <td style={cellStyle}>{f.redactions}</td>
                    <td style={cellStyle}>
                      <button
                        data-agent="btn-hf-preview-file"
                        className="btn btn-xs"
                        onClick={() => setPreviewPath(previewPath === f.path ? null : f.path)}
                      >
                        {previewPath === f.path ? "Hide" : "Preview"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {previewFile && (
              <div style={{ marginTop: 8 }} data-agent="hf-project-export-preview">
                <div className="field-label">{previewFile.path} <span style={{ fontWeight: 400 }}>({previewFile.contentType})</span></div>
                <pre style={{ maxHeight: 360, overflow: "auto", border: "2px solid black", padding: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                  {highlight(previewFile.content, (leaksByPath.get(previewFile.path) ?? []).map((l) => l.term))}
                </pre>
              </div>
            )}
          </section>
        )}
      </div>

      {confirmPublish && (
        <div className="error-box" data-agent="hf-project-export-confirm" style={{ background: SemanticColor.EVIDENCE, marginTop: 12 }}>
          <p style={{ marginTop: 0 }}>
            Publish {dryRun?.workItemCount ?? "all"} work items to{" "}
            <strong>{repoId.trim() || "the default repo"}</strong> as a <strong>{isPrivate ? "private" : "public"}</strong> Hugging Face dataset?
          </p>
          <div className="form-actions">
            <button className="btn" onClick={() => setConfirmPublish(false)}>Cancel</button>
            <button data-agent="btn-hf-confirm-publish" className="btn" disabled={blocked} onClick={() => void publish(false)}>
              Publish
            </button>
          </div>
        </div>
      )}

      <div className="form-actions" style={{ justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
        {busy && <span style={{ fontSize: 12 }}>{status.label}</span>}
        {!dryRunIsCurrent && !busy && (
          <span style={{ fontSize: 12 }}>Run a dry run of the current form before publishing.</span>
        )}
        <button className="btn" onClick={handleClose} disabled={busy}>Close</button>
        <button data-agent="btn-hf-dry-run" className="btn" onClick={() => void runDryRun()} disabled={blocked}>
          Dry run
        </button>
        <button
          data-agent="btn-hf-publish"
          className="btn"
          style={{ borderColor: "#FF5A00" }}
          onClick={() => setConfirmPublish(true)}
          disabled={blocked || !dryRunIsCurrent || confirmPublish}
        >
          Publish to Hugging Face
        </button>
      </div>
    </Modal>
  )
}

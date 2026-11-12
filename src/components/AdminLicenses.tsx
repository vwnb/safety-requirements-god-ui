import { useCallback, useEffect, useState } from "react"
import { SemanticColor } from "../lib/SemanticColor"

type User = {
  id: string
  email: string
  name: string
}

type License = {
  id: string
  userId: string
  expiresAt: string
  llmLimit: number
  llmUsed: number
  active: boolean
  grantedAt: string
  grantedById: string
  user: User
  grantedBy: User
}

type LicenseFormData = {
  userId: string
  expiresAt: string
  llmLimit: number
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="license-form-row">
      <div className="license-label" style={{ width: 100 }}>{label}</div>
      <div className="license-value">
        {children}
      </div>
    </div>
  )
}

type OwnedProject = {
  id: string
  key: string
  createdAt: string
  members: number
  workItems: number
  concepts: number
  baselines: number
}

const inputStyle = { opacity: 1, cursor: "text", background: "white", border: "2px solid black", padding: "6px", fontFamily: "monospace", width: "100%" } as const

async function errorMessage(res: Response, fallback: string) {
  try {
    const body = await res.json()
    return typeof body?.error === "string" ? body.error : fallback
  } catch {
    return fallback
  }
}

// Projects owned by one license holder, with permanent admin-only deletion.
// The server re-checks admin rights, ownership and the typed key.
function LicenseProjects({
  userId,
  apiFetch,
}: {
  userId: string
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
}) {
  const API = import.meta.env.VITE_API_URL || ""
  const base = `${API}/admin/licenses/${encodeURIComponent(userId)}/projects`
  const [projects, setProjects] = useState<OwnedProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<OwnedProject | null>(null)
  const [typedKey, setTypedKey] = useState("")
  const [deleting, setDeleting] = useState(false)

  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetch(base)
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorMessage(res, "Failed to load projects"))
        return (await res.json()) as OwnedProject[]
      })
      .then((list) => {
        if (cancelled) return
        setProjects(list)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load projects")
      })
    return () => {
      cancelled = true
    }
  }, [apiFetch, base, reload])

  const startDelete = (project: OwnedProject) => {
    setConfirming(project)
    setTypedKey("")
    setNotice(null)
    setError(null)
  }

  const deleteProject = async () => {
    if (!confirming || typedKey !== confirming.key) return
    setDeleting(true)
    setError(null)
    try {
      const res = await apiFetch(`${base}/${encodeURIComponent(confirming.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmKey: typedKey }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete project"))
      const result = await res.json()
      const c = result.counts ?? {}
      setNotice(
        `Deleted ${confirming.key}: ${c.workItems ?? 0} work items, ${c.concepts ?? 0} concepts, ${c.revisions ?? 0} revisions, ${c.baselines ?? 0} baselines.`
      )
      setConfirming(null)
      setTypedKey("")
      setReload((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="license-form-row" style={{ alignItems: "flex-start" }}>
      <div className="license-label" style={{ width: 100 }}>Projects</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {error && <div className="error-box"><p className="error-text">{error}</p></div>}
        {notice && <p style={{ fontSize: 12, margin: "0 0 8px" }}>{notice}</p>}
        {projects === null && !error && <p style={{ fontSize: 12, margin: 0 }}>Loading projects...</p>}
        {projects?.length === 0 && <p style={{ fontSize: 12, margin: 0 }}>Owns no projects.</p>}
        {projects?.map((project) => (
          <div key={project.id} style={{ borderTop: "1px solid rgba(0,0,0,0.2)", padding: "6px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, wordBreak: "break-word" }}>
                <span className="text-bold" style={{ fontFamily: "monospace" }}>{project.key}</span>
                <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>
                  {project.workItems} work items · {project.concepts} concepts · {project.baselines} baselines · {project.members} members
                </span>
              </div>
              {confirming?.id !== project.id && (
                <button
                  onClick={() => startDelete(project)}
                  disabled={deleting}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              )}
            </div>
            {confirming?.id === project.id && (
              <div className="card" style={{ marginTop: 8, background: SemanticColor.DANGER }}>
                <p style={{ margin: "0 0 8px", fontSize: 13 }}>
                  This permanently deletes <b>{project.key}</b> and all its work items, concepts,
                  revisions, signatures, relations, evaluations and baselines, and removes its{" "}
                  {project.members} {project.members === 1 ? "member" : "members"}. Relations and baseline entries in other projects that
                  point at this project's revisions are also removed. This cannot be undone.
                </p>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  Type <b style={{ fontFamily: "monospace" }}>{project.key}</b> to confirm
                </label>
                <input
                  value={typedKey}
                  onChange={(e) => setTypedKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={deleteProject}
                    disabled={deleting || typedKey !== project.key}
                    className="btn btn-danger btn-sm"
                    style={{ opacity: deleting || typedKey !== project.key ? 0.6 : 1, cursor: deleting || typedKey !== project.key ? "not-allowed" : "pointer" }}
                  >
                    {deleting ? "Deleting..." : "Delete permanently"}
                  </button>
                  <button onClick={() => setConfirming(null)} disabled={deleting} className="btn btn-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminLicenses({
  apiFetch,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  onClose: () => void
}) {
  const API = import.meta.env.VITE_API_URL || ""
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<LicenseFormData>({
    userId: "",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    llmLimit: 100,
  })
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set())

  const toggleProjects = (userId: string) =>
    setOpenProjects((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const loadLicenses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch(`${API}/admin/licenses`)

      if (!res.ok) {
        throw new Error("Failed to load licenses")
      }

      setLicenses(await res.json())
    } catch {
      setError("Failed to load licenses. Ensure you have admin privileges.")
    } finally {
      setLoading(false)
    }
  }, [API, apiFetch])

  useEffect(() => {
    loadLicenses()
  }, [loadLicenses])

  const grantLicense = async () => {
    if (!formData.userId.trim() || !formData.expiresAt) return

    setSubmitting(true)

    try {
      const res = await apiFetch(`${API}/admin/licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId.trim(),
          expiresAt: new Date(formData.expiresAt).toISOString(),
          llmLimit: formData.llmLimit,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to grant license")
      }

      setShowForm(false)
      setFormData({
        userId: "",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        llmLimit: 100,
      })

      await loadLicenses()
    } catch {
      setError("Failed to grant license. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const revokeLicense = async (userId: string) => {
    setSubmitting(true)

    try {
      const res = await apiFetch(`${API}/admin/licenses/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to revoke license")
      }

      await loadLicenses()
    } catch {
      setError("Failed to revoke license. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <div className="title admin-modal-title">License Management</div>
          <button onClick={onClose} className="btn">Close</button>
        </div>

        {error && (
          <div className="error-box">
            <p className="error-text">{error}</p>
          </div>
        )}

        <div className="mb-16">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn"
            style={{ background: showForm ? SemanticColor.DANGER : SemanticColor.SUCCESS }}
          >
            {showForm ? "Cancel" : "Grant License"}
          </button>
        </div>

        {showForm && (
          <div className="card">
            <div className="grant-form-title">Grant / Replace License</div>

            <div className="license-form-row">
              <div className="license-label">User ID</div>
              <input
                value={formData.userId}
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
                placeholder="auth0|..."
                className="license-value"
                style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
              />
            </div>

            <div className="license-form-row">
              <div className="license-label">Expires At</div>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                className="license-value"
                style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
              />
            </div>

            <div className="license-form-row">
              <div className="license-label">LLM Call Limit</div>
              <input
                type="number"
                min={1}
                value={formData.llmLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    llmLimit: parseInt(e.target.value) || 0,
                  })
                }
                className="license-value"
                style={{ opacity: 1, cursor: 'text', background: 'white', border: '2px solid black', padding: '6px', fontFamily: 'monospace', width: '100%' }}
              />
            </div>

            <button
              onClick={grantLicense}
              disabled={submitting || !formData.userId.trim() || !formData.expiresAt}
              className="btn"
              style={{ opacity: (submitting || !formData.userId.trim() || !formData.expiresAt) ? 0.6 : 1, cursor: (submitting || !formData.userId.trim() || !formData.expiresAt) ? 'not-allowed' : 'pointer', background: SemanticColor.SUCCESS }}
            >
              {submitting ? "Granting..." : "Grant License"}
            </button>
          </div>
        )}

        {loading && <p>Loading licenses...</p>}

        {!loading && licenses.length === 0 && (
          <p>No licenses found.</p>
        )}

        {!loading && licenses.length > 0 && (
          <div>
            {licenses.map((license) => {
              const isExpired = new Date(license.expiresAt) < new Date()
              const grantedAt = new Date(license.grantedAt)
              const usagePercent = Math.round((license.llmUsed / license.llmLimit) * 100)

              return (
                <div
                  key={license.id}
                  className="card mb-12"
                >
                  {/* Header row: status badge + license ID */}
                  <div className="license-card-header">
                    <div
                      className="tag"
                      style={{ background: isExpired ? SemanticColor.DANGER : SemanticColor.SUCCESS }}
                    >
                      {isExpired ? "Expired" : "Active"}
                    </div>
                    <span className="license-card-id">
                      ID: {license.id}
                    </span>
                  </div>

                  {/* User info - prominent */}
                  <div className="license-user-card">
                    <div className="license-user-details">
                      <div className="license-user-name-email">
                        <span className="text-bold">{license.user.name}</span>
                        <span className="license-granted-by" style={{ marginLeft: 8 }}>
                          {license.user.email}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => toggleProjects(license.userId)}
                        className="btn btn-sm"
                      >
                        {openProjects.has(license.userId) ? "Hide projects" : "Projects"}
                      </button>
                      <button
                        onClick={() => revokeLicense(license.userId)}
                        disabled={submitting}
                        className="btn btn-danger btn-sm"
                        style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                      >
                        Revoke
                      </button>
                      </div>
                    </div>
                  </div>

                  {/* Detail rows */}
                  <DetailRow label="User ID">{license.userId}</DetailRow>
                  <DetailRow label="Expires">
                    {new Date(license.expiresAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {!isExpired && (
                      <span className="license-nowrap-hint" style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                        (in {Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)
                      </span>
                    )}
                  </DetailRow>
                  <DetailRow label="Granted">
                    {grantedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </DetailRow>
                  <DetailRow label="Granted By">
                    {license.grantedBy.name}{" "}
                    <span className="license-granted-by">({license.grantedBy.email})</span>
                  </DetailRow>

                  {openProjects.has(license.userId) && (
                    <LicenseProjects userId={license.userId} apiFetch={apiFetch} />
                  )}

                  {/* LLM usage with progress bar */}
                  <div className="license-form-row">
                    <div className="license-label" style={{ width: 100 }}>LLM Calls</div>
                    <div className="license-value" style={{ opacity: 1, cursor: "default", border: "none", background: "transparent", padding: 0, wordBreak: "break-word" }}>
                      <div className="usage-bar-header">
                        <span>{license.llmUsed} / {license.llmLimit} used</span>
                        <span style={{ opacity: 0.7 }}>{usagePercent}%</span>
                      </div>
                      <div className="license-bar-track">
                        <div
                          className="license-bar-fill"
                          style={{
                            width: `${Math.min(usagePercent, 100)}%`,
                            background:
                              usagePercent >= 90
                                ? SemanticColor.DANGER
                                : usagePercent >= 75
                                ? SemanticColor.ARGUMENT
                                : SemanticColor.SUCCESS,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
import { useCallback, useEffect, useState } from "react"
import { brutal } from "../App"
import { SemanticColor } from "../lib/SemanticColor"

type License = {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  expiresAt: string
  llmLimit: number
  llmCallsUsed: number
  active: boolean
}

type LicenseFormData = {
  userId: string
  expiresAt: string
  llmLimit: number
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "rgb(233, 237, 233)",
          border: "2px solid black",
          borderLeftWidth: 6,
          borderRadius: 8,
          fontFamily: "monospace",
          padding: "2rem",
          maxWidth: 700,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div className="title" style={{ margin: 0 }}>
            License Management
          </div>
          <button onClick={onClose} style={brutal.button}>
            Close
          </button>
        </div>

        {error && (
          <div style={{ ...brutal.box, borderColor: SemanticColor.DANGER }}>
            <p style={{ color: SemanticColor.DANGER }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              ...brutal.button,
              background: showForm ? SemanticColor.DANGER : SemanticColor.SUCCESS,
            }}
          >
            {showForm ? "Cancel" : "Grant License"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...brutal.box, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              Grant / Replace License
            </div>

            <div style={brutal.formRow}>
              <div style={brutal.label}>User ID</div>
              <input
                value={formData.userId}
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
                placeholder="auth0|..."
                style={brutal.input}
              />
            </div>

            <div style={brutal.formRow}>
              <div style={brutal.label}>Expires At</div>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                style={brutal.input}
              />
            </div>

            <div style={brutal.formRow}>
              <div style={brutal.label}>LLM Call Limit</div>
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
                style={brutal.input}
              />
            </div>

            <button
              onClick={grantLicense}
              disabled={submitting || !formData.userId.trim() || !formData.expiresAt}
              style={{
                ...brutal.button,
                background: SemanticColor.SUCCESS,
                ...(submitting || !formData.userId.trim() || !formData.expiresAt
                  ? brutal.disabled
                  : {}),
              }}
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

              return (
                <div
                  key={license.id}
                  style={{
                    ...brutal.box,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          ...brutal.tag,
                          background: isExpired
                            ? SemanticColor.DANGER
                            : SemanticColor.SUCCESS,
                        }}
                      >
                        {isExpired ? "Expired" : "Active"}
                      </div>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>
                        {license.id.slice(0, 12)}...
                      </span>
                    </div>

                    <div style={brutal.formRow}>
                      <div style={brutal.label}>User</div>
                      <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                        {license.userName
                          ? `${license.userName} (${license.userId})`
                          : license.userId}
                      </div>
                    </div>

                    <div style={brutal.formRow}>
                      <div style={{ ...brutal.label, width: 120 }}>Expires</div>
                      <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                        {new Date(license.expiresAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={brutal.formRow}>
                      <div style={{ ...brutal.label, width: 120 }}>LLM Calls</div>
                      <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                        {license.llmCallsUsed} / {license.llmLimit} used
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => revokeLicense(license.userId)}
                    disabled={submitting}
                    style={{
                      ...brutal.button,
                      background: SemanticColor.DANGER,
                      whiteSpace: "nowrap",
                      ...(submitting ? brutal.disabled : {}),
                    }}
                  >
                    Revoke
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
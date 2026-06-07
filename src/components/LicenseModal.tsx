import { useEffect, useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"
import { SemanticColor } from "../lib/SemanticColor"

type User = {
  id: string
  email: string
  name: string
}

type LicenseInfo = {
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

type RemainingCalls = {
  remaining: number
}

export function LicenseModal({
  apiFetch,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
  onClose: () => void
}) {
  const API = import.meta.env.VITE_API_URL || ""
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [remaining, setRemaining] = useState<RemainingCalls | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [licenseRes, remainingRes] = await Promise.all([
          apiFetch(`${API}/me/license`),
          apiFetch(`${API}/me/license/remaining`),
        ])

        if (licenseRes.ok) {
          setLicense(await licenseRes.json())
        } else if (licenseRes.status === 403) {
          setLicense(null)
        } else {
          setError("Failed to load license information")
        }

        if (remainingRes.ok) {
          setRemaining(await remainingRes.json())
        } else if (remainingRes.status === 403) {
          setRemaining(null)
        } else {
          setError("Failed to load remaining calls")
        }
      } catch {
        setError("Network error loading license information")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [API, apiFetch])

  const isExpired = license
    ? new Date(license.expiresAt) < new Date()
    : false

  const daysUntilExpiry = license
    ? Math.ceil(
        (new Date(license.expiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0

  const usagePercent = license
    ? Math.round((license.llmUsed / license.llmLimit) * 100)
    : 0

  return (
    <Modal title="License Details" onClose={onClose}>
      {loading && <p>Loading license information...</p>}

      {error && (
        <div style={{ ...brutal.box, border: "2px solid black" }}>
          <p style={{ color: "black" }}>{error}</p>
        </div>
      )}

      {!loading && !error && !license && (
        <div>
          <div
            style={{
              ...brutal.tag,
              background: SemanticColor.DANGER,
              marginBottom: 12,
            }}
          >
            No Active License
          </div>
          <p>
            You do not have an active license. Please contact your administrator
            to obtain one.
          </p>
        </div>
      )}

      {!loading && !error && license && (
        <div>
          {/* Header: status + license ID */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                ...brutal.tag,
                background: isExpired ? SemanticColor.DANGER : SemanticColor.SUCCESS,
              }}
            >
              {isExpired ? "Expired" : "Active"}
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.6 }}>
              ID: {license.id}
            </span>
          </div>

          {/* User info card */}
          <div
            style={{
              marginBottom: 14,
              padding: "8px 12px",
              background: "rgba(0,0,0,0.04)",
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{license.user.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              {license.user.email}
            </div>
          </div>

          {/* Detail rows */}
          <div className="license-form-row" style={brutal.formRow}>
            <div style={brutal.label}>User ID</div>
            <div style={{ ...brutal.input, ...brutal.disabled, flex: 1, wordBreak: "break-all" }}>
              {license.userId}
            </div>
          </div>

          <div className="license-form-row" style={brutal.formRow}>
            <div style={brutal.label}>Expires</div>
            <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
              {new Date(license.expiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {!isExpired && (
                <span
                  style={{
                    marginLeft: 8,
                    whiteSpace: "nowrap",
                    color:
                      daysUntilExpiry <= 7
                        ? SemanticColor.DANGER
                        : "black",
                  }}
                >
                  ({daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} remaining)
                </span>
              )}
            </div>
          </div>

          {license.grantedAt && (
            <div className="license-form-row" style={brutal.formRow}>
              <div style={brutal.label}>Granted</div>
              <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                {new Date(license.grantedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          )}

          {license.grantedBy && (
            <div className="license-form-row" style={brutal.formRow}>
              <div style={brutal.label}>Granted By</div>
              <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                {license.grantedBy.name}{" "}
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  ({license.grantedBy.email})
                </span>
              </div>
            </div>
          )}

          <div className="license-form-row" style={brutal.formRow}>
            <div style={brutal.label}>LLM Calls</div>
            <div style={{ ...brutal.input, ...brutal.disabled, flex: 1, whiteSpace: "normal" }}>
              <span>{license.llmUsed} / {license.llmLimit} used</span>
              {remaining && remaining.remaining > 0 && (
                <span style={{ marginLeft: 8, whiteSpace: "nowrap", color: "black" }}>
                  ({remaining.remaining} remaining)
                </span>
              )}
              {remaining && remaining.remaining <= 0 && (
                <span style={{ marginLeft: 8, whiteSpace: "nowrap", color: SemanticColor.DANGER }}>
                  (limit reached)
                </span>
              )}
            </div>
          </div>

          {/* Usage bar */}
          {remaining && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "monospace",
                  fontSize: 11,
                  marginBottom: 4,
                }}
              >
                <span>Usage</span>
                <span>{usagePercent}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 12,
                  border: "2px solid black",
                  background: "white",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(usagePercent, 100)}%`,
                    background:
                      usagePercent >= 90
                        ? SemanticColor.DANGER
                        : usagePercent >= 75
                        ? SemanticColor.ARGUMENT
                        : SemanticColor.SUCCESS,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
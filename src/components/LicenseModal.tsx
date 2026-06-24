import { useEffect, useState } from "react"
import Modal from "./Modal"
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
        <div className="error-box">
          <p className="error-text">{error}</p>
        </div>
      )}

      {!loading && !error && !license && (
        <div>
          <div
            className="tag license-no-active"
            style={{ background: SemanticColor.DANGER }}
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
          <div className="license-status-row">
            <div
              className="tag"
              style={{ background: isExpired ? SemanticColor.DANGER : SemanticColor.SUCCESS }}
            >
              {isExpired ? "Expired" : "Active"}
            </div>
            <span className="license-id">
              ID: {license.id}
            </span>
          </div>

          {/* User info card */}
          {license.user && (
            <div className="license-user-card">
              <div className="license-user-name">{license.user.name}</div>
              <div className="license-user-email">
                {license.user.email}
              </div>
            </div>
          )}

          {/* Detail rows */}
          <div className="license-form-row">
            <div className="license-label">User ID</div>
            <div className="license-value" style={{ wordBreak: "break-all" }}>
              {license.userId}
            </div>
          </div>

          <div className="license-form-row">
            <div className="license-label">Expires</div>
            <div className="license-value">
              {new Date(license.expiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
               {!isExpired && (
                 <span
                   className="license-nowrap-hint"
                   style={{ marginLeft: 8, color: daysUntilExpiry <= 7 ? SemanticColor.DANGER : "black" }}
                 >
                   ({daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} remaining)
                 </span>
               )}
            </div>
          </div>

          {license.grantedAt && (
            <div className="license-form-row">
              <div className="license-label">Granted</div>
              <div className="license-value">
                {new Date(license.grantedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          )}

          {license.grantedBy && (
            <div className="license-form-row">
              <div className="license-label">Granted By</div>
              <div className="license-value">
                {license.grantedBy.name}{" "}
                <span className="text-sm" style={{ opacity: 0.7 }}>
                  ({license.grantedBy.email})
                </span>
              </div>
            </div>
          )}

          <div className="license-form-row">
            <div className="license-label">LLM Calls</div>
            <div className="license-value" style={{ whiteSpace: "normal" }}>
              <span>{license.llmUsed} / {license.llmLimit} used</span>
              {remaining && remaining.remaining > 0 && (
                <span className="license-nowrap-hint" style={{ marginLeft: 8 }}>
                  ({remaining.remaining} remaining)
                </span>
              )}
              {remaining && remaining.remaining <= 0 && (
                <span className="license-nowrap-hint" style={{ marginLeft: 8, color: SemanticColor.DANGER }}>
                  (limit reached)
                </span>
              )}
            </div>
          </div>

          {/* Usage bar */}
          {remaining && (
            <div className="usage-bar-container">
              <div className="usage-bar-header">
                <span>Usage</span>
                <span>{usagePercent}%</span>
              </div>
              <div className="usage-bar-track">
                <div
                  className="usage-bar-fill"
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
          )}
        </div>
      )}
    </Modal>
  )
}
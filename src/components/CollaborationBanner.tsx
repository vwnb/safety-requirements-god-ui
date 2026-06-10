import { SemanticColor } from "../lib/SemanticColor"
import type { UserPresence } from "../types/collaboration"

function statusLabel(status: UserPresence["status"]): string {
  switch (status) {
    case "browsing_graph":
      return "🔍 Browsing graph"
    case "editing_revision":
      return "✏️ Editing revision"
    case "editing_concept":
      return "📝 Editing concept"
    case "editing_work_item":
      return "📋 Editing work item"
    default:
      return "👤 Idle"
  }
}

export function CollaborationBanner({
  connected,
  presences,
  roomId,
  currentUserId,
}: {
  connected: boolean
  presences: UserPresence[]
  roomId: string | null
  currentUserId: string
}) {
  const otherUsers = presences.length

  return (
    <div
      data-agent="collaboration-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 12px",
        borderTop: "2px solid black",
        background: connected ? SemanticColor.SUCCESS : "#f0f0f0",
        fontFamily: "monospace",
        fontSize: 12,
        flexWrap: "wrap",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      {/* Connection indicator */}
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: connected ? "#22c55e" : "#ef4444",
          flexShrink: 0,
        }}
      />

      <span>
        {connected ? "Collaboration: Connected" : "Collaboration: Disconnected"}
        {roomId && ` (${roomId})`}
      </span>

      {/* Presence count */}
      {connected && (
        <span style={{ opacity: 0.7 }}>
          {otherUsers === 0
            ? "— No one else here"
            : `— ${otherUsers} other${otherUsers !== 1 ? "s" : ""}`}
        </span>
      )}

      {/* Active user list */}
      {connected && presences.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {presences.map((p) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                border: "1px solid rgba(0,0,0,0.3)",
                background: "rgba(255,255,255,0.6)",
                borderRadius: 3,
              }}
              title={`${p.userName || p.userId}${p.userEmail ? ` (${p.userEmail})` : ""}`}
            >
              <span style={{ fontWeight: 600 }}>
                {p.userId === currentUserId ? "You" : p.userName || p.userId}
              </span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>
                {statusLabel(p.status)}
              </span>
              {p.contextId || p.contextName ? (
                <span style={{ fontSize: 10, opacity: 0.5 }}>
                  {p.contextName || p.contextId}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
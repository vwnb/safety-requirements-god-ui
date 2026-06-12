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
  // Deduplicate by userId (keep the last entry for each user - most recent status)
  const safePresences = presences
    .filter((p) => Boolean(p?.userId))
    .filter((p, index, arr) => arr.findLastIndex((x) => x.userId === p.userId) === index)

  const otherUsers = safePresences.filter(
    (p) => p.userId !== currentUserId,
  ).length

  const sortedPresences = [...safePresences].sort((a, b) => {
    if (a.userId === currentUserId) return -1
    if (b.userId === currentUserId) return 1
    return 0
  })

  console.log("[Banner]", {
  connected,
  roomId,
  currentUserId,
  presences,
})

  return (
    <div
      data-agent="collaboration-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "1em",
        background: "black",
        color: "white",
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

      {connected && (
        <span style={{ opacity: 0.7 }}>
          {otherUsers === 0
            ? "— No one else here"
            : `— ${otherUsers} other${otherUsers !== 1 ? "s" : ""}`}
        </span>
      )}

      {connected && sortedPresences.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {sortedPresences.map((p) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                border: "1px solid rgba(255,255,255,0.3)",
                background:
                  p.userId === currentUserId
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(255,255,255,0.1)",
                borderRadius: 3,
              }}
              title={`${p.userName || p.userId}${
                p.userEmail ? ` (${p.userEmail})` : ""
              }`}
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
import { useSyncExternalStore } from "react"

function getOnlineStatus() {
  return navigator.onLine
}

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribeToOnlineStatus, getOnlineStatus, () => true)

  if (isOnline) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "#FF5A00",
        color: "white",
        fontFamily: "monospace",
        padding: "10px 20px",
        textAlign: "center",
        borderTop: "2px solid black",
        fontWeight: "bold",
      }}
    >
      You are offline — showing cached data
    </div>
  )
}
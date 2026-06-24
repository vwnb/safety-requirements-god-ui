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
    <div className="offline-banner">
      You are offline. Changes won't be saved.
    </div>
  )
}
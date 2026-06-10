import { useCallback, useEffect, useRef, useState } from "react"
import type { UserPresence, UserStatus } from "../types/collaboration"

const WS_BASE = (import.meta.env.VITE_API_URL || "").replace(/^http/, "ws")

export type CollaborationState = {
  connected: boolean
  presences: UserPresence[]
  error: string | null
  roomId: string | null
}

export function useCollaboration() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [state, setState] = useState<CollaborationState>({
    connected: false,
    presences: [],
    error: null,
    roomId: null,
  })

  // Track current activity so we can emit status changes
  const activityRef = useRef<{ status: UserStatus; contextId?: string } | null>(null)

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const connect = useCallback((roomId: string, userId: string, userName?: string, userEmail?: string) => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const wsUrl = `${WS_BASE}/ws`
    console.log(`[Collaboration] Connecting to ${wsUrl} for room ${roomId}`)

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("[Collaboration] WebSocket connected")
        setState((prev) => ({ ...prev, connected: true, error: null, roomId }))

        // Join the room
        sendMessage({ type: "join", roomId, userId, userName, userEmail })

        // Re-send current activity if any
        const act = activityRef.current
        if (act && act.status) {
          sendMessage({
            type: "status",
            status: act.status,
            ...(act.contextId ? { contextId: act.contextId } : {}),
          } as object)
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>
          console.log("[Collaboration] Received message:", data.type)

          if (data.type === "presence" && Array.isArray(data.presences)) {
            setState((prev) => ({
              ...prev,
              presences: data.presences as UserPresence[],
            }))
          }
        } catch (err) {
          console.error("[Collaboration] Failed to parse message:", err)
        }
      }

      ws.onerror = (event) => {
        console.error("[Collaboration] WebSocket error:", event)
        setState((prev) => ({
          ...prev,
          error: "WebSocket connection error",
        }))
      }

      ws.onclose = (event) => {
        console.log("[Collaboration] WebSocket closed:", event.code, event.reason)
        setState((prev) => ({
          ...prev,
          connected: false,
          presences: [],
          error: event.code !== 1000 ? `Disconnected (code: ${event.code})` : null,
        }))

        // Auto-reconnect after 3 seconds if not intentionally closed
        if (event.code !== 1000) {
          reconnectTimerRef.current = setTimeout(() => {
            connect(roomId, userId, userName, userEmail)
          }, 3000)
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error("[Collaboration] Failed to create WebSocket:", err)
      setState((prev) => ({
        ...prev,
        error: "Failed to create WebSocket connection",
      }))
    }
  }, [sendMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected")
      wsRef.current = null
    }
    activityRef.current = null
    setState({
      connected: false,
      presences: [],
      error: null,
      roomId: null,
    })
  }, [])

  const updateStatus = useCallback((status: UserStatus, contextId?: string) => {
    activityRef.current = { status, contextId }
    if (status) {
      sendMessage({
        type: "status",
        status,
        ...(contextId ? { contextId } : {}),
      } as object)
    }
  }, [sendMessage])

  const notifyEventEnded = useCallback(() => {
    activityRef.current = null
    sendMessage({ type: "event_ended" } as object)
  }, [sendMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted")
        wsRef.current = null
      }
    }
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    updateStatus,
    notifyEventEnded,
  }
}
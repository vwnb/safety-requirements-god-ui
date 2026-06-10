import { useCallback, useEffect, useRef, useState } from "react"
import PartySocket from "partysocket"
import type { UserPresence, UserStatus } from "../types/collaboration"

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST

export type CollaborationState = {
  connected: boolean
  presences: UserPresence[]
  error: string | null
  roomId: string | null
}

export function useCollaboration() {
  const socketRef = useRef<PartySocket | null>(null)

  const [state, setState] = useState<CollaborationState>({
    connected: false,
    presences: [],
    error: null,
    roomId: null,
  })

  const activityRef = useRef<{
    status: UserStatus
    contextId?: string
    contextName?: string
  } | null>(null)

  const sendMessage = useCallback((msg: object) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  const connect = useCallback(
    (roomId: string, userId: string, userName?: string, userEmail?: string) => {
      socketRef.current?.close()

      const socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
        query: {
          userId,
          ...(userName ? { userName } : {}),
          ...(userEmail ? { userEmail } : {}),
        },
      })

      socket.onopen = () => {
        setState((prev) => ({ ...prev, connected: true, error: null, roomId }))

        const act = activityRef.current
        if (act) {
          sendMessage({
            type: "status",
            status: act.status,
            ...(act.contextId ? { contextId: act.contextId } : {}),
            ...(act.contextName ? { contextName: act.contextName } : {}),
          })
        }
      }

      socket.onmessage = (event) => {
        console.log("[Collaboration] raw message", event.data)

        const data = JSON.parse(event.data)
        console.log("[Collaboration] parsed message", data)

        if (data.type === "presence" && Array.isArray(data.presences)) {
          setState((prev) => ({
            ...prev,
            presences: data.presences,
          }))
        }
      }

      socket.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "PartyKit connection error",
        }))
      }

      socket.onclose = () => {
        setState((prev) => ({
          ...prev,
          connected: false,
          presences: [],
        }))
      }

      socketRef.current = socket
    },
    [sendMessage],
  )

  const disconnect = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    activityRef.current = null

    setState({
      connected: false,
      presences: [],
      error: null,
      roomId: null,
    })
  }, [])

  const updateStatus = useCallback(
    (status: UserStatus, contextId?: string, contextName?: string) => {
      activityRef.current = { status, contextId, contextName }

      sendMessage({
        type: "status",
        status,
        ...(contextId ? { contextId } : {}),
        ...(contextName ? { contextName } : {}),
      })
    },
    [sendMessage],
  )

  const notifyEventEnded = useCallback(() => {
    activityRef.current = null
    sendMessage({ type: "event_ended" })
  }, [sendMessage])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
      socketRef.current = null
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
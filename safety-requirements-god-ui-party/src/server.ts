import type * as Party from "partykit/server"
import type { UserPresence } from "./types/collaboration"

export default class Server implements Party.Server {
  presences = new Map<string, UserPresence>()

  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url)

    const userId = url.searchParams.get("userId")
    const userName = url.searchParams.get("userName") ?? undefined
    const userEmail = url.searchParams.get("userEmail") ?? undefined

    if (!userId) {
      conn.close(1008, "Missing userId")
      return
    }

    this.presences.set(conn.id, {
      userId,
      userName,
      userEmail,
      status: null,
      contextId: null,
      contextName: null,
      joinedAt: new Date().toISOString(),
    })

    this.broadcastPresence()
  }

  onMessage(message: string, conn: Party.Connection) {
    const data = JSON.parse(message)
    const presence = this.presences.get(conn.id)

    if (!presence) return

    if (data.type === "status") {
      this.presences.set(conn.id, {
        ...presence,
        status: data.status,
        contextId: data.contextId,
        contextName: data.contextName,
      })

      this.broadcastPresence()
    }

    if (data.type === "viewport") {
      this.presences.set(conn.id, {
        ...presence,
        viewportX: data.viewportX,
        viewportY: data.viewportY,
      })

      this.broadcastPresence()
    }

    if (data.type === "event_ended") {
      this.presences.set(conn.id, {
        ...presence,
        status: null,
        contextId: null,
        contextName: null,
      })

      this.broadcastPresence()
    }
  }

  onClose(conn: Party.Connection) {
    this.presences.delete(conn.id)
    this.broadcastPresence()
  }

  broadcastPresence() {
    const presences = [...this.presences.values()]

    this.party.broadcast(
      JSON.stringify({
        type: "presence",
        presences,
      }),
    )
  }
}
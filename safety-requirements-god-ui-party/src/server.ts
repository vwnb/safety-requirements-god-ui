import { routePartykitRequest, Server } from "partyserver"
import type { Connection, ConnectionContext } from "partyserver"
import type { UserPresence } from "./types/collaboration"

export class CollaborationServer extends Server {
  presences = new Map<string, UserPresence>()

  onConnect(connection: Connection, context: ConnectionContext) {
    const url = new URL(context.request.url)

    const userId = url.searchParams.get("userId")
    const userName = url.searchParams.get("userName") ?? undefined
    const userEmail = url.searchParams.get("userEmail") ?? undefined

    if (!userId) {
      connection.close(1008, "Missing userId")
      return
    }

    this.presences.set(connection.id, {
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

  onMessage(connection: Connection, message: string) {
    const data = JSON.parse(message)
    const presence = this.presences.get(connection.id)

    if (!presence) return

    if (data.type === "status") {
      this.presences.set(connection.id, {
        ...presence,
        status: data.status,
        contextId: data.contextId,
        contextName: data.contextName,
      })

      this.broadcastPresence()
    }

    if (data.type === "viewport") {
      this.presences.set(connection.id, {
        ...presence,
        viewportX: data.viewportX,
        viewportY: data.viewportY,
      })

      this.broadcastPresence()
    }

    if (data.type === "event_ended") {
      this.presences.set(connection.id, {
        ...presence,
        status: null,
        contextId: null,
        contextName: null,
      })

      this.broadcastPresence()
    }
  }

  onClose(connection: Connection) {
    this.presences.delete(connection.id)
    this.broadcastPresence()
  }

  broadcastPresence() {
    const presences = [...this.presences.values()]

    this.broadcast(
      JSON.stringify({
        type: "presence",
        presences,
      }),
    )
  }
}

export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not Found", { status: 404 })
    )
  }
}
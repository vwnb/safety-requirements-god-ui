export type UserPresence = {
  userId: string
  userName?: string
  userEmail?: string
  status: "browsing_graph" | "editing_revision" | "editing_concept" | "editing_work_item" | null
  contextId?: string | null
  contextName?: string | null
  joinedAt: string
  viewportX?: number | null
  viewportY?: number | null
}

export type ViewportCoordinates = {
  x: number
  y: number
}

export type CollaborationMessage =
  // Client → Server
  | { type: "join"; roomId: string; userId: string; userName?: string; userEmail?: string }
  | { type: "status"; status: "browsing_graph" | "editing_revision" | "editing_concept" | "editing_work_item"; contextId?: string; contextName?: string }
  | { type: "event_ended" }
  // Server → Client
  | { type: "presence"; presences: UserPresence[] }
  | { type: "event_ended"; userId: string; status: string; contextId?: string; contextName?: string }

export type UserStatus = UserPresence["status"]
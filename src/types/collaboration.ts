export type UserPresence = {
  userId: string
  userName?: string
  userEmail?: string
  status: "browsing_graph" | "editing_revision" | "editing_concept" | null
  contextId?: string | null
  joinedAt: string
}

export type CollaborationMessage =
  // Client → Server
  | { type: "join"; roomId: string; userId: string; userName?: string; userEmail?: string }
  | { type: "status"; status: "browsing_graph" | "editing_revision" | "editing_concept"; contextId?: string }
  | { type: "event_ended" }
  // Server → Client
  | { type: "presence"; presences: UserPresence[] }
  | { type: "event_ended"; userId: string; status: string; contextId?: string }

export type UserStatus = UserPresence["status"]
export type UserPresence = {
  userId: string
  userName?: string
  userEmail?: string
  status: "browsing_graph" | "editing_revision" | "editing_concept" | "editing_work_item" | null
  contextId?: string | null
  contextName?: string | null
  joinedAt: string
}
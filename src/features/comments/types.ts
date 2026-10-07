export type CommentStatus = 'queued' | 'sending' | 'sent' | 'failed'

/** A comment as the UI tracks it, including client-only sending state. */
export type Comment = {
  id: string
  body: string
  createdAt: number
  status: CommentStatus
}

/** The shape persisted to localStorage: just enough to resend on reload. */
export type PersistedComment = {
  id: string
  body: string
  createdAt: number
}

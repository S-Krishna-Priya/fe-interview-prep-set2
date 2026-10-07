import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommentsServer } from './mockServer.ts'
import { mockCommentsServer } from './mockServer.ts'
import { loadPersistedQueue, savePersistedQueue } from './storage.ts'
import type { Comment, CommentStatus } from './types.ts'

function initialComments(): Comment[] {
  return loadPersistedQueue().map((item) => ({ ...item, status: 'queued' as const }))
}

/** Everything that hasn't been confirmed sent needs to survive a refresh. */
function toPersisted(items: Comment[]) {
  return items
    .filter((item) => item.status !== 'sent')
    .map((item) => ({ id: item.id, body: item.body, createdAt: item.createdAt }))
}

export type UseCommentsResult = {
  comments: Comment[]
  isOnline: boolean
  submit: (body: string) => void
  retry: (id: string) => void
}

/**
 * Manages the comment list, the offline/queued send pipeline, and
 * persistence. A new comment is always appended as `queued`, then a drain is
 * kicked off: while online, the drain loop sends queued comments one at a
 * time, in order, marking each `sending` then `sent`/`failed`. A `processing`
 * ref guards the loop so it can never run concurrently with itself, whether
 * it was triggered by a fresh submit, a retry, or the browser going back
 * online.
 */
export function useComments(server: CommentsServer = mockCommentsServer): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const commentsRef = useRef<Comment[]>(comments)
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine)
  const processingRef = useRef(false)

  const setAll = useCallback((next: Comment[]) => {
    commentsRef.current = next
    setComments(next)
    savePersistedQueue(toPersisted(next))
  }, [])

  const updateStatus = useCallback(
    (id: string, status: CommentStatus) => {
      setAll(commentsRef.current.map((item) => (item.id === id ? { ...item, status } : item)))
    },
    [setAll],
  )

  const drain = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    try {
      for (;;) {
        if (!navigator.onLine) break

        const next = commentsRef.current.find((item) => item.status === 'queued')
        if (!next) break

        updateStatus(next.id, 'sending')
        try {
          await server.postComment({ idempotencyKey: next.id, body: next.body })
          updateStatus(next.id, 'sent')
        } catch {
          updateStatus(next.id, 'failed')
          break
        }
      }
    } finally {
      processingRef.current = false
    }
  }, [server, updateStatus])

  // Resume draining whatever survived a refresh, if we're online for it.
  useEffect(() => {
    if (navigator.onLine) {
      void drain()
    }
  }, [drain])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      void drain()
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [drain])

  const submit = useCallback(
    (body: string) => {
      const trimmed = body.trim()
      if (trimmed === '') return

      const comment: Comment = {
        id: crypto.randomUUID(),
        body: trimmed,
        createdAt: Date.now(),
        status: 'queued',
      }
      setAll([...commentsRef.current, comment])
      void drain()
    },
    [setAll, drain],
  )

  const retry = useCallback(
    (id: string) => {
      updateStatus(id, 'queued')
      void drain()
    },
    [updateStatus, drain],
  )

  return { comments, isOnline, submit, retry }
}

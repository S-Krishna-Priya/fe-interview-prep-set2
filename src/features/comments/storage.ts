import type { PersistedComment } from './types.ts'

const STORAGE_KEY = 'q5-comments:pending-queue'

function isPersistedComment(value: unknown): value is PersistedComment {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' && typeof record.body === 'string' && typeof record.createdAt === 'number'
  )
}

/**
 * Reads the queue of not-yet-sent comments back from localStorage. A missing,
 * corrupted, or unexpectedly shaped value is never allowed to crash the app —
 * it just falls back to an empty queue.
 */
export function loadPersistedQueue(): PersistedComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isPersistedComment)
  } catch {
    return []
  }
}

export function savePersistedQueue(items: PersistedComment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage can be unavailable (private browsing quota, disabled storage).
    // The queue simply won't survive a refresh in that case.
  }
}

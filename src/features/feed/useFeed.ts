import { useCallback, useEffect, useReducer, useRef } from 'react'
import { fetchPostsPage } from './api.ts'
import type { Post } from './types.ts'

export const PAGE_SIZE = 10

export type FeedPhase = 'loading' | 'loading-more' | 'idle' | 'error' | 'end'

interface FeedState {
  posts: Post[]
  phase: FeedPhase
  errorMessage: string | null
}

type FeedAction =
  | { type: 'request-start'; skip: number }
  | { type: 'request-success'; posts: Post[]; total: number; skip: number }
  | { type: 'request-error'; message: string }

const initialState: FeedState = {
  posts: [],
  phase: 'loading',
  errorMessage: null,
}

/** Appends `incoming` onto `existing`, dropping any post whose id already appeared. */
function dedupePosts(existing: Post[], incoming: Post[]): Post[] {
  const seenIds = new Set(existing.map((post) => post.id))
  const merged = [...existing]
  for (const post of incoming) {
    if (!seenIds.has(post.id)) {
      seenIds.add(post.id)
      merged.push(post)
    }
  }
  return merged
}

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'request-start':
      return {
        ...state,
        phase: action.skip === 0 ? 'loading' : 'loading-more',
        errorMessage: null,
      }
    case 'request-success': {
      const posts = dedupePosts(state.posts, action.posts)
      const reachedEnd = action.posts.length < PAGE_SIZE || posts.length >= action.total
      return {
        ...state,
        posts,
        phase: reachedEnd ? 'end' : 'idle',
        errorMessage: null,
      }
    }
    case 'request-error':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
      }
    default:
      return state
  }
}

export interface UseFeedResult extends FeedState {
  /** Called by the sentinel's IntersectionObserver when it nears the bottom. */
  loadNextPage: () => void
  /** Called by the Retry button; re-requests the page that just failed. */
  retry: () => void
}

/**
 * Drives the infinite-scroll feed. The hard requirement is that scrolling
 * fast can never fire the same page request twice or render a duplicate
 * post, so every guard below is synchronous (refs, not state):
 *
 * - `inFlightRef` blocks ANY new request while one is outstanding.
 * - `requestedSkipsRef` remembers every skip that has been (successfully)
 *   requested, so it is never re-requested even after `inFlightRef` clears.
 * - `reachedEndRef` stops requests once the feed is known to be exhausted.
 * - `dedupePosts` is a last line of defence: even if the API ever returned
 *   an overlapping page, posts are merged by id.
 */
export function useFeed(): UseFeedResult {
  const [state, dispatch] = useReducer(feedReducer, initialState)

  const nextSkipRef = useRef(0)
  const inFlightRef = useRef(false)
  const requestedSkipsRef = useRef(new Set<number>())
  const reachedEndRef = useRef(false)
  const phaseRef = useRef<FeedPhase>(state.phase)
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    phaseRef.current = state.phase
  }, [state.phase])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const loadPage = useCallback((skip: number) => {
    if (inFlightRef.current) return
    if (requestedSkipsRef.current.has(skip)) return
    if (reachedEndRef.current) return

    requestedSkipsRef.current.add(skip)
    inFlightRef.current = true
    dispatch({ type: 'request-start', skip })

    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchPostsPage(skip, PAGE_SIZE, controller.signal)
      .then((data) => {
        if (!mountedRef.current) return
        nextSkipRef.current = skip + PAGE_SIZE
        if (data.posts.length < PAGE_SIZE || skip + data.posts.length >= data.total) {
          reachedEndRef.current = true
        }
        dispatch({ type: 'request-success', posts: data.posts, total: data.total, skip })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (!mountedRef.current) return
        // Allow a retry of this exact page: it was never fulfilled.
        requestedSkipsRef.current.delete(skip)
        const message = error instanceof Error ? error.message : 'Failed to load posts.'
        dispatch({ type: 'request-error', message })
      })
      .finally(() => {
        inFlightRef.current = false
      })
  }, [])

  // Kick off the first page once, on mount.
  useEffect(() => {
    loadPage(0)
  }, [loadPage])

  const loadNextPage = useCallback(() => {
    // Only the sentinel's auto-trigger is gated by phase: a failed page
    // should not be silently retried just because it is still on screen,
    // and an exhausted feed should not keep asking. Retry below bypasses
    // this on purpose.
    if (phaseRef.current === 'error' || phaseRef.current === 'end') return
    loadPage(nextSkipRef.current)
  }, [loadPage])

  const retry = useCallback(() => {
    loadPage(nextSkipRef.current)
  }, [loadPage])

  return { ...state, loadNextPage, retry }
}

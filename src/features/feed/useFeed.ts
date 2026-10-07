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
  | { type: 'request-success'; posts: Post[]; reachedEnd: boolean }
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
    case 'request-success':
      // `action.posts` is already the merged, deduplicated, "have we
      // reached the end" list computed by loadPage below — there is a
      // single place that does this arithmetic, not one in the reducer and
      // a second, slightly different one next to the fetch call.
      return {
        ...state,
        posts: action.posts,
        phase: action.reachedEnd ? 'end' : 'idle',
        errorMessage: null,
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
 * - `postsRef`/`dedupePosts` merge each page synchronously, by id, so even
 *   an overlapping API page can never render (or count towards "end") twice.
 *
 * StrictMode (src/main.tsx) mounts, cleans up, and re-mounts effects
 * synchronously in development, which aborts the very first fetch before it
 * can resolve. Because `inFlightRef` is only cleared inside a `.finally()`
 * that cannot run until the microtask queue drains — after the remount has
 * already happened — the remount's call to `loadPage(0)` would otherwise see
 * a guard that is stuck "in flight" forever. The unmount cleanup below
 * clears `inFlightRef`/`requestedSkipsRef` synchronously for exactly the
 * request it just aborted, so the remount can re-issue it. `loadPage`'s own
 * `.finally()` only touches those refs when it is still the current request
 * (`abortControllerRef.current === controller`), so the aborted request's
 * very-late `.finally()` can't stomp on the real, still-in-flight remount
 * request.
 */
export function useFeed(): UseFeedResult {
  const [state, dispatch] = useReducer(feedReducer, initialState)

  const nextSkipRef = useRef(0)
  const inFlightRef = useRef(false)
  const inFlightSkipRef = useRef<number | null>(null)
  const requestedSkipsRef = useRef(new Set<number>())
  const reachedEndRef = useRef(false)
  const postsRef = useRef<Post[]>([])
  const phaseRef = useRef<FeedPhase>(state.phase)
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    phaseRef.current = state.phase
  }, [state.phase])

  useEffect(() => {
    mountedRef.current = true
    // `requestedSkipsRef.current` is the one Set instance for this hook's
    // whole lifetime (mutated in place, never reassigned), so capturing it
    // here and using it in the cleanup below still sees its live contents.
    const requestedSkips = requestedSkipsRef.current

    return () => {
      mountedRef.current = false

      const controller = abortControllerRef.current
      if (controller) {
        controller.abort()
        // See the function doc comment: reset synchronously, not in a
        // `.finally()`, so an immediate remount can re-request this page.
        inFlightRef.current = false
        const inFlightSkip = inFlightSkipRef.current
        if (inFlightSkip !== null) {
          requestedSkips.delete(inFlightSkip)
          inFlightSkipRef.current = null
        }
      }
    }
  }, [])

  const loadPage = useCallback((skip: number) => {
    if (inFlightRef.current) return
    if (requestedSkipsRef.current.has(skip)) return
    if (reachedEndRef.current) return

    requestedSkipsRef.current.add(skip)
    inFlightRef.current = true
    inFlightSkipRef.current = skip
    dispatch({ type: 'request-start', skip })

    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchPostsPage(skip, PAGE_SIZE, controller.signal)
      .then((data) => {
        if (!mountedRef.current) return
        nextSkipRef.current = skip + PAGE_SIZE

        const mergedPosts = dedupePosts(postsRef.current, data.posts)
        postsRef.current = mergedPosts
        const reachedEnd = data.posts.length < PAGE_SIZE || mergedPosts.length >= data.total
        if (reachedEnd) {
          reachedEndRef.current = true
        }
        dispatch({ type: 'request-success', posts: mergedPosts, reachedEnd })
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
        // Only clear the guard if this request is still the current one.
        // An aborted request whose unmount cleanup already handed the guard
        // to a newer (remounted) request must not clear it out from under
        // that newer request once this stale `.finally()` eventually runs.
        if (abortControllerRef.current === controller) {
          inFlightRef.current = false
          inFlightSkipRef.current = null
        }
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

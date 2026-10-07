import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useFeed } from './useFeed.ts'

// Keyed by route so other pages don't collide with them.
const SCROLL_Y_KEY = 'feed:scroll-y'
const SCROLL_POST_COUNT_KEY = 'feed:scroll-post-count'

interface SavedScroll {
  scrollY: number
  postCount: number
}

function readSavedScroll(): SavedScroll | null {
  try {
    const scrollYRaw = sessionStorage.getItem(SCROLL_Y_KEY)
    const postCountRaw = sessionStorage.getItem(SCROLL_POST_COUNT_KEY)
    if (scrollYRaw === null || postCountRaw === null) return null

    const scrollY = Number(scrollYRaw)
    const postCount = Number(postCountRaw)
    if (Number.isNaN(scrollY) || Number.isNaN(postCount)) return null

    return { scrollY, postCount }
  } catch {
    return null
  }
}

export default function FeedPage() {
  const { posts, phase, errorMessage, loadNextPage, retry } = useFeed()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const postsLengthRef = useRef(posts.length)
  const hasRestoredScrollRef = useRef(false)
  const [savedScroll] = useState(readSavedScroll)

  // Refs are read in the unmount cleanup below, not during render, so keep
  // this one current via an effect rather than writing to it in the render
  // body.
  useEffect(() => {
    postsLengthRef.current = posts.length
  }, [posts.length])

  // Scroll restoration, kept deliberately simple: we don't hook into the
  // router's navigation events. We persist window.scrollY *and* how many
  // posts were loaded to sessionStorage whenever this page unmounts (i.e.
  // the user navigated to a post, or anywhere else). The list only grows
  // back to that same height once it has reloaded that same amount of
  // content, so restoring scrollY as soon as the first page renders would
  // land on the wrong spot (the short, freshly-mounted document just clamps
  // it to its own max scroll). So below, the feed keeps auto-loading pages
  // past whatever the sentinel alone would trigger, until it has caught
  // back up to the saved post count, and only then restores the scroll
  // position. Storage access is wrapped so a disabled/unavailable
  // sessionStorage (e.g. private browsing) degrades silently instead of
  // crashing the page.
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(SCROLL_Y_KEY, String(window.scrollY))
        sessionStorage.setItem(SCROLL_POST_COUNT_KEY, String(postsLengthRef.current))
      } catch {
        // sessionStorage unavailable; nothing to restore next time either.
      }
    }
  }, [])

  useEffect(() => {
    if (hasRestoredScrollRef.current) return
    if (!savedScroll) {
      hasRestoredScrollRef.current = true
      return
    }
    if (posts.length === 0) return

    const caughtUp = posts.length >= savedScroll.postCount
    const stuck = phase === 'error' || phase === 'end'

    if (!caughtUp) {
      if (phase === 'idle') {
        loadNextPage()
      }
      // Keep waiting unless the feed can never catch up on its own (an
      // error with no auto-retry, or genuinely fewer posts than before) —
      // then fall through and restore with whatever did load.
      if (!stuck) return
    }

    hasRestoredScrollRef.current = true
    try {
      window.scrollTo(0, savedScroll.scrollY)
    } catch {
      // scrollTo unavailable; nothing more we can do.
    }
  }, [posts.length, phase, savedScroll, loadNextPage])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadNextPage()
      }
    })
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [loadNextPage])

  return (
    <section>
      <h1 className="text-2xl font-semibold">Infinite Feed</h1>

      {phase === 'loading' && posts.length === 0 && (
        <p role="status" className="mt-4 text-slate-600">
          Loading posts…
        </p>
      )}

      {posts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                to={`/feed/${String(post.id)}`}
                aria-label={post.title}
                className="block rounded-md border border-slate-200 bg-white p-4 hover:border-slate-400"
              >
                <h2 className="text-lg font-medium">{post.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {phase === 'loading-more' && (
        <p role="status" className="mt-4 text-slate-600">
          Loading more posts…
        </p>
      )}

      {phase === 'error' && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <p>{errorMessage ?? 'Something went wrong.'}</p>
          <button
            type="button"
            onClick={retry}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {phase === 'end' && (
        <p role="status" className="mt-4 text-slate-600">
          You&apos;ve reached the end.
        </p>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-1" />
    </section>
  )
}

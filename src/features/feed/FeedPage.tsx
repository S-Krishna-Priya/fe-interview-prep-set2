import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useFeed } from './useFeed.ts'

// Keyed by route so other pages don't collide with it.
const SCROLL_POSITION_KEY = 'feed:scroll-position'

export default function FeedPage() {
  const { posts, phase, errorMessage, loadNextPage, retry } = useFeed()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasRestoredScrollRef = useRef(false)

  // Scroll restoration, kept deliberately simple: we don't hook into the
  // router's navigation events. We just persist window.scrollY to
  // sessionStorage whenever this page unmounts (i.e. the user navigated to a
  // post, or anywhere else), and restore it once, the first time the list
  // has posts to scroll through. Reading/writing sessionStorage is wrapped
  // so a disabled/unavailable storage (e.g. private browsing) degrades
  // silently instead of crashing the page.
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY))
      } catch {
        // sessionStorage unavailable; nothing to restore next time either.
      }
    }
  }, [])

  useEffect(() => {
    if (hasRestoredScrollRef.current) return
    if (posts.length === 0) return

    hasRestoredScrollRef.current = true
    try {
      const saved = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (saved !== null) {
        window.scrollTo(0, Number(saved))
      }
    } catch {
      // sessionStorage unavailable; start at the top like a fresh visit.
    }
  }, [posts.length])

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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedPage from './FeedPage.tsx'
import type { Post, PostsPageResponse } from './types.ts'

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  readonly callback: IntersectionCallback
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = (): IntersectionObserverEntry[] => []

  constructor(callback: IntersectionCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  /** Simulates the sentinel entering (or leaving) the viewport. */
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as unknown as IntersectionObserverEntry])
  }
}

function makePost(id: number): Post {
  return { id, title: `Post ${String(id)}`, body: `Body for post ${String(id)}`, userId: 1 }
}

function makePage(skip: number, limit: number, total: number): PostsPageResponse {
  const posts: Post[] = []
  for (let id = skip + 1; id <= Math.min(skip + limit, total); id += 1) {
    posts.push(makePost(id))
  }
  return { posts, total, skip, limit }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number): Response {
  return new Response(null, { status })
}

function renderFeedPage() {
  return render(
    <MemoryRouter initialEntries={['/feed']}>
      <Routes>
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/feed/:id" element={<p>post detail</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The single sentinel IntersectionObserver the page just created. */
function latestObserver(): MockIntersectionObserver {
  const observer = MockIntersectionObserver.instances.at(-1)
  if (!observer) throw new Error('no IntersectionObserver was created')
  return observer
}

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('FeedPage', () => {
  it('renders the first page of 10 posts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(makePage(0, 10, 30)))
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('skip=0')
  })

  it('loads page 2 and appends it when the sentinel intersects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePage(0, 10, 30)))
      .mockResolvedValueOnce(jsonResponse(makePage(10, 10, 30)))
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })

    latestObserver().trigger(true)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(20)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('link', { name: /Post 20/ })).toBeVisible()
  })

  it('fires exactly one fetch for a page even when the sentinel fires rapidly mid-flight', async () => {
    let resolveSecondPage: ((value: Response) => void) | undefined
    const secondPagePromise = new Promise<Response>((resolve) => {
      resolveSecondPage = resolve
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePage(0, 10, 30)))
      .mockReturnValueOnce(secondPagePromise)
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })

    const observer = latestObserver()
    // Simulate a fast scroll: the sentinel reports intersecting many times
    // before the in-flight request for page 2 has resolved.
    observer.trigger(true)
    observer.trigger(true)
    observer.trigger(true)
    observer.trigger(true)
    observer.trigger(true)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveSecondPage?.(jsonResponse(makePage(10, 10, 30)))

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(20)
    })
    // Still exactly one request for page 2, despite five intersections.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not render duplicate posts when the API returns an overlapping page', async () => {
    const overlappingPage = makePage(5, 10, 30) // ids 6-15, overlapping 6-10 from page one
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePage(0, 10, 30)))
      .mockResolvedValueOnce(jsonResponse(overlappingPage))
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })

    latestObserver().trigger(true)

    await waitFor(() => {
      // 10 original + 5 new (11-15); 6-10 are duplicates and must be dropped.
      expect(screen.getAllByRole('link')).toHaveLength(15)
    })
    expect(screen.getAllByRole('link', { name: /Post 7\b/ })).toHaveLength(1)
  })

  it('shows an error with a Retry button, and recovers on retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePage(0, 10, 30)))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(jsonResponse(makePage(10, 10, 30)))
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })

    latestObserver().trigger(true)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeVisible()
    })
    expect(screen.getAllByRole('link')).toHaveLength(10)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(20)
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('skip=10')
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('skip=10')
  })

  it('shows "reached the end" once every post has been loaded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePage(0, 10, 15)))
      .mockResolvedValueOnce(jsonResponse(makePage(10, 10, 15)))
    vi.stubGlobal('fetch', fetchMock)

    renderFeedPage()
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(10)
    })

    latestObserver().trigger(true)

    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(15)
    })
    expect(screen.getByRole('status')).toHaveTextContent(/reached the end/i)

    // Further intersections must not trigger any more requests.
    latestObserver().trigger(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

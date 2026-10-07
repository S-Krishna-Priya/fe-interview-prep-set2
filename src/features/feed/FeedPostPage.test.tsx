import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FeedPostPage from './FeedPostPage.tsx'
import type { Post } from './types.ts'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPostPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/feed/${id}`]}>
      <Routes>
        <Route path="/feed/:id" element={<FeedPostPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('FeedPostPage', () => {
  it('loads and renders the post for the route id', async () => {
    const post: Post = { id: 7, title: 'A detailed post', body: 'All about it.', userId: 1 }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(post))
    vi.stubGlobal('fetch', fetchMock)

    renderPostPage('7')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'A detailed post' })).toBeVisible()
    })
    expect(screen.getByText('All about it.')).toBeVisible()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/posts/7')
    expect(screen.getByRole('link', { name: /back to feed/i })).toHaveAttribute('href', '/feed')
  })

  it('shows an error when the post fails to load', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    renderPostPage('999')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeVisible()
    })
  })
})

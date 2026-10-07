import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CommentsApp } from './CommentsApp.tsx'
import { MockCommentsServer } from './mockServer.ts'
import { setOnline } from './testUtils.ts'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  // Leave the environment as we found it for the next test.
  setOnline(true)
  localStorage.clear()
})

async function postComment(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByLabelText(/write a comment/i)
  await user.type(input, text)
  await user.click(screen.getByRole('button', { name: /^post$/i }))
}

test('shows a new comment as sending immediately, then sent once the server confirms it', async () => {
  const server = new MockCommentsServer({ delayMs: 300, failureRate: 0 })
  const user = userEvent.setup()
  render(<CommentsApp server={server} />)

  await postComment(user, 'hello world')

  expect(await screen.findByText(/sending/i)).toBeVisible()

  await waitFor(() => {
    expect(screen.getByText(/^sent$/i)).toBeVisible()
  })
  expect(server.getComments()).toHaveLength(1)
  expect(server.getComments()[0]?.body).toBe('hello world')
})

test('a failed comment stays visible with a retry button, and retrying it succeeds without duplicating it', async () => {
  const server = new MockCommentsServer({ delayMs: 0, failureRate: 1 })
  const user = userEvent.setup()
  render(<CommentsApp server={server} />)

  await postComment(user, 'will fail first')

  const retryButton = await screen.findByRole('button', { name: /retry/i })
  expect(screen.getByText(/failed to send/i)).toBeVisible()
  expect(server.getComments()).toHaveLength(0)

  server.setFailureRate(0)
  await user.click(retryButton)

  await waitFor(() => {
    expect(screen.getByText(/^sent$/i)).toBeVisible()
  })
  // Exactly one comment was ever stored for this one client comment — the
  // failed attempt stored nothing, so the retry cannot have duplicated it.
  expect(server.getComments()).toHaveLength(1)
})

test('going offline, posting 3 comments, refreshing the page, and coming back online sends all 3 in order with no duplicates', async () => {
  const server = new MockCommentsServer({ delayMs: 0, failureRate: 0 })
  const user = userEvent.setup()

  setOnline(false)

  const view = render(<CommentsApp server={server} />)

  await postComment(user, 'first')
  await postComment(user, 'second')
  await postComment(user, 'third')

  expect(screen.getAllByText(/^queued/i)).toHaveLength(3)
  expect(server.getComments()).toHaveLength(0)

  // Simulate a page refresh: unmount this instance and mount a fresh one.
  // Only the persisted queue (localStorage) and the server carry state across.
  view.unmount()
  render(<CommentsApp server={server} />)

  expect(screen.getAllByText(/^queued/i)).toHaveLength(3)

  setOnline(true)

  await waitFor(() => {
    expect(server.getComments()).toHaveLength(3)
  })

  expect(server.getComments().map((comment) => comment.body)).toEqual(['first', 'second', 'third'])

  await waitFor(() => {
    expect(screen.getAllByText(/^sent$/i)).toHaveLength(3)
  })
})

test('drains the queue one comment at a time, never sending two at once', async () => {
  const server = new MockCommentsServer({ delayMs: 20, failureRate: 0 })
  let inFlight = 0
  let maxInFlight = 0
  const originalPostComment = server.postComment.bind(server)
  vi.spyOn(server, 'postComment').mockImplementation(async (input, options) => {
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    try {
      return await originalPostComment(input, options)
    } finally {
      inFlight -= 1
    }
  })

  const user = userEvent.setup()
  render(<CommentsApp server={server} />)

  await postComment(user, 'first')
  await postComment(user, 'second')
  await postComment(user, 'third')

  await waitFor(() => {
    expect(server.getComments()).toHaveLength(3)
  })

  expect(maxInFlight).toBe(1)
})

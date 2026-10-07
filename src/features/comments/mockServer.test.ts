import { beforeEach, describe, expect, test } from 'vitest'
import { MockCommentsServer } from './mockServer.ts'

describe('MockCommentsServer', () => {
  let server: MockCommentsServer

  beforeEach(() => {
    server = new MockCommentsServer({ delayMs: 0, failureRate: 0 })
  })

  test('stores a comment and reports it back through getComments', async () => {
    const comment = await server.postComment({ idempotencyKey: 'key-1', body: 'hello' })

    expect(comment.body).toBe('hello')
    expect(server.getComments()).toEqual([comment])
  })

  test('a repeated idempotency key returns the existing comment instead of creating a duplicate', async () => {
    const first = await server.postComment({ idempotencyKey: 'same-key', body: 'original body' })

    // Simulate a retry sent after the server already stored the comment —
    // perhaps the client never saw the first response. The body here is
    // intentionally different to prove the server ignores it for a known key.
    const second = await server.postComment({ idempotencyKey: 'same-key', body: 'a different body' })

    expect(second).toEqual(first)
    expect(server.getComments()).toHaveLength(1)
    expect(server.getComments()[0]?.body).toBe('original body')
  })

  test('supports an injectable, deterministic failure rate', async () => {
    const alwaysFails = new MockCommentsServer({ delayMs: 0, failureRate: 1 })
    await expect(alwaysFails.postComment({ idempotencyKey: 'fails', body: 'x' })).rejects.toThrow()
    expect(alwaysFails.getComments()).toHaveLength(0)

    const alwaysSucceeds = new MockCommentsServer({ delayMs: 0, failureRate: 0 })
    await expect(alwaysSucceeds.postComment({ idempotencyKey: 'succeeds', body: 'y' })).resolves.toMatchObject({
      body: 'y',
    })
  })

  test('supports an injectable delay, and a per-call override of it', async () => {
    const start = Date.now()
    await server.postComment({ idempotencyKey: 'fast', body: 'fast' }, { delayMs: 5 })
    expect(Date.now() - start).toBeGreaterThanOrEqual(5)
  })
})

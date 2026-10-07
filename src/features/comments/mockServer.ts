/**
 * A mock comments API: slow (1-2s by default) and flaky (fails ~20% of the
 * time by default). Delay and failure rate are both injectable so tests can
 * make the server fast and deterministic.
 *
 * Idempotency lives here, on the server: `postComment` keeps its own
 * `Map<idempotencyKey, ServerComment>`. A repeated key returns the comment
 * that was already stored instead of creating a second one, so retrying a
 * request the server already processed can never duplicate it.
 */

export type ServerComment = {
  idempotencyKey: string
  body: string
  createdAt: number
}

export type PostCommentInput = {
  idempotencyKey: string
  body: string
}

export type PostCommentOptions = {
  delayMs?: number
  failureRate?: number
}

export type CommentsServerConfig = {
  delayMs?: number
  failureRate?: number
}

export interface CommentsServer {
  postComment: (input: PostCommentInput, options?: PostCommentOptions) => Promise<ServerComment>
  getComments: () => ServerComment[]
}

const DEFAULT_MIN_DELAY_MS = 1000
const DEFAULT_MAX_DELAY_MS = 2000
const DEFAULT_FAILURE_RATE = 0.2

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export class MockCommentsServer implements CommentsServer {
  private readonly comments = new Map<string, ServerComment>()
  private delayMs: number | undefined
  private failureRate: number

  constructor(config: CommentsServerConfig = {}) {
    this.delayMs = config.delayMs
    this.failureRate = config.failureRate ?? DEFAULT_FAILURE_RATE
  }

  /** Fix the delay to an exact value (e.g. 0 in tests). */
  setDelayMs(ms: number): void {
    this.delayMs = ms
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate
  }

  async postComment(input: PostCommentInput, options: PostCommentOptions = {}): Promise<ServerComment> {
    const existing = this.comments.get(input.idempotencyKey)
    if (existing) {
      return existing
    }

    await wait(options.delayMs ?? this.delayMs ?? randomBetween(DEFAULT_MIN_DELAY_MS, DEFAULT_MAX_DELAY_MS))

    // A duplicate request could have been stored while this one was waiting.
    const storedWhileWaiting = this.comments.get(input.idempotencyKey)
    if (storedWhileWaiting) {
      return storedWhileWaiting
    }

    const failureRate = options.failureRate ?? this.failureRate
    if (Math.random() < failureRate) {
      throw new Error('The comments server failed to process this comment.')
    }

    const comment: ServerComment = {
      idempotencyKey: input.idempotencyKey,
      body: input.body,
      createdAt: Date.now(),
    }
    this.comments.set(input.idempotencyKey, comment)
    return comment
  }

  /** Lets tests (and, in principle, an admin view) read what the server holds. */
  getComments(): ServerComment[] {
    return [...this.comments.values()].sort((a, b) => a.createdAt - b.createdAt)
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export const mockCommentsServer = new MockCommentsServer()

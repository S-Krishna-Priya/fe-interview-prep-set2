import type { Post, PostsPageResponse } from './types.ts'

const POSTS_URL = 'https://dummyjson.com/posts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPost(value: unknown): value is Post {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    typeof value.userId === 'number'
  )
}

function isPostsPageResponse(value: unknown): value is PostsPageResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.posts) &&
    value.posts.every(isPost) &&
    typeof value.total === 'number' &&
    typeof value.skip === 'number' &&
    typeof value.limit === 'number'
  )
}

/** Fetches one page of posts, `limit` items starting at `skip`. */
export async function fetchPostsPage(
  skip: number,
  limit: number,
  signal: AbortSignal,
): Promise<PostsPageResponse> {
  const response = await fetch(`${POSTS_URL}?limit=${String(limit)}&skip=${String(skip)}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load posts (status ${String(response.status)})`)
  }

  const data: unknown = await response.json()
  if (!isPostsPageResponse(data)) {
    throw new Error('Received an unexpected posts response shape.')
  }
  return data
}

/** Fetches a single post by id, for the detail page. */
export async function fetchPostById(id: string, signal: AbortSignal): Promise<Post> {
  const response = await fetch(`${POSTS_URL}/${id}`, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load post (status ${String(response.status)})`)
  }

  const data: unknown = await response.json()
  if (!isPost(data)) {
    throw new Error('Received an unexpected post response shape.')
  }
  return data
}

import type { Post, PostsPageResponse } from './types.ts'

const POSTS_URL = 'https://dummyjson.com/posts'

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
  return data as PostsPageResponse
}

/** Fetches a single post by id, for the detail page. */
export async function fetchPostById(id: string, signal: AbortSignal): Promise<Post> {
  const response = await fetch(`${POSTS_URL}/${id}`, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load post (status ${String(response.status)})`)
  }

  const data: unknown = await response.json()
  return data as Post
}

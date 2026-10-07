export interface Post {
  id: number
  title: string
  body: string
  userId: number
}

export interface PostsPageResponse {
  posts: Post[]
  total: number
  skip: number
  limit: number
}

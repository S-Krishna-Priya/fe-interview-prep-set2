export type Question = {
  id: number
  title: string
  path: string
  branch: string
}

export const questions: Question[] = [
  { id: 1, title: 'Shopping Cart', path: '/cart', branch: 'feature/q1-cart' },
  { id: 2, title: 'Infinite Feed', path: '/feed', branch: 'feature/q2-feed' },
  { id: 3, title: 'Kanban Board', path: '/kanban', branch: 'feature/q3-kanban' },
  { id: 4, title: 'Live Dashboard', path: '/dashboard', branch: 'feature/q4-dashboard' },
  { id: 5, title: 'Comments with Offline Support', path: '/comments', branch: 'feature/q5-comments' },
]

import { CommentsApp } from './CommentsApp.tsx'
import { mockCommentsServer } from './mockServer.ts'

export default function CommentsPage() {
  return <CommentsApp server={mockCommentsServer} />
}

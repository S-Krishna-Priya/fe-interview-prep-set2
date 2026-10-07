import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.tsx'
import CartPage from './features/cart/CartPage.tsx'
import CommentsPage from './features/comments/CommentsPage.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import FeedPage from './features/feed/FeedPage.tsx'
import FeedPostPage from './features/feed/FeedPostPage.tsx'
import KanbanPage from './features/kanban/KanbanPage.tsx'
import HomePage from './pages/HomePage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/feed/:id" element={<FeedPostPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/comments" element={<CommentsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

import { Route, Routes } from 'react-router'
import AppLayout from './components/AppLayout.tsx'
import HomePage from './pages/HomePage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import PlaceholderPage from './pages/PlaceholderPage.tsx'
import { questions } from './questions.ts'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        {questions.map((question) => (
          <Route
            key={question.path}
            path={question.path}
            element={<PlaceholderPage question={question} />}
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

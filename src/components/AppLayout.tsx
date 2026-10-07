import { NavLink, Outlet } from 'react-router'
import { questions } from '../questions.ts'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
    : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          {questions.map((question) => (
            <NavLink key={question.path} to={question.path} className={linkClass}>
              {question.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

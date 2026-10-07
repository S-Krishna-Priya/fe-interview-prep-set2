import { Link } from 'react-router'
import { questions } from '../questions.ts'

export default function HomePage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Frontend Interview Prep — Set 2</h1>
      <p className="mt-2 text-slate-600">
        Five React and TypeScript features, each on its own route and shipped as its own pull
        request.
      </p>
      <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {questions.map((question) => (
          <li key={question.path}>
            <Link
              to={question.path}
              className="flex items-baseline gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-400">Q{question.id}</span>
              <span className="font-medium">{question.title}</span>
              <span className="ml-auto font-mono text-xs text-slate-400">{question.branch}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

import type { Question } from '../questions.ts'

type PlaceholderPageProps = {
  question: Question
}

export default function PlaceholderPage({ question }: PlaceholderPageProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{question.title}</h1>
      <p className="mt-2 text-slate-600">
        Not built yet. This route is delivered on{' '}
        <code className="font-mono text-sm">{question.branch}</code>.
      </p>
    </section>
  )
}

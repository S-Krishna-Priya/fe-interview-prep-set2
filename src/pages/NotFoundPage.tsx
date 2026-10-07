import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-2 inline-block text-slate-600 underline hover:text-slate-900">
        Back to home
      </Link>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchPostById } from './api.ts'
import type { Post } from './types.ts'

type Status = 'loading' | 'error' | 'success'

export default function FeedPostPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <section>
      <Link to="/feed" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        ← Back to feed
      </Link>

      {id ? (
        // `key={id}` remounts this on id change, so each post starts from a
        // fresh "loading" state instead of an effect reaching back in to
        // reset it (which React's lint rules rightly discourage).
        <PostDetail key={id} id={id} />
      ) : (
        <p role="alert" className="mt-4 text-red-700">
          No post id in the URL.
        </p>
      )}
    </section>
  )
}

function PostDetail({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    fetchPostById(id, controller.signal)
      .then((data) => {
        if (!isMounted) return
        setPost(data)
        setStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load post.')
        setStatus('error')
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [id])

  return (
    <>
      {status === 'loading' && (
        <p role="status" className="mt-4 text-slate-600">
          Loading post…
        </p>
      )}

      {status === 'error' && (
        <p role="alert" className="mt-4 text-red-700">
          {errorMessage ?? 'Something went wrong.'}
        </p>
      )}

      {status === 'success' && post && (
        <article className="mt-4">
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <p className="mt-4 whitespace-pre-line text-slate-700">{post.body}</p>
        </article>
      )}
    </>
  )
}

import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'
import type { CommentsServer } from './mockServer.ts'
import type { Comment } from './types.ts'
import { useComments } from './useComments.ts'

const STATUS_LABEL: Record<Comment['status'], string> = {
  queued: 'Queued — waiting to send',
  sending: 'Sending…',
  sent: 'Sent',
  failed: 'Failed to send',
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type CommentsAppProps = {
  server: CommentsServer
}

export function CommentsApp({ server }: CommentsAppProps) {
  const { comments, isOnline, submit, retry } = useComments(server)
  const [draft, setDraft] = useState('')
  const fieldId = useId()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.trim() === '') return
    submit(draft)
    setDraft('')
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Comments with Offline Support</h1>
      <p className="mt-2 text-slate-600">
        Comments post to a slow, flaky mock server. Go offline and new comments queue up, then send
        automatically, in order, once you reconnect.
      </p>

      <p role="status" className="mt-4 text-sm font-medium text-slate-700">
        {isOnline ? 'Online' : 'Offline — new comments will be queued'}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={fieldId} className="sr-only">
          Write a comment
        </label>
        <input
          id={fieldId}
          name="comment"
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          placeholder="Write a comment…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Post
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-900">{comment.body}</p>
              <div className="mt-2 flex items-center gap-3">
                <span role="status" className="text-xs font-medium text-slate-500">
                  {STATUS_LABEL[comment.status]}
                </span>
                <span className="text-xs text-slate-400">{formatTime(comment.createdAt)}</span>
                {comment.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => {
                      retry(comment.id)
                    }}
                    aria-label={`Retry sending comment: ${comment.body}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Retry
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

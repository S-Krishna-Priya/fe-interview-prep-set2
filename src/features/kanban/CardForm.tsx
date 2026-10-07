import { useId, useState, type SubmitEvent } from 'react'

interface CardFormProps {
  initialTitle?: string
  initialDescription?: string
  submitLabel: string
  onSubmit: (title: string, description: string) => void
  onCancel?: () => void
}

/** Shared add/edit form. Validates the required title before calling onSubmit. */
export default function CardForm({
  initialTitle = '',
  initialDescription = '',
  submitLabel,
  onSubmit,
  onCancel,
}: CardFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setError('')
    onSubmit(title, description)
    if (!onCancel) {
      setTitle('')
      setDescription('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-xs font-medium text-slate-600">
          Title
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          aria-describedby={error ? errorId : undefined}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor={descriptionId} className="text-xs font-medium text-slate-600">
          Description (optional)
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
          }}
          rows={2}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white">
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

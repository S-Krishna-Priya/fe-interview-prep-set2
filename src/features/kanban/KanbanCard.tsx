import { useEffect, useRef, useState } from 'react'
import CardForm from './CardForm.tsx'
import { readDragPayload, setDragPayload, type DragPayload } from './dragPayload.ts'
import { COLUMN_ORDER, COLUMN_TITLES, type Card, type ColumnId } from './types.ts'

interface KanbanCardProps {
  card: Card
  columnId: ColumnId
  isFirst: boolean
  isLast: boolean
  onUpdate: (title: string, description: string) => void
  onDelete: () => void
  onMoveBy: (direction: -1 | 1) => void
  onMoveToColumn: (to: ColumnId) => void
  /** A card was dropped directly on this one; insert it just before this card. */
  onDropBefore: (payload: DragPayload) => void
  /**
   * True for the one render where this card has just landed here via a
   * cross-column move, so its own Edit button can take focus instead of
   * leaving a keyboard user's focus on the (now-unmounted) button they
   * pressed in the source column.
   */
  autoFocus: boolean
  onAutoFocusHandled: () => void
}

const buttonClass = 'rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100'

export default function KanbanCard({
  card,
  columnId,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveBy,
  onMoveToColumn,
  onDropBefore,
  autoFocus,
  onAutoFocusHandled,
}: KanbanCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const otherColumns = COLUMN_ORDER.filter((id) => id !== columnId)

  useEffect(() => {
    if (autoFocus) {
      editButtonRef.current?.focus()
      onAutoFocusHandled()
    }
  }, [autoFocus, onAutoFocusHandled])

  if (isEditing) {
    return (
      <li className="rounded border border-slate-200 bg-white p-3 shadow-sm">
        <CardForm
          initialTitle={card.title}
          initialDescription={card.description ?? ''}
          submitLabel="Save"
          onCancel={() => {
            setIsEditing(false)
          }}
          onSubmit={(title, description) => {
            onUpdate(title, description)
            setIsEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li
      className="rounded border border-slate-200 bg-white p-3 shadow-sm"
      draggable
      onDragStart={(event) => {
        setDragPayload(event.dataTransfer, { cardId: card.id, from: columnId })
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const payload = readDragPayload(event.dataTransfer)
        if (payload) onDropBefore(payload)
      }}
    >
      <h3 className="text-sm font-semibold break-words">{card.title}</h3>
      {card.description !== undefined ? (
        <p className="mt-1 text-xs break-words text-slate-600">{card.description}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          ref={editButtonRef}
          type="button"
          className={buttonClass}
          onClick={() => {
            setIsEditing(true)
          }}
          aria-label={`Edit "${card.title}"`}
        >
          Edit
        </button>
        <button type="button" className={buttonClass} onClick={onDelete} aria-label={`Delete "${card.title}"`}>
          Delete
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            onMoveBy(-1)
          }}
          disabled={isFirst}
          aria-label={`Move "${card.title}" up`}
        >
          Up
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            onMoveBy(1)
          }}
          disabled={isLast}
          aria-label={`Move "${card.title}" down`}
        >
          Down
        </button>
        {otherColumns.map((targetColumn) => (
          <button
            key={targetColumn}
            type="button"
            className={buttonClass}
            onClick={() => {
              onMoveToColumn(targetColumn)
            }}
            aria-label={`Move "${card.title}" to ${COLUMN_TITLES[targetColumn]}`}
          >
            Move to {COLUMN_TITLES[targetColumn]}
          </button>
        ))}
      </div>
    </li>
  )
}

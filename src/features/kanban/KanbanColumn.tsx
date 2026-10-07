import { useId } from 'react'
import CardForm from './CardForm.tsx'
import { readDragPayload } from './dragPayload.ts'
import KanbanCard from './KanbanCard.tsx'
import type { Card, ColumnId } from './types.ts'

interface KanbanColumnProps {
  columnId: ColumnId
  title: string
  cards: Card[]
  onAddCard: (title: string, description: string) => void
  onUpdateCard: (cardId: string, title: string, description: string) => void
  onDeleteCard: (cardId: string) => void
  onMoveCardBy: (cardId: string, direction: -1 | 1) => void
  onMoveCardToColumn: (cardId: string, to: ColumnId) => void
  onDropCardBeforeIndex: (cardId: string, from: ColumnId, beforeIndex: number) => void
  onDropCardAtEnd: (cardId: string, from: ColumnId) => void
}

export default function KanbanColumn({
  columnId,
  title,
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCardBy,
  onMoveCardToColumn,
  onDropCardBeforeIndex,
  onDropCardAtEnd,
}: KanbanColumnProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg bg-slate-100 p-3"
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        const payload = readDragPayload(event.dataTransfer)
        if (payload) onDropCardAtEnd(payload.cardId, payload.from)
      }}
    >
      <h2 id={headingId} className="text-sm font-semibold text-slate-700">
        {title} ({cards.length})
      </h2>

      <ul aria-label={`${title} cards`} className="flex flex-col gap-2">
        {cards.map((card, index) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnId={columnId}
            isFirst={index === 0}
            isLast={index === cards.length - 1}
            onUpdate={(cardTitle, description) => {
              onUpdateCard(card.id, cardTitle, description)
            }}
            onDelete={() => {
              onDeleteCard(card.id)
            }}
            onMoveBy={(direction) => {
              onMoveCardBy(card.id, direction)
            }}
            onMoveToColumn={(to) => {
              onMoveCardToColumn(card.id, to)
            }}
            onDropBefore={(payload) => {
              onDropCardBeforeIndex(payload.cardId, payload.from, index)
            }}
          />
        ))}
      </ul>

      <CardForm
        submitLabel={`Add card to ${title}`}
        onSubmit={(cardTitle, description) => {
          onAddCard(cardTitle, description)
        }}
      />
    </section>
  )
}

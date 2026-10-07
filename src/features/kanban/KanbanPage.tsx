import { useState } from 'react'
import KanbanColumn from './KanbanColumn.tsx'
import { COLUMN_ORDER, COLUMN_TITLES } from './types.ts'
import { useKanbanBoard } from './useKanbanBoard.ts'

export default function KanbanPage() {
  const { board, addCard, updateCard, deleteCard, moveCard, moveCardBy } = useKanbanBoard()
  // Tracks a card that just moved to another column via the keyboard menu, so
  // that column can move focus onto it instead of losing focus to the body.
  const [focusCardId, setFocusCardId] = useState<string | null>(null)

  return (
    <section>
      <h1 className="text-2xl font-semibold">Kanban Board</h1>
      <p className="mt-2 text-slate-600">
        Drag a card to move it, or use its buttons to move it with the keyboard.
      </p>

      <div className="mt-6 flex flex-col gap-4 md:flex-row">
        {COLUMN_ORDER.map((columnId) => (
          <KanbanColumn
            key={columnId}
            columnId={columnId}
            title={COLUMN_TITLES[columnId]}
            cards={board[columnId]}
            onAddCard={(title, description) => {
              addCard(columnId, title, description)
            }}
            onUpdateCard={(cardId, title, description) => {
              updateCard(columnId, cardId, title, description)
            }}
            onDeleteCard={(cardId) => {
              deleteCard(columnId, cardId)
            }}
            onMoveCardBy={(cardId, direction) => {
              moveCardBy(columnId, cardId, direction)
            }}
            onMoveCardToColumn={(cardId, to) => {
              moveCard(cardId, columnId, to)
              setFocusCardId(cardId)
            }}
            onDropCardBeforeIndex={(cardId, from, beforeIndex) => {
              moveCard(cardId, from, columnId, beforeIndex)
            }}
            onDropCardAtEnd={(cardId, from) => {
              moveCard(cardId, from, columnId)
            }}
            focusCardId={focusCardId}
            onCardFocusHandled={() => {
              setFocusCardId(null)
            }}
          />
        ))}
      </div>
    </section>
  )
}

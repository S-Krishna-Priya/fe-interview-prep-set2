import { useCallback, useEffect, useState } from 'react'
import { loadBoard, saveBoard } from './storage.ts'
import type { Board, Card, ColumnId } from './types.ts'

function buildCard(id: string, title: string, description: string): Card {
  const trimmedDescription = description.trim()
  return {
    id,
    title: title.trim(),
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
  }
}

export interface UseKanbanBoardResult {
  board: Board
  addCard: (columnId: ColumnId, title: string, description: string) => void
  updateCard: (columnId: ColumnId, cardId: string, title: string, description: string) => void
  deleteCard: (columnId: ColumnId, cardId: string) => void
  /** Moves a card to another column, or reorders it within the same one. */
  moveCard: (cardId: string, from: ColumnId, to: ColumnId, toIndex?: number) => void
  moveCardBy: (columnId: ColumnId, cardId: string, direction: -1 | 1) => void
}

export function useKanbanBoard(): UseKanbanBoardResult {
  const [board, setBoard] = useState<Board>(() => loadBoard())

  useEffect(() => {
    saveBoard(board)
  }, [board])

  const addCard = useCallback((columnId: ColumnId, title: string, description: string) => {
    if (!title.trim()) return
    const card = buildCard(crypto.randomUUID(), title, description)
    setBoard((prev) => ({ ...prev, [columnId]: [...prev[columnId], card] }))
  }, [])

  const updateCard = useCallback(
    (columnId: ColumnId, cardId: string, title: string, description: string) => {
      if (!title.trim()) return
      setBoard((prev) => ({
        ...prev,
        [columnId]: prev[columnId].map((card) =>
          card.id === cardId ? buildCard(card.id, title, description) : card,
        ),
      }))
    },
    [],
  )

  const deleteCard = useCallback((columnId: ColumnId, cardId: string) => {
    setBoard((prev) => ({ ...prev, [columnId]: prev[columnId].filter((card) => card.id !== cardId) }))
  }, [])

  const moveCard = useCallback((cardId: string, from: ColumnId, to: ColumnId, toIndex?: number) => {
    setBoard((prev) => {
      const sourceCards = prev[from]
      const cardIndex = sourceCards.findIndex((card) => card.id === cardId)
      const card = cardIndex === -1 ? undefined : sourceCards[cardIndex]
      if (!card) return prev

      const sourceWithoutCard = [...sourceCards.slice(0, cardIndex), ...sourceCards.slice(cardIndex + 1)]

      if (from === to) {
        // `toIndex` (when given) is the drop target's position in the ORIGINAL
        // array, which still contains the dragged card. Once that card is
        // removed, every slot after it shifts down by one, so the insertion
        // point needs the same adjustment whenever the card moved forward.
        const requestedIndex = toIndex ?? sourceWithoutCard.length
        const insertAt =
          toIndex !== undefined && cardIndex < toIndex ? requestedIndex - 1 : requestedIndex
        const clampedInsertAt = Math.max(0, Math.min(insertAt, sourceWithoutCard.length))
        const reordered = [
          ...sourceWithoutCard.slice(0, clampedInsertAt),
          card,
          ...sourceWithoutCard.slice(clampedInsertAt),
        ]
        return { ...prev, [from]: reordered }
      }

      const targetCards = prev[to]
      const insertAt = Math.max(0, Math.min(toIndex ?? targetCards.length, targetCards.length))
      const nextTarget = [...targetCards.slice(0, insertAt), card, ...targetCards.slice(insertAt)]
      return { ...prev, [from]: sourceWithoutCard, [to]: nextTarget }
    })
  }, [])

  const moveCardBy = useCallback((columnId: ColumnId, cardId: string, direction: -1 | 1) => {
    setBoard((prev) => {
      const cards = prev[columnId]
      const index = cards.findIndex((card) => card.id === cardId)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= cards.length) return prev

      const card = cards[index]
      if (!card) return prev

      const next = [...cards.slice(0, index), ...cards.slice(index + 1)]
      next.splice(targetIndex, 0, card)
      return { ...prev, [columnId]: next }
    })
  }, [])

  return { board, addCard, updateCard, deleteCard, moveCard, moveCardBy }
}

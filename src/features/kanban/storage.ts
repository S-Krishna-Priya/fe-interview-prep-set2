import { COLUMN_ORDER, createEmptyBoard, type Board, type Card } from './types.ts'

const STORAGE_KEY = 'kanban-board'

function isValidCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (typeof record['id'] !== 'string' || record['id'] === '') return false
  if (typeof record['title'] !== 'string') return false
  if ('description' in record && typeof record['description'] !== 'string') return false
  return true
}

function isValidBoard(value: unknown): value is Board {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return COLUMN_ORDER.every((columnId) => {
    const cards = record[columnId]
    return Array.isArray(cards) && cards.every(isValidCard)
  })
}

/**
 * Reads the board from localStorage. Falls back to an empty board when the
 * key is absent, the JSON is corrupted, or the parsed shape doesn't match
 * what the app expects (e.g. hand-edited localStorage).
 */
export function loadBoard(): Board {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return createEmptyBoard()

    const parsed: unknown = JSON.parse(raw)
    return isValidBoard(parsed) ? parsed : createEmptyBoard()
  } catch {
    return createEmptyBoard()
  }
}

export function saveBoard(board: Board): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  } catch {
    // Storage can fail (quota exceeded, private browsing). Losing
    // persistence silently is preferable to crashing the board.
  }
}

export type ColumnId = 'todo' | 'in-progress' | 'done'

export interface Card {
  id: string
  title: string
  description?: string
}

export type Board = Record<ColumnId, Card[]>

export const COLUMN_ORDER: ColumnId[] = ['todo', 'in-progress', 'done']

export const COLUMN_TITLES: Record<ColumnId, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

export function createEmptyBoard(): Board {
  return { todo: [], 'in-progress': [], done: [] }
}

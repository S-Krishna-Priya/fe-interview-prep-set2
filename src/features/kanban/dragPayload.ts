import { COLUMN_ORDER, type ColumnId } from './types.ts'

const DRAG_MIME_TYPE = 'application/json'

export interface DragPayload {
  cardId: string
  from: ColumnId
}

/**
 * The slice of the native `DataTransfer` API this module relies on. jsdom
 * (used in tests) doesn't implement `DataTransfer`, so drag tests supply a
 * plain-object stub instead of a real one; typing against this narrower,
 * structural interface (rather than the DOM `DataTransfer` type) lets a real
 * `DataTransfer` and a test stub both satisfy it without an unsafe cast.
 */
export interface DragTransferLike {
  setData: (format: string, data: string) => void
  getData: (format: string) => string
  effectAllowed?: string
}

function isColumnId(value: unknown): value is ColumnId {
  return typeof value === 'string' && COLUMN_ORDER.includes(value as ColumnId)
}

function isDragPayload(value: unknown): value is DragPayload {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record['cardId'] === 'string' && isColumnId(record['from'])
}

export function setDragPayload(dataTransfer: DragTransferLike, payload: DragPayload): void {
  dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload))
  dataTransfer.effectAllowed = 'move'
}

/** Returns null when the drop didn't carry a payload this board recognizes. */
export function readDragPayload(dataTransfer: DragTransferLike): DragPayload | null {
  const raw = dataTransfer.getData(DRAG_MIME_TYPE)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isDragPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

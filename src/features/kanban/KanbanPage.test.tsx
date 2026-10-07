import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import type { DragTransferLike } from './dragPayload.ts'
import KanbanPage from './KanbanPage.tsx'

const STORAGE_KEY = 'kanban-board'

beforeEach(() => {
  window.localStorage.clear()
})

function getColumn(name: RegExp) {
  return screen.getByRole('region', { name })
}

async function addCard(column: HTMLElement, title: string) {
  const user = userEvent.setup()
  await user.type(within(column).getByLabelText('Title'), title)
  await user.click(within(column).getByRole('button', { name: /^Add card to /i }))
}

function getCardItem(column: HTMLElement, title: string): HTMLElement {
  const heading = within(column).getByRole('heading', { name: title, level: 3 })
  const item = heading.closest('li')
  if (!item) throw new Error(`card list item for "${title}" not found`)
  return item
}

/**
 * jsdom doesn't implement the DataTransfer interface (see
 * https://github.com/jsdom/jsdom/issues/1568), so drag-and-drop tests use
 * this minimal stub instead of `new DataTransfer()`. Testing Library detects
 * that `window.DataTransfer` isn't a constructor and attaches this object to
 * the simulated event's `dataTransfer` property as-is.
 */
function createDataTransfer(): DragTransferLike {
  const store = new Map<string, string>()
  return {
    setData(format: string, data: string) {
      store.set(format, data)
    },
    getData(format: string) {
      return store.get(format) ?? ''
    },
  }
}

test('adds a card with a title, and rejects an empty title', async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))
  expect(within(todoColumn).getByRole('alert')).toHaveTextContent('Title is required.')
  expect(within(todoColumn).queryAllByRole('listitem')).toHaveLength(0)

  await user.type(within(todoColumn).getByLabelText('Title'), 'Write tests')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  expect(within(todoColumn).getByRole('heading', { name: 'Write tests', level: 3 })).toBeVisible()
  expect(within(todoColumn).getByRole('heading', { level: 2 })).toHaveTextContent('To do (1)')
})

test("edits a card's title and description", async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await user.type(within(todoColumn).getByLabelText('Title'), 'Initial title')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  const cardHeading = within(todoColumn).getByRole('heading', { name: 'Initial title', level: 3 })
  const cardItem = cardHeading.closest('li')
  expect(cardItem).not.toBeNull()
  if (!cardItem) throw new Error('card list item not found')

  await user.click(within(cardItem).getByRole('button', { name: 'Edit "Initial title"' }))

  const titleInput = within(cardItem).getByLabelText('Title')
  await user.clear(titleInput)
  await user.type(titleInput, 'Updated title')
  await user.type(within(cardItem).getByLabelText('Description (optional)'), 'Some details')
  await user.click(within(cardItem).getByRole('button', { name: 'Save' }))

  expect(within(todoColumn).getByRole('heading', { name: 'Updated title', level: 3 })).toBeVisible()
  expect(within(todoColumn).getByText('Some details')).toBeVisible()
})

test('deletes a card', async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await user.type(within(todoColumn).getByLabelText('Title'), 'Temp card')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  await user.click(within(todoColumn).getByRole('button', { name: 'Delete "Temp card"' }))

  expect(within(todoColumn).queryByText('Temp card')).not.toBeInTheDocument()
  expect(within(todoColumn).getByRole('heading', { level: 2 })).toHaveTextContent('To do (0)')
})

test('moves a card to another column via the keyboard menu, updating both columns and counts', async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)
  const inProgressColumn = getColumn(/^In progress/)

  await user.type(within(todoColumn).getByLabelText('Title'), 'Move me')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  expect(within(todoColumn).getByRole('heading', { level: 2 })).toHaveTextContent('To do (1)')
  expect(within(inProgressColumn).getByRole('heading', { level: 2 })).toHaveTextContent('In progress (0)')

  await user.click(within(todoColumn).getByRole('button', { name: 'Move "Move me" to In progress' }))

  expect(within(todoColumn).queryByText('Move me')).not.toBeInTheDocument()
  expect(within(inProgressColumn).getByText('Move me')).toBeVisible()
  expect(within(todoColumn).getByRole('heading', { level: 2 })).toHaveTextContent('To do (0)')
  expect(within(inProgressColumn).getByRole('heading', { level: 2 })).toHaveTextContent('In progress (1)')
})

test('reorders cards within a column using move up and move down', async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await user.type(within(todoColumn).getByLabelText('Title'), 'First')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))
  await user.type(within(todoColumn).getByLabelText('Title'), 'Second')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  let headings = within(todoColumn).getAllByRole('heading', { level: 3 })
  expect(headings.map((heading) => heading.textContent)).toEqual(['First', 'Second'])

  await user.click(within(todoColumn).getByRole('button', { name: 'Move "Second" up' }))

  headings = within(todoColumn).getAllByRole('heading', { level: 3 })
  expect(headings.map((heading) => heading.textContent)).toEqual(['Second', 'First'])

  await user.click(within(todoColumn).getByRole('button', { name: 'Move "Second" down' }))

  headings = within(todoColumn).getAllByRole('heading', { level: 3 })
  expect(headings.map((heading) => heading.textContent)).toEqual(['First', 'Second'])
})

test('reorders cards via drag-and-drop when dragging a card forward (down the list)', async () => {
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await addCard(todoColumn, 'A')
  await addCard(todoColumn, 'B')
  await addCard(todoColumn, 'C')

  const cardA = getCardItem(todoColumn, 'A')
  const cardC = getCardItem(todoColumn, 'C')
  const dataTransfer = createDataTransfer()

  // Drag A and drop it on C: A sits before B in the array, so removing it
  // shifts C's slot down by one - the insert index must account for that.
  fireEvent.dragStart(cardA, { dataTransfer })
  fireEvent.dragOver(cardC, { dataTransfer })
  fireEvent.drop(cardC, { dataTransfer })

  const headings = within(todoColumn).getAllByRole('heading', { level: 3 })
  expect(headings.map((heading) => heading.textContent)).toEqual(['B', 'A', 'C'])
})

test('reorders cards via drag-and-drop when dragging a card backward (up the list)', async () => {
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await addCard(todoColumn, 'A')
  await addCard(todoColumn, 'B')
  await addCard(todoColumn, 'C')

  const cardA = getCardItem(todoColumn, 'A')
  const cardC = getCardItem(todoColumn, 'C')
  const dataTransfer = createDataTransfer()

  // Drag C and drop it on A: C sits after A, so A's index is unaffected by
  // the removal - this direction already worked before the fix.
  fireEvent.dragStart(cardC, { dataTransfer })
  fireEvent.dragOver(cardA, { dataTransfer })
  fireEvent.drop(cardA, { dataTransfer })

  const headings = within(todoColumn).getAllByRole('heading', { level: 3 })
  expect(headings.map((heading) => heading.textContent)).toEqual(['C', 'A', 'B'])
})

test('keeps focus on the moved card after a cross-column keyboard move', async () => {
  const user = userEvent.setup()
  render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)
  const inProgressColumn = getColumn(/^In progress/)

  await addCard(todoColumn, 'Focus me')

  const moveButton = within(todoColumn).getByRole('button', { name: 'Move "Focus me" to In progress' })
  await user.click(moveButton)

  expect(within(inProgressColumn).getByRole('button', { name: 'Edit "Focus me"' })).toHaveFocus()
})

test('persists the board across a remount', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<KanbanPage />)
  const todoColumn = getColumn(/^To do/)

  await user.type(within(todoColumn).getByLabelText('Title'), 'Persisted card')
  await user.click(within(todoColumn).getByRole('button', { name: 'Add card to To do' }))

  unmount()

  render(<KanbanPage />)
  const todoColumnAfterRemount = getColumn(/^To do/)

  expect(within(todoColumnAfterRemount).getByText('Persisted card')).toBeVisible()
  expect(within(todoColumnAfterRemount).getByRole('heading', { level: 2 })).toHaveTextContent('To do (1)')
})

test('falls back to an empty board when localStorage holds corrupted JSON', () => {
  window.localStorage.setItem(STORAGE_KEY, '{not valid json')

  expect(() => {
    render(<KanbanPage />)
  }).not.toThrow()

  expect(getColumn(/^To do/).querySelector('h2')).toHaveTextContent('To do (0)')
  expect(getColumn(/^In progress/).querySelector('h2')).toHaveTextContent('In progress (0)')
  expect(getColumn(/^Done/).querySelector('h2')).toHaveTextContent('Done (0)')
})

test('falls back to an empty board when localStorage holds an unexpected shape', () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ todo: 'not an array' }))

  expect(() => {
    render(<KanbanPage />)
  }).not.toThrow()

  expect(getColumn(/^To do/).querySelector('h2')).toHaveTextContent('To do (0)')
})

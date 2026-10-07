import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App.tsx'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

test('lists every question on the home page', () => {
  renderApp()

  expect(screen.getByRole('heading', { name: 'Frontend Interview Prep — Set 2' })).toBeVisible()
  expect(screen.getByRole('link', { name: /Q1\s*Shopping Cart/ })).toBeVisible()
})

test('navigates to a question route', async () => {
  const user = userEvent.setup()
  renderApp()

  await user.click(screen.getByRole('link', { name: /Q3\s*Kanban Board/ }))

  expect(screen.getByRole('heading', { name: 'Kanban Board' })).toBeVisible()
})

test('shows a not-found page for an unknown route', () => {
  renderApp('/nope')

  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

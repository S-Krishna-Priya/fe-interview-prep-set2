import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardData } from './mockApi.ts'
import DashboardPage from './DashboardPage.tsx'

function makeData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    sales: 1234.5,
    activeUsers: [10, 20, 30],
    recentOrders: [
      { id: 'o1', customer: 'Ada Lovelace', amount: 42, placedAt: new Date().toISOString() },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('DashboardPage', () => {
  it('renders the sales, active-users and recent-orders widgets with live data', async () => {
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockResolvedValue(makeData())

    render(<DashboardPage fetcher={fetcher} intervalMs={5000} />)

    expect(await screen.findByText('$1,234.50')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Active users' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Recent orders' })).toBeVisible()
    expect(screen.getByText('Ada Lovelace')).toBeVisible()
  })

  it('hides and shows widgets, and the choice survives a remount', async () => {
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockResolvedValue(makeData())
    const user = userEvent.setup()

    const { unmount } = render(<DashboardPage fetcher={fetcher} intervalMs={5000} />)
    await screen.findByRole('region', { name: 'Sales' })

    await user.click(screen.getByRole('checkbox', { name: 'Sales' }))
    expect(screen.queryByRole('region', { name: 'Sales' })).not.toBeInTheDocument()

    unmount()

    render(<DashboardPage fetcher={fetcher} intervalMs={5000} />)
    await screen.findByRole('region', { name: 'Active users' })
    expect(screen.queryByRole('region', { name: 'Sales' })).not.toBeInTheDocument()
  })
})

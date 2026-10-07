import { ActiveUsersChart } from './ActiveUsersChart.tsx'
import { fetchDashboard } from './mockApi.ts'
import type { DashboardFetcher } from './useDashboardPolling.ts'
import { POLL_INTERVAL_MS, useDashboardPolling } from './useDashboardPolling.ts'
import { WIDGET_IDS, useWidgetVisibility } from './useWidgetVisibility.ts'
import type { WidgetId } from './useWidgetVisibility.ts'
import { RecentOrdersList } from './RecentOrdersList.tsx'
import { SalesWidget } from './SalesWidget.tsx'

const WIDGET_LABELS: Record<WidgetId, string> = {
  sales: 'Sales',
  activeUsers: 'Active users',
  recentOrders: 'Recent orders',
}

export type DashboardPageProps = {
  fetcher?: DashboardFetcher
  intervalMs?: number
}

export default function DashboardPage({
  fetcher = fetchDashboard,
  intervalMs = POLL_INTERVAL_MS,
}: DashboardPageProps = {}) {
  const { sales, activeUsers, recentOrders } = useDashboardPolling(fetcher, intervalMs)
  const { visibility, toggle } = useWidgetVisibility()

  return (
    <section>
      <h1 className="text-2xl font-semibold">Live Dashboard</h1>
      <p className="mt-2 text-slate-600">Data refreshes every 5 seconds while this tab is visible.</p>

      <fieldset className="mt-4 flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-slate-500">Widgets</legend>
        {WIDGET_IDS.map((id) => (
          <label key={id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={visibility[id]}
              onChange={() => {
                toggle(id)
              }}
            />
            {WIDGET_LABELS[id]}
          </label>
        ))}
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibility.sales && <SalesWidget sales={sales} />}
        {visibility.activeUsers && <ActiveUsersChart activeUsers={activeUsers} />}
        {visibility.recentOrders && <RecentOrdersList orders={recentOrders} />}
      </div>
    </section>
  )
}

import { memo } from 'react'
import { currencyFormatter } from './format.ts'
import type { Order } from './mockApi.ts'

export type RecentOrdersListProps = {
  orders: Order[]
}

function RecentOrdersListComponent({ orders }: RecentOrdersListProps) {
  return (
    <section
      aria-label="Recent orders"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-slate-500">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-slate-400">No orders yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-700">{order.customer}</span>
              <span className="text-slate-500">{currencyFormatter.format(order.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const RecentOrdersList = memo(RecentOrdersListComponent)

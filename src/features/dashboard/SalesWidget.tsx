import { memo } from 'react'
import { currencyFormatter } from './format.ts'

export type SalesWidgetProps = {
  sales: number | null
}

function SalesWidgetComponent({ sales }: SalesWidgetProps) {
  return (
    <section
      aria-label="Sales"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-slate-500">Sales</h2>
      <p className="mt-2 text-3xl font-semibold text-slate-900">
        {sales === null ? '—' : currencyFormatter.format(sales)}
      </p>
    </section>
  )
}

export const SalesWidget = memo(SalesWidgetComponent)

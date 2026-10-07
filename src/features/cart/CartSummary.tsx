import type { CartItem } from './types.ts'
import type { CartTotals } from './useCart.ts'
import { formatCents, toCents } from './money.ts'

interface CartSummaryProps {
  items: CartItem[]
  totals: CartTotals
  onSetQuantity: (productId: number, quantity: number) => void
  onRemove: (productId: number) => void
}

export default function CartSummary({ items, totals, onSetQuantity, onRemove }: CartSummaryProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-600">
        <p>Your cart is empty.</p>
        <p className="mt-1 text-sm text-slate-500">Add a product to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const atStockLimit = item.quantity >= item.product.stock
          const lineTotalCents = toCents(item.product.price) * item.quantity

          return (
            <li
              key={item.product.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.product.title}</p>
                  <p className="text-xs text-slate-500">
                    ${formatCents(toCents(item.product.price))} each
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${item.product.title} from cart`}
                  onClick={() => {
                    onRemove(item.product.id)
                  }}
                  className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${item.product.title}`}
                  onClick={() => {
                    onSetQuantity(item.product.id, item.quantity - 1)
                  }}
                  disabled={item.quantity <= 1}
                  className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span
                  aria-label={`Quantity for ${item.product.title}: ${String(item.quantity)}`}
                  className="w-6 text-center text-sm tabular-nums"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${item.product.title}`}
                  onClick={() => {
                    onSetQuantity(item.product.id, item.quantity + 1)
                  }}
                  disabled={atStockLimit}
                  className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
                <span className="text-xs text-slate-500">
                  {atStockLimit
                    ? `Maximum stock reached (${String(item.product.stock)})`
                    : `${String(item.product.stock)} in stock`}
                </span>
                <span className="ml-auto text-sm font-medium text-slate-900">
                  ${formatCents(lineTotalCents)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <dl className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Subtotal</dt>
          <dd data-testid="cart-subtotal" className="font-medium text-slate-900">
            ${formatCents(totals.subtotalCents)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Tax (18%)</dt>
          <dd data-testid="cart-tax" className="font-medium text-slate-900">
            ${formatCents(totals.taxCents)}
          </dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base">
          <dt className="font-semibold text-slate-900">Total</dt>
          <dd data-testid="cart-total" className="font-semibold text-slate-900">
            ${formatCents(totals.totalCents)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

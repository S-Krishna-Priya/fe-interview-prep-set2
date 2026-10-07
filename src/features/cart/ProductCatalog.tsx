import type { CartItem, Product } from './types.ts'
import type { ProductsState } from './useProducts.ts'
import { formatCents, toCents } from './money.ts'

interface ProductCatalogProps {
  state: ProductsState
  cartItems: CartItem[]
  onAdd: (product: Product) => void
}

export default function ProductCatalog({ state, cartItems, onAdd }: ProductCatalogProps) {
  if (state.status === 'loading') {
    return <p className="text-slate-600">Loading products…</p>
  }

  if (state.status === 'error') {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
        Could not load products: {state.message}
      </p>
    )
  }

  if (state.products.length === 0) {
    return <p className="text-slate-600">No products are available right now.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {state.products.map((product) => {
        const inCart = cartItems.find((item) => item.product.id === product.id)
        const atStockLimit = (inCart?.quantity ?? 0) >= product.stock

        return (
          <li
            key={product.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4"
          >
            <img
              src={product.thumbnail}
              alt=""
              className="h-32 w-full rounded-md object-contain"
            />
            <h3 className="text-sm font-medium text-slate-900">{product.title}</h3>
            <p className="text-sm text-slate-600">${formatCents(toCents(product.price))}</p>
            <p className="text-xs text-slate-500">
              {product.stock > 0 ? `${String(product.stock)} in stock` : 'Out of stock'}
            </p>
            <button
              type="button"
              onClick={() => {
                onAdd(product)
              }}
              disabled={product.stock === 0 || atStockLimit}
              className="mt-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {atStockLimit ? 'Max in cart' : 'Add to cart'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

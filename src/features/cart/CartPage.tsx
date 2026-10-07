import CartSummary from './CartSummary.tsx'
import ProductCatalog from './ProductCatalog.tsx'
import { useCart } from './useCart.ts'
import { useProducts } from './useProducts.ts'

export default function CartPage() {
  const productsState = useProducts()
  const { items, totals, addToCart, setQuantity, removeFromCart } = useCart()

  return (
    <section>
      <h1 className="text-2xl font-semibold">Shopping Cart</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-medium text-slate-900">Products</h2>
          <ProductCatalog state={productsState} cartItems={items} onAdd={addToCart} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium text-slate-900">Your cart</h2>
          <CartSummary
            items={items}
            totals={totals}
            onSetQuantity={setQuantity}
            onRemove={removeFromCart}
          />
        </div>
      </div>
    </section>
  )
}

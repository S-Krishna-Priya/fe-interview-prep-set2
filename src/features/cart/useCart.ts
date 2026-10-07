import { useCallback, useEffect, useMemo, useState } from 'react'
import { TAX_RATE, toCents } from './money.ts'
import { loadCart, saveCart } from './storage.ts'
import type { CartItem, Product } from './types.ts'

function clampQuantity(quantity: number, stock: number): number {
  return Math.min(Math.max(quantity, 1), stock)
}

export interface CartTotals {
  subtotalCents: number
  taxCents: number
  totalCents: number
}

export interface UseCartResult {
  items: CartItem[]
  totals: CartTotals
  addToCart: (product: Product) => void
  setQuantity: (productId: number, quantity: number) => void
  removeFromCart: (productId: number) => void
}

/**
 * Single source of truth for cart state. Subtotal, tax and total are always
 * derived from `items` on render (see `totals` below) rather than stored
 * separately, so they can never drift out of sync with the line items.
 */
export function useCart(): UseCartResult {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())

  useEffect(() => {
    saveCart(items)
  }, [items])

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return

    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        const nextQuantity = clampQuantity(existing.quantity + 1, product.stock)
        return current.map((item) =>
          item.product.id === product.id ? { product, quantity: nextQuantity } : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
  }, [])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: clampQuantity(quantity, item.product.stock) }
          : item,
      ),
    )
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setItems((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const totals = useMemo<CartTotals>(() => {
    const subtotalCents = items.reduce(
      (sum, item) => sum + toCents(item.product.price) * item.quantity,
      0,
    )
    const taxCents = Math.round(subtotalCents * TAX_RATE)
    const totalCents = subtotalCents + taxCents
    return { subtotalCents, taxCents, totalCents }
  }, [items])

  return { items, totals, addToCart, setQuantity, removeFromCart }
}

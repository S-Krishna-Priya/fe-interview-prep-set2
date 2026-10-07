import type { CartItem, Product } from './types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    typeof value.thumbnail === 'string' &&
    typeof value.stock === 'number' &&
    Number.isFinite(value.stock)
  )
}

export function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false

  return (
    isProduct(value.product) &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0
  )
}

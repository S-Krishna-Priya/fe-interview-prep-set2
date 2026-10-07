import { isCartItem } from './validation.ts'
import type { CartItem } from './types.ts'

export const CART_STORAGE_KEY = 'q1-cart'

/**
 * Reads the persisted cart from localStorage.
 *
 * The stored value may be absent, hand-edited, or written by an older,
 * incompatible version of this app — so the parsed JSON is never trusted
 * blindly. Anything that doesn't look like a valid cart item is dropped
 * rather than allowed to crash the app.
 */
export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (raw === null) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage can be unavailable (private browsing, quota exceeded, etc).
    // Losing persistence is acceptable; crashing the app is not.
  }
}

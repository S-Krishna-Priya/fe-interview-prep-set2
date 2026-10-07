/**
 * All money math happens in integer cents so totals never drift from
 * floating-point rounding, and `subtotal + tax` always equals `total` as
 * displayed.
 */
export const TAX_RATE = 0.18

export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

import { useEffect, useState } from 'react'
import { isProduct } from './validation.ts'
import type { Product } from './types.ts'

const PRODUCTS_URL = 'https://dummyjson.com/products?limit=100'

export type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; products: Product[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Shapes the dummyjson response into our own `Product` type, dropping any
 * entry that doesn't match it rather than trusting the API response as-is.
 */
function parseProducts(data: unknown): Product[] {
  if (!isRecord(data) || !Array.isArray(data.products)) {
    throw new Error('Unexpected response shape from the products API')
  }

  return data.products.filter(isProduct)
}

/**
 * Fetches the product catalog. The request is cancelled on unmount (or on a
 * re-run) via AbortController, and state is never set once the component
 * requesting it has gone away.
 */
export function useProducts(): ProductsState {
  const [state, setState] = useState<ProductsState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch(PRODUCTS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${String(response.status)}`)
        }
        return response.json() as Promise<unknown>
      })
      .then((data) => {
        setState({ status: 'success', products: parseProducts(data) })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Failed to load products'
        setState({ status: 'error', message })
      })

    return () => {
      controller.abort()
    }
  }, [])

  return state
}

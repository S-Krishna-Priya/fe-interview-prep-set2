import { useEffect, useRef, useState } from 'react'
import { fetchDashboard } from './mockApi.ts'
import type { DashboardData, FetchDashboardOptions, Order } from './mockApi.ts'

export const POLL_INTERVAL_MS = 5000

export type DashboardSlices = {
  sales: number | null
  activeUsers: number[]
  recentOrders: Order[]
}

export type DashboardFetcher = (options?: FetchDashboardOptions) => Promise<DashboardData>

const INITIAL_SLICES: DashboardSlices = { sales: null, activeUsers: [], recentOrders: [] }

/**
 * Polls the dashboard API on a fixed interval, pausing while the tab is
 * hidden and resuming (with an immediate refetch) when it becomes visible
 * again.
 *
 * Why not a bare `setInterval`: with a plain interval, a slow response can
 * still be in flight when the next tick fires, so requests start overlapping
 * and can pile up indefinitely. Instead each cycle schedules its own
 * `setTimeout` only once the current request has settled (success or
 * failure), so there is at most one request in flight for the periodic poll.
 *
 * A second request can still be started early by a visibility resume (to
 * refresh promptly after the tab comes back), which is why every response
 * carries a monotonically increasing request id: a response is only applied
 * if it is still the most recently issued request, so a slow, late response
 * can never clobber newer data already on screen.
 */
export function useDashboardPolling(
  fetcher: DashboardFetcher = fetchDashboard,
  intervalMs: number = POLL_INTERVAL_MS,
): DashboardSlices {
  const [slices, setSlices] = useState<DashboardSlices>(INITIAL_SLICES)

  const fetcherRef = useRef(fetcher)
  const intervalRef = useRef(intervalMs)

  // Refs are read from inside async callbacks below, so they must only be
  // written from an effect (never during render).
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])
  useEffect(() => {
    intervalRef.current = intervalMs
  }, [intervalMs])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let requestId = 0
    const lastSerialized = { sales: '', activeUsers: '', recentOrders: '' }
    let hasUnmounted = false
    // Read through a function (rather than the closured boolean directly) so
    // a check placed after an `await` isn't narrowed away by control-flow
    // analysis as "always false" even though cleanup can flip it meanwhile.
    const isUnmounted = () => hasUnmounted

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }

    // Replace a slice's reference only when its serialised value actually
    // differs from what is already on screen. Widgets receive their own
    // slice through React.memo, so an unchanged reference means an unchanged
    // widget skips its re-render even though a sibling slice just updated.
    const applyResult = (result: DashboardData) => {
      setSlices((prev) => {
        let changed = false
        const next: DashboardSlices = { ...prev }

        const serializedSales = String(result.sales)
        if (serializedSales !== lastSerialized.sales) {
          lastSerialized.sales = serializedSales
          next.sales = result.sales
          changed = true
        }

        const serializedActiveUsers = JSON.stringify(result.activeUsers)
        if (serializedActiveUsers !== lastSerialized.activeUsers) {
          lastSerialized.activeUsers = serializedActiveUsers
          next.activeUsers = result.activeUsers
          changed = true
        }

        const serializedOrders = JSON.stringify(result.recentOrders)
        if (serializedOrders !== lastSerialized.recentOrders) {
          lastSerialized.recentOrders = serializedOrders
          next.recentOrders = result.recentOrders
          changed = true
        }

        return changed ? next : prev
      })
    }

    const scheduleNext = () => {
      clearTimer()
      if (isUnmounted() || document.hidden) return
      timer = setTimeout(() => {
        void runFetch()
      }, intervalRef.current)
    }

    const runFetch = async () => {
      if (isUnmounted()) return
      requestId += 1
      const id = requestId
      try {
        const result = await fetcherRef.current()
        if (isUnmounted() || id !== requestId) return
        applyResult(result)
      } catch {
        // Ignore fetch failures (including aborts); the next poll retries.
      } finally {
        if (!isUnmounted()) scheduleNext()
      }
    }

    const handleVisibilityChange = () => {
      clearTimer()
      if (!document.hidden) {
        void runFetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    void runFetch()

    return () => {
      hasUnmounted = true
      clearTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return slices
}

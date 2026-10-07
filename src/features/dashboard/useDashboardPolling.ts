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
 * failure), so the periodic poll by itself never has more than one request
 * in flight.
 *
 * A visibility resume is the one case that can interrupt an in-flight
 * request early (to refresh promptly as soon as the tab comes back): it
 * aborts whatever request is still outstanding via the fetcher's
 * `AbortSignal` and immediately starts a new one, so the superseded request
 * is being cancelled rather than left running concurrently. Every request
 * also carries a monotonically increasing id: a response — or a superseded
 * request's own rejection — is only applied, and only allowed to reschedule
 * the next poll, when it is still the most recently issued request. That
 * guards two things: a slow, late response can never clobber newer data
 * already on screen, and a superseded request settling late can never push
 * the next poll's countdown further out.
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
    let currentController: AbortController | null = null
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
      const controller = new AbortController()
      currentController = controller
      try {
        const result = await fetcherRef.current({ signal: controller.signal })
        if (isUnmounted() || id !== requestId) return
        applyResult(result)
      } catch {
        // Ignore fetch failures, including the rejection a superseded
        // request gets from being aborted below; whichever request is still
        // current is the only one allowed to reschedule (see finally).
      } finally {
        // Only the request that is still current may reschedule the next
        // poll — a superseded request settling late must not reset the
        // countdown a second time.
        if (!isUnmounted() && id === requestId) scheduleNext()
      }
    }

    const handleVisibilityChange = () => {
      clearTimer()
      if (!document.hidden) {
        // Cancel whatever request is still outstanding before starting a
        // fresh one, so a resume can never leave two requests genuinely
        // running concurrently.
        currentController?.abort()
        void runFetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    void runFetch()

    return () => {
      hasUnmounted = true
      clearTimer()
      currentController?.abort()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return slices
}

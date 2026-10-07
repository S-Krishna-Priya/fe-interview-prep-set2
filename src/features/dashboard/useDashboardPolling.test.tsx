import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardData, FetchDashboardOptions } from './mockApi.ts'
import { useDashboardPolling } from './useDashboardPolling.ts'

function makeData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    sales: 100,
    activeUsers: [1, 2, 3],
    recentOrders: [],
    ...overrides,
  }
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useDashboardPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches on mount and refreshes every 5 seconds', async () => {
    const fetcher = vi
      .fn<() => Promise<DashboardData>>()
      .mockResolvedValueOnce(makeData({ sales: 1 }))
      .mockResolvedValueOnce(makeData({ sales: 2 }))

    const { result } = renderHook(() => useDashboardPolling(fetcher, 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.sales).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(result.current.sales).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('stops polling while the tab is hidden and resumes once visible again', async () => {
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockResolvedValue(makeData())
    renderHook(() => useDashboardPolling(fetcher, 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    act(() => {
      setHidden(true)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => {
      setHidden(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('never has more than one request in flight when the API is slow', async () => {
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockImplementation(
      () => new Promise<DashboardData>(() => undefined),
    )

    renderHook(() => useDashboardPolling(fetcher, 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // The in-flight request above never resolves, so no further poll should
    // ever be scheduled even across many intervals.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does not let a stale, late response overwrite newer data', async () => {
    let resolveFirst: ((data: DashboardData) => void) | undefined
    let callCount = 0
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockImplementation(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise<DashboardData>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve(makeData({ sales: 2 }))
    })

    const { result } = renderHook(() => useDashboardPolling(fetcher, 5000))

    // The mount-triggered first request is now in flight and slow.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.sales).toBeNull()

    // A visibility resume issues a second, newer request that resolves fast.
    await act(async () => {
      setHidden(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.sales).toBe(2)

    // The slow first request finally resolves; it must be dropped as stale.
    await act(async () => {
      resolveFirst?.(makeData({ sales: 1 }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.sales).toBe(2)
  })

  it('aborts an outstanding request instead of letting it run concurrently when a resume races it', async () => {
    const signals: AbortSignal[] = []
    let callCount = 0
    const fetcher = vi
      .fn<(options?: FetchDashboardOptions) => Promise<DashboardData>>()
      .mockImplementation((options) => {
        callCount += 1
        if (options?.signal) signals.push(options.signal)
        if (callCount === 1) {
          // Never settles on its own; only an abort can end it.
          return new Promise<DashboardData>(() => undefined)
        }
        return Promise.resolve(makeData({ sales: 2 }))
      })

    const { result } = renderHook(() => useDashboardPolling(fetcher, 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(signals[0]?.aborted).toBe(false)

    // A resume races the still-pending first request.
    await act(async () => {
      setHidden(false)
      await vi.advanceTimersByTimeAsync(0)
    })

    // The first request was cancelled rather than left running alongside the
    // second: only one request is ever truly in flight.
    expect(signals[0]?.aborted).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.sales).toBe(2)
  })

  it('does not let a superseded request reschedule the next poll', async () => {
    let resolveFirst: ((data: DashboardData) => void) | undefined
    let callCount = 0
    const fetcher = vi
      .fn<(options?: FetchDashboardOptions) => Promise<DashboardData>>()
      .mockImplementation(() => {
        callCount += 1
        if (callCount === 1) {
          return new Promise<DashboardData>((resolve) => {
            resolveFirst = resolve
          })
        }
        if (callCount === 2) return Promise.resolve(makeData({ sales: 2 }))
        return Promise.resolve(makeData({ sales: 3 }))
      })

    renderHook(() => useDashboardPolling(fetcher, 5000))

    // Request 1 (mount) is slow and still pending.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    // Request 2 (resume) supersedes it and resolves immediately, scheduling
    // the next poll for 5s from this point.
    await act(async () => {
      setHidden(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)

    // Some time passes, then the stale request 1 finally settles late.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
      resolveFirst?.(makeData({ sales: 1 }))
      await vi.advanceTimersByTimeAsync(0)
    })
    // It must not have reset the countdown: still no third request yet.
    expect(fetcher).toHaveBeenCalledTimes(2)

    // Advancing the remaining 3s (5s total since request 2 resolved) should
    // trigger the next poll right on schedule, not later.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('clears the timer and removes the visibilitychange listener on unmount', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockResolvedValue(makeData())

    const { unmount } = renderHook(() => useDashboardPolling(fetcher, 5000))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    const registeredHandler = addSpy.mock.calls.find(([event]) => event === 'visibilitychange')?.[1]
    expect(registeredHandler).toBeDefined()

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', registeredHandler)

    const callsSoFar = fetcher.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    expect(fetcher).toHaveBeenCalledTimes(callsSoFar)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('keeps a slice reference stable across polls when its value is unchanged', async () => {
    const sameOrders = [
      { id: 'o1', customer: 'Ada Lovelace', amount: 42, placedAt: '2024-01-01T00:00:00.000Z' },
    ]
    const fetcher = vi
      .fn<() => Promise<DashboardData>>()
      .mockResolvedValueOnce(makeData({ sales: 1, recentOrders: sameOrders }))
      // A fresh array instance with identical content: only `sales` actually changed.
      .mockResolvedValueOnce(makeData({ sales: 2, recentOrders: [...sameOrders] }))

    const { result } = renderHook(() => useDashboardPolling(fetcher, 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const ordersAfterFirstPoll = result.current.recentOrders

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(result.current.sales).toBe(2)
    // Widgets receive their own slice via React.memo; an unchanged reference
    // here means the recent-orders widget would skip its re-render even
    // though the sales widget just updated.
    expect(result.current.recentOrders).toBe(ordersAfterFirstPoll)
  })

  it('still applies every poll when React double-invokes the state updater', async () => {
    // StrictMode calls a state updater twice to surface impure updaters.
    // The bookkeeping that decides which slices changed must therefore live
    // outside the updater: when it lived inside, the second invocation saw
    // the first one's bookkeeping, concluded nothing had changed and
    // returned the previous state — so every poll's data was discarded and
    // the dashboard refreshed at half the configured rate.
    // StrictMode also mounts the effect twice, so the first request is
    // aborted and re-issued; a counter rather than a fixed queue keeps the
    // test about the refresh rate instead of about which mock came back.
    let call = 0
    const fetcher = vi.fn<() => Promise<DashboardData>>().mockImplementation(() => {
      call += 1
      return Promise.resolve(makeData({ sales: call }))
    })

    const { result } = renderHook(() => useDashboardPolling(fetcher, 5000), {
      wrapper: StrictMode,
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const afterMount = result.current.sales
    expect(afterMount).not.toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    const afterFirstPoll = result.current.sales
    // The bug: this poll's response was fetched but its state update was
    // discarded, so the value stayed put for a second interval.
    expect(afterFirstPoll).not.toBe(afterMount)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(result.current.sales).not.toBe(afterFirstPoll)

    // One request per interval, and every one of them reached the screen.
    expect(result.current.sales).toBe(fetcher.mock.calls.length)
  })
})

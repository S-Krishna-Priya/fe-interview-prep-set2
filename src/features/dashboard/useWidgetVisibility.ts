import { useCallback, useEffect, useState } from 'react'

export type WidgetId = 'sales' | 'activeUsers' | 'recentOrders'
export type WidgetVisibility = Record<WidgetId, boolean>

export const WIDGET_IDS: WidgetId[] = ['sales', 'activeUsers', 'recentOrders']

const STORAGE_KEY = 'dashboard:widget-visibility'

const DEFAULT_VISIBILITY: WidgetVisibility = {
  sales: true,
  activeUsers: true,
  recentOrders: true,
}

function isWidgetVisibility(value: unknown): value is WidgetVisibility {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return WIDGET_IDS.every((id) => typeof record[id] === 'boolean')
}

function readStoredVisibility(): WidgetVisibility {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_VISIBILITY

    const parsed: unknown = JSON.parse(raw)
    return isWidgetVisibility(parsed) ? parsed : DEFAULT_VISIBILITY
  } catch {
    // Corrupted JSON, or localStorage unavailable (private mode, quota, ...):
    // fall back to showing everything rather than crashing the dashboard.
    return DEFAULT_VISIBILITY
  }
}

/** Widget show/hide state, persisted to localStorage so it survives a refresh. */
export function useWidgetVisibility(): {
  visibility: WidgetVisibility
  toggle: (id: WidgetId) => void
} {
  const [visibility, setVisibility] = useState<WidgetVisibility>(() => readStoredVisibility())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
    } catch {
      // Persistence is a nice-to-have; ignore storage failures.
    }
  }, [visibility])

  const toggle = useCallback((id: WidgetId) => {
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  return { visibility, toggle }
}

import { act } from '@testing-library/react'

/**
 * Flips `navigator.onLine` and dispatches the matching window event, the way
 * a real browser would when connectivity changes. Wrapped in `act` so the
 * resulting state updates are flushed before the caller continues.
 */
export function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

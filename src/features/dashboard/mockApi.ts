/**
 * A local stand-in for a sales/analytics API. Every call returns freshly
 * randomised numbers so the dashboard has something new to show on each
 * poll. The artificial delay is injectable so tests can simulate a slow
 * network without touching real timers.
 */

export type Order = {
  id: string
  customer: string
  amount: number
  placedAt: string
}

export type DashboardData = {
  sales: number
  activeUsers: number[]
  recentOrders: Order[]
}

export type FetchDashboardOptions = {
  delayMs?: number
  signal?: AbortSignal
}

const CUSTOMER_NAMES = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Margaret Hamilton',
  'Linus Torvalds',
  'Barbara Liskov',
  'Dennis Ritchie',
  'Radia Perlman',
]

const DEFAULT_DELAY_MS = 300
const ACTIVE_USER_SAMPLE_COUNT = 12
const RECENT_ORDER_COUNT = 5

let orderSequence = 0

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomCustomer(): string {
  const index = randomInt(0, CUSTOMER_NAMES.length - 1)
  return CUSTOMER_NAMES[index] ?? 'Anonymous'
}

function createOrder(): Order {
  orderSequence += 1
  return {
    id: `order-${String(orderSequence)}`,
    customer: randomCustomer(),
    amount: randomInt(1_000, 50_000) / 100,
    placedAt: new Date().toISOString(),
  }
}

function createDashboardData(): DashboardData {
  return {
    sales: randomInt(10_000, 250_000) / 100,
    activeUsers: Array.from({ length: ACTIVE_USER_SAMPLE_COUNT }, () => randomInt(20, 500)),
    recentOrders: Array.from({ length: RECENT_ORDER_COUNT }, () => createOrder()),
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(resolve, ms)

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function fetchDashboard(options: FetchDashboardOptions = {}): Promise<DashboardData> {
  const { delayMs = DEFAULT_DELAY_MS, signal } = options
  await wait(delayMs, signal)
  return createDashboardData()
}

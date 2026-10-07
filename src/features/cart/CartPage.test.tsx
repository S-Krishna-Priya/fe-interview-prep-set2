import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import CartPage from './CartPage.tsx'
import { CART_STORAGE_KEY } from './storage.ts'
import type { Product } from './types.ts'

function stubFetchSuccess(products: Product[]): void {
  vi.stubGlobal(
    'fetch',
    (): Promise<Response> =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ products }),
      } as unknown as Response),
  )
}

function stubFetchFailure(message: string): void {
  vi.stubGlobal('fetch', (): Promise<Response> => Promise.reject(new Error(message)))
}

const mouse: Product = {
  id: 1,
  title: 'Wireless Mouse',
  price: 9.99,
  thumbnail: 'mouse.png',
  stock: 5,
}

const limitedStockPen: Product = {
  id: 2,
  title: 'Limited Pen',
  price: 2.5,
  thumbnail: 'pen.png',
  stock: 2,
}

beforeEach(() => {
  window.localStorage.clear()
  stubFetchSuccess([mouse, limitedStockPen])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('adding a product puts it in the cart', async () => {
  const user = userEvent.setup()
  render(<CartPage />)

  const productItem = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText('Wireless Mouse'),
  )
  if (!productItem) throw new Error('product card not found')

  expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()

  await user.click(within(productItem).getByRole('button', { name: 'Add to cart' }))

  expect(screen.queryByText('Your cart is empty.')).not.toBeInTheDocument()
  expect(
    screen.getByLabelText('Quantity for Wireless Mouse: 1', { selector: 'span' }),
  ).toBeInTheDocument()
})

test('changing quantity updates the subtotal, tax and total immediately', async () => {
  const user = userEvent.setup()
  render(<CartPage />)

  const productItem = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText('Wireless Mouse'),
  )
  if (!productItem) throw new Error('product card not found')
  await user.click(within(productItem).getByRole('button', { name: 'Add to cart' }))

  expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$9.99')
  expect(screen.getByTestId('cart-tax')).toHaveTextContent('$1.80')
  expect(screen.getByTestId('cart-total')).toHaveTextContent('$11.79')

  const increaseButton = screen.getByRole('button', { name: 'Increase quantity of Wireless Mouse' })
  await user.click(increaseButton)
  await user.click(increaseButton)

  // quantity is now 3: subtotal 29.97, tax 5.39, total 35.36
  expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$29.97')
  expect(screen.getByTestId('cart-tax')).toHaveTextContent('$5.39')
  expect(screen.getByTestId('cart-total')).toHaveTextContent('$35.36')
})

test('quantity cannot exceed the product stock', async () => {
  const user = userEvent.setup()
  render(<CartPage />)

  const productItem = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText('Limited Pen'),
  )
  if (!productItem) throw new Error('product card not found')
  await user.click(within(productItem).getByRole('button', { name: 'Add to cart' }))

  const increaseButton = screen.getByRole('button', { name: 'Increase quantity of Limited Pen' })
  await user.click(increaseButton) // quantity now 2, equal to stock

  expect(
    screen.getByLabelText('Quantity for Limited Pen: 2', { selector: 'span' }),
  ).toBeInTheDocument()
  expect(increaseButton).toBeDisabled()
  expect(screen.getByText('Maximum stock reached (2)')).toBeInTheDocument()

  await user.click(increaseButton)
  expect(
    screen.getByLabelText('Quantity for Limited Pen: 2', { selector: 'span' }),
  ).toBeInTheDocument()
})

test('totals are calculated correctly to 2 decimals', async () => {
  const user = userEvent.setup()
  render(<CartPage />)

  const productItem = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText('Wireless Mouse'),
  )
  if (!productItem) throw new Error('product card not found')
  await user.click(within(productItem).getByRole('button', { name: 'Add to cart' }))

  const increaseButton = screen.getByRole('button', { name: 'Increase quantity of Wireless Mouse' })
  await user.click(increaseButton)
  await user.click(increaseButton)

  // 3 x $9.99 = $29.97 subtotal, 18% tax = $5.3946 -> $5.39, total = $35.36
  expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$29.97')
  expect(screen.getByTestId('cart-tax')).toHaveTextContent('$5.39')
  expect(screen.getByTestId('cart-total')).toHaveTextContent('$35.36')
})

test('the cart persists across a remount', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<CartPage />)

  const productItem = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText('Wireless Mouse'),
  )
  if (!productItem) throw new Error('product card not found')
  await user.click(within(productItem).getByRole('button', { name: 'Add to cart' }))
  await user.click(screen.getByRole('button', { name: 'Increase quantity of Wireless Mouse' }))

  await waitFor(() => {
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain('Wireless Mouse')
  })

  unmount()

  render(<CartPage />)

  expect(
    screen.getByLabelText('Quantity for Wireless Mouse: 2', { selector: 'span' }),
  ).toBeInTheDocument()
})

test('corrupted localStorage does not crash the app and falls back to an empty cart', () => {
  window.localStorage.setItem(CART_STORAGE_KEY, '{not valid json')

  render(<CartPage />)

  expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument()
  expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
})

test('shows an error state when the product fetch fails', async () => {
  stubFetchFailure('network down')

  render(<CartPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('network down')
})

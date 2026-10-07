export interface Product {
  id: number
  title: string
  price: number
  thumbnail: string
  stock: number
}

export interface CartItem {
  product: Product
  quantity: number
}

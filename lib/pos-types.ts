export interface Product {
  id: string
  name: string
  price: number
  unit: "kg" | "unidad"
  emoji: string
}

export interface LineItem {
  id: string
  product: Product
  quantity: number
  unitPrice: number
  tare: number
  netWeight: number
  total: number
}

export interface EntryFormData {
  product: Product | null
  quantity: string
  unitPrice: string
  tare: string
}

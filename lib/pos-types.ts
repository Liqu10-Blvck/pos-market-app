export interface Product {
  id: string
  name: string
  price: number
  unit: "kg" | "unidad"
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

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cashier"
}

export interface CashCount {
  bills: Record<number, number>
  coins: Record<number, number>
  total: number
}

export interface DailySummary {
  totalSales: number
  transactionCount: number
  averageTicket: number
}

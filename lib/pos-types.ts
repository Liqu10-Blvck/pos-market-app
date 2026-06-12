export interface Product {
  id: string
  name: string
  price: number
  unit: "kg" | "unidad"
  image: string
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
  role: "admin" | "cajero" | "vendedor"
  tenantId: string
  sucursalesIds: string[] // Sucursales a las que tiene acceso el usuario
  avatar: string
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

"use client"

import { useState, useCallback } from "react"
import { ProductGrid } from "@/components/pos/product-grid"
import { EntryForm } from "@/components/pos/entry-form"
import { TransactionList } from "@/components/pos/transaction-list"
import { ActionButtons } from "@/components/pos/action-buttons"
import { TotalDisplay } from "@/components/pos/total-display"
import type { Product, LineItem, EntryFormData } from "@/lib/pos-types"

const PRODUCTS: Product[] = [
  { id: "1", name: "Palta Importada", price: 8500, unit: "kg", emoji: "🥑" },
  { id: "2", name: "Palta Nacional", price: 6500, unit: "kg", emoji: "🥑" },
  { id: "3", name: "Mango", price: 4500, unit: "kg", emoji: "🥭" },
  { id: "4", name: "Banano", price: 2800, unit: "kg", emoji: "🍌" },
  { id: "5", name: "Manzana", price: 3200, unit: "kg", emoji: "🍎" },
  { id: "6", name: "Piña", price: 3800, unit: "unidad", emoji: "🍍" },
]

export default function POSPage() {
  const [currentTicket, setCurrentTicket] = useState<LineItem[]>([])
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [formData, setFormData] = useState<EntryFormData>({
    product: null,
    quantity: "",
    unitPrice: "",
    tare: "0",
  })

  const grandTotal = currentTicket.reduce((sum, item) => sum + item.total, 0)

  const handleProductSelect = useCallback((product: Product) => {
    setFormData({
      product,
      quantity: "",
      unitPrice: product.price.toString(),
      tare: "0",
    })
  }, [])

  const handleFormChange = useCallback((data: Partial<EntryFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  const handleAddProduct = useCallback(() => {
    if (!formData.product) return

    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unitPrice) || 0
    const tare = parseFloat(formData.tare) || 0

    if (quantity <= 0) return

    const netWeight = Math.max(0, quantity - tare)
    const total = netWeight * unitPrice

    const newItem: LineItem = {
      id: Date.now().toString(),
      product: formData.product,
      quantity,
      unitPrice,
      tare,
      netWeight,
      total,
    }

    setCurrentTicket((prev) => [...prev, newItem])
    setFormData({
      product: null,
      quantity: "",
      unitPrice: "",
      tare: "0",
    })
  }, [formData])

  const handleDeleteLine = useCallback(() => {
    if (!selectedLineId) return
    setCurrentTicket((prev) => prev.filter((item) => item.id !== selectedLineId))
    setSelectedLineId(null)
  }, [selectedLineId])

  const handlePrintReceipt = useCallback(() => {
    if (currentTicket.length === 0) return
    alert("Imprimiendo vale...")
  }, [currentTicket])

  const handlePayment = useCallback(() => {
    if (currentTicket.length === 0) return
    alert(`Total a pagar: $${grandTotal.toLocaleString("es-CL")}`)
    setCurrentTicket([])
    setSelectedLineId(null)
  }, [currentTicket, grandTotal])

  const handleCashCount = useCallback(() => {
    alert("Abriendo arqueo de caja...")
  }, [])

  const handleReports = useCallback(() => {
    alert("Abriendo informes...")
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-3 lg:p-4">
        {/* Header */}
        <header className="mb-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <h1 className="text-lg font-bold tracking-tight lg:text-xl">FrutaPOS</h1>
          </div>
          <TotalDisplay total={grandTotal} />
        </header>

        {/* Main Content */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Column - Products & Form */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <ProductGrid
              products={PRODUCTS}
              onProductSelect={handleProductSelect}
              selectedProduct={formData.product}
            />
            <EntryForm
              formData={formData}
              onFormChange={handleFormChange}
              onAddProduct={handleAddProduct}
            />
          </div>

          {/* Right Column - Transaction List */}
          <div className="lg:col-span-5">
            <TransactionList
              items={currentTicket}
              selectedId={selectedLineId}
              onSelectItem={setSelectedLineId}
              grandTotal={grandTotal}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <ActionButtons
          onPrint={handlePrintReceipt}
          onDelete={handleDeleteLine}
          onPay={handlePayment}
          onCashCount={handleCashCount}
          onReports={handleReports}
          hasSelection={!!selectedLineId}
          hasItems={currentTicket.length > 0}
        />
      </div>
    </main>
  )
}

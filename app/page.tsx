"use client"

import { useState, useCallback } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginScreen } from "@/components/pos/login-screen"
import { POSSidebar } from "@/components/pos/pos-sidebar"
import { ProductGrid } from "@/components/pos/product-grid"
import { EntryForm } from "@/components/pos/entry-form"
import { TransactionList } from "@/components/pos/transaction-list"
import { ActionButtons } from "@/components/pos/action-buttons"
import { CashCountDialog } from "@/components/pos/cash-count-dialog"
import { ReportsDialog } from "@/components/pos/reports-dialog"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { Product, LineItem, EntryFormData } from "@/lib/pos-types"

const PRODUCTS: Product[] = [
  { id: "1", name: "Palta Importada", price: 8500, unit: "kg", image: "/products/palta.jpg" },
  { id: "2", name: "Palta Nacional", price: 6500, unit: "kg", image: "/products/palta.jpg" },
  { id: "3", name: "Mango", price: 4500, unit: "kg", image: "/products/mango.jpg" },
  { id: "4", name: "Banano", price: 2800, unit: "kg", image: "/products/banano.jpg" },
  { id: "5", name: "Manzana", price: 3200, unit: "kg", image: "/products/manzana.jpg" },
  { id: "6", name: "Pina", price: 2200, unit: "unidad", image: "/products/pina.jpg" },
  { id: "7", name: "Tomate", price: 3800, unit: "kg", image: "/products/tomate.jpg" },
]

function POSContent() {
  const { isAuthenticated } = useAuth()
  const [activeView, setActiveView] = useState("pos")
  const [currentTicket, setCurrentTicket] = useState<LineItem[]>([])
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [formData, setFormData] = useState<EntryFormData>({
    product: null,
    quantity: "",
    unitPrice: "",
    tare: "0",
  })

  const [cashCountOpen, setCashCountOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [completedSales, setCompletedSales] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

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

  const handleDeleteItem = useCallback((id: string) => {
    setCurrentTicket((prev) => prev.filter((item) => item.id !== id))
    if (selectedLineId === id) {
      setSelectedLineId(null)
    }
  }, [selectedLineId])

  const handlePrintReceipt = useCallback(() => {
    if (currentTicket.length === 0) return
    window.print()
  }, [currentTicket])

  const handlePayment = useCallback(() => {
    if (currentTicket.length === 0) return
    setPaymentOpen(true)
  }, [currentTicket])

  const handlePaymentConfirm = useCallback(() => {
    setCompletedSales((prev) => prev + grandTotal)
    setCompletedCount((prev) => prev + 1)
    setCurrentTicket([])
    setSelectedLineId(null)
    setFormData({
      product: null,
      quantity: "",
      unitPrice: "",
      tare: "0",
    })
  }, [grandTotal])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <SidebarProvider>
      <POSSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onCashCount={() => setCashCountOpen(true)}
        onReports={() => setReportsOpen(true)}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Punto de Venta</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total turno</p>
            <p className="text-sm font-semibold tabular-nums">
              ${completedSales.toLocaleString("es-CL")}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 lg:grid-cols-12">
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

              <div className="flex flex-col gap-4 lg:col-span-5">
                <TransactionList
                  items={currentTicket}
                  selectedId={selectedLineId}
                  onSelectItem={setSelectedLineId}
                  onDeleteItem={handleDeleteItem}
                  grandTotal={grandTotal}
                />
                <ActionButtons
                  onPrint={handlePrintReceipt}
                  onPay={handlePayment}
                  hasItems={currentTicket.length > 0}
                  grandTotal={grandTotal}
                />
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>

      <CashCountDialog open={cashCountOpen} onOpenChange={setCashCountOpen} />
      <ReportsDialog
        open={reportsOpen}
        onOpenChange={setReportsOpen}
        totalSales={completedSales}
        transactionCount={completedCount}
      />
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={grandTotal}
        onConfirm={handlePaymentConfirm}
      />
    </SidebarProvider>
  )
}

export default function POSPage() {
  return (
    <AuthProvider>
      <POSContent />
    </AuthProvider>
  )
}

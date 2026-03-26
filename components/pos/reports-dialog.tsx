"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BarChart3, TrendingUp, ShoppingCart, DollarSign } from "lucide-react"

interface ReportsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalSales: number
  transactionCount: number
}

export function ReportsDialog({
  open,
  onOpenChange,
  totalSales,
  transactionCount,
}: ReportsDialogProps) {
  const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0

  const stats = [
    {
      label: "Ventas del turno",
      value: `$${totalSales.toLocaleString("es-CL")}`,
      icon: DollarSign,
    },
    {
      label: "Transacciones",
      value: transactionCount.toString(),
      icon: ShoppingCart,
    },
    {
      label: "Ticket promedio",
      value: `$${Math.round(averageTicket).toLocaleString("es-CL")}`,
      icon: TrendingUp,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Informes del turno
          </DialogTitle>
          <DialogDescription>Resumen de ventas del turno actual</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-lg font-semibold tabular-nums">{stat.value}</span>
              </div>
            )
          })}
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Datos del turno actual
        </p>
      </DialogContent>
    </Dialog>
  )
}

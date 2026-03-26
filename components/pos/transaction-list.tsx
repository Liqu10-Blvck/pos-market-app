"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LineItem } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"

interface TransactionListProps {
  items: LineItem[]
  selectedId: string | null
  onSelectItem: (id: string | null) => void
  grandTotal: number
}

export function TransactionList({ items, selectedId, onSelectItem, grandTotal }: TransactionListProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-none pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="text-card-foreground">Ticket Actual</span>
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <ScrollArea className="flex-1 rounded-lg border bg-muted/30" style={{ minHeight: "200px", maxHeight: "300px" }}>
          {items.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay productos</p>
            </div>
          ) : (
            <div className="p-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(selectedId === item.id ? null : item.id)}
                  className={cn(
                    "mb-1 w-full rounded-md p-2 text-left transition-colors last:mb-0",
                    "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    selectedId === item.id
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{item.product.emoji}</span>
                        <span className="truncate text-sm font-medium text-card-foreground">
                          {item.product.name}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.netWeight.toFixed(2)} {item.product.unit} × $
                        {item.unitPrice.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-bold text-primary">
                      ${item.total.toLocaleString("es-CL")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            Total Venta del Turno
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            ${grandTotal.toLocaleString("es-CL")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import type { LineItem } from "@/lib/pos-types"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TransactionListProps {
  items: LineItem[]
  selectedId: string | null
  onSelectItem: (id: string | null) => void
  onDeleteItem: (id: string) => void
  grandTotal: number
}

export function TransactionList({
  items,
  selectedId,
  onSelectItem,
  onDeleteItem,
  grandTotal,
}: TransactionListProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ticket actual</h2>
        <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Sin productos
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(selectedId === item.id ? null : item.id)}
                  className={cn(
                    "group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors",
                    selectedId === item.id
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}.</span>
                      <span className="truncate text-sm font-medium">{item.product.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.netWeight.toFixed(2)} {item.product.unit} x ${item.unitPrice.toLocaleString("es-CL")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      ${item.total.toLocaleString("es-CL", { minimumFractionDigits: 0 })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem(item.id)
                      }}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-muted/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-2xl font-bold tabular-nums">
            ${grandTotal.toLocaleString("es-CL", { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}

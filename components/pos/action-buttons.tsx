"use client"

import { Button } from "@/components/ui/button"
import { Printer, CreditCard, Check } from "lucide-react"

interface ActionButtonsProps {
  onPrint: () => void
  onPay: () => void
  hasItems: boolean
  grandTotal: number
}

export function ActionButtons({
  onPrint,
  onPay,
  hasItems,
  grandTotal,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onPrint}
        disabled={!hasItems}
        className="flex-1"
      >
        <Printer className="mr-2 size-4" />
        Imprimir
      </Button>
      <Button
        onClick={onPay}
        disabled={!hasItems}
        className="flex-[2] bg-success text-success-foreground hover:bg-success/90"
      >
        <CreditCard className="mr-2 size-4" />
        Cobrar ${grandTotal.toLocaleString("es-CL")}
      </Button>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Check, Banknote, CreditCard, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onConfirm: () => void
}

type PaymentMethod = "cash" | "card" | "transfer"

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: "cash", label: "Efectivo", icon: Banknote },
  { key: "card", label: "Tarjeta", icon: CreditCard },
  { key: "transfer", label: "Transferencia", icon: Smartphone },
]

export function PaymentDialog({ open, onOpenChange, total, onConfirm }: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)

  const change = useMemo(() => {
    const received = parseFloat(amountReceived) || 0
    return Math.max(0, received - total)
  }, [amountReceived, total])

  const canConfirm = method !== "cash" || (parseFloat(amountReceived) || 0) >= total

  const handleConfirm = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setCompleted(true)
      setTimeout(() => {
        onConfirm()
        onOpenChange(false)
        setCompleted(false)
        setAmountReceived("")
        setMethod("cash")
      }, 1500)
    }, 800)
  }

  const handleClose = (newOpen: boolean) => {
    if (!processing) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setAmountReceived("")
        setMethod("cash")
        setCompleted(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar venta</DialogTitle>
          <DialogDescription>Selecciona el metodo de pago</DialogDescription>
        </DialogHeader>

        {completed ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
              <Check className="size-8 text-success" />
            </div>
            <p className="text-lg font-medium">Venta completada</p>
            {method === "cash" && change > 0 && (
              <p className="mt-2 text-muted-foreground">
                Vuelto: <span className="font-semibold text-foreground">${change.toLocaleString("es-CL")}</span>
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold tabular-nums">
                  ${total.toLocaleString("es-CL")}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">M&eacute;todo de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon
                    return (
                      <button
                        key={pm.key}
                        onClick={() => setMethod(pm.key)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                          method === pm.key
                            ? "border-foreground bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <Icon className="size-5" />
                        <span className="text-xs font-medium">{pm.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {method === "cash" && (
                <div className="space-y-3">
                  <Field>
                    <FieldLabel>Monto recibido</FieldLabel>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0"
                      className="h-12 text-lg font-medium"
                      autoFocus
                    />
                  </Field>

                  {(parseFloat(amountReceived) || 0) >= total && (
                    <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Vuelto</span>
                        <span className="text-xl font-bold tabular-nums text-success">
                          ${change.toLocaleString("es-CL")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || processing}
                className="w-full"
                size="lg"
              >
                {processing ? "Procesando..." : "Confirmar pago"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

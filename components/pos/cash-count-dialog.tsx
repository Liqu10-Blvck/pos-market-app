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
import { Check } from "lucide-react"

interface CashCountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const BILLS = [20000, 10000, 5000, 2000, 1000]
const COINS = [500, 100, 50, 10]

export function CashCountDialog({ open, onOpenChange }: CashCountDialogProps) {
  const [billCounts, setBillCounts] = useState<Record<number, string>>({})
  const [coinCounts, setCoinCounts] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

  const total = useMemo(() => {
    let sum = 0
    BILLS.forEach((bill) => {
      sum += bill * (parseInt(billCounts[bill] || "0") || 0)
    })
    COINS.forEach((coin) => {
      sum += coin * (parseInt(coinCounts[coin] || "0") || 0)
    })
    return sum
  }, [billCounts, coinCounts])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      onOpenChange(false)
      setSaved(false)
      setBillCounts({})
      setCoinCounts({})
    }, 1500)
  }

  const handleReset = () => {
    setBillCounts({})
    setCoinCounts({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Arqueo de Caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo en caja</DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
              <Check className="size-8 text-success" />
            </div>
            <p className="text-lg font-medium">Arqueo guardado</p>
            <p className="text-2xl font-bold tabular-nums">${total.toLocaleString("es-CL")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Billetes</p>
                <div className="grid grid-cols-5 gap-2">
                  {BILLS.map((bill) => (
                    <Field key={bill}>
                      <FieldLabel className="text-xs">${(bill / 1000)}k</FieldLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={billCounts[bill] || ""}
                        onChange={(e) =>
                          setBillCounts((prev) => ({ ...prev, [bill]: e.target.value }))
                        }
                        placeholder="0"
                        className="h-10 text-center"
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Monedas</p>
                <div className="grid grid-cols-4 gap-2">
                  {COINS.map((coin) => (
                    <Field key={coin}>
                      <FieldLabel className="text-xs">${coin}</FieldLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={coinCounts[coin] || ""}
                        onChange={(e) =>
                          setCoinCounts((prev) => ({ ...prev, [coin]: e.target.value }))
                        }
                        placeholder="0"
                        className="h-10 text-center"
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total en caja</span>
                  <span className="text-2xl font-bold tabular-nums">
                    ${total.toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleReset}>
                Limpiar
              </Button>
              <Button onClick={handleSave}>Guardar arqueo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

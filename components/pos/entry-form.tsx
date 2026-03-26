"use client"

import { useMemo } from "react"
import type { EntryFormData } from "@/lib/pos-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Plus } from "lucide-react"

interface EntryFormProps {
  formData: EntryFormData
  onFormChange: (data: Partial<EntryFormData>) => void
  onAddProduct: () => void
}

export function EntryForm({ formData, onFormChange, onAddProduct }: EntryFormProps) {
  const quantity = parseFloat(formData.quantity) || 0
  const unitPrice = parseFloat(formData.unitPrice) || 0
  const tare = parseFloat(formData.tare) || 0

  const netWeight = useMemo(() => Math.max(0, quantity - tare), [quantity, tare])
  const lineTotal = useMemo(() => netWeight * unitPrice, [netWeight, unitPrice])

  const isValid = formData.product && quantity > 0 && unitPrice > 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) {
      e.preventDefault()
      onAddProduct()
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Entrada</h2>
        {formData.product && (
          <span className="text-sm font-medium">{formData.product.name}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3" onKeyDown={handleKeyDown}>
        <Field>
          <FieldLabel className="text-xs">
            {formData.product?.unit === "unidad" ? "Cantidad" : "Peso (kg)"}
          </FieldLabel>
          <Input
            type="text"
            inputMode="decimal"
            value={formData.quantity}
            onChange={(e) => onFormChange({ quantity: e.target.value })}
            placeholder="0.00"
            className="h-12 text-lg font-medium"
            disabled={!formData.product}
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">Precio unitario</FieldLabel>
          <Input
            type="text"
            inputMode="decimal"
            value={formData.unitPrice}
            onChange={(e) => onFormChange({ unitPrice: e.target.value })}
            placeholder="0"
            className="h-12 text-lg font-medium"
            disabled={!formData.product}
          />
        </Field>

        {formData.product?.unit === "kg" && (
          <>
            <Field>
              <FieldLabel className="text-xs">Tara (kg)</FieldLabel>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.tare}
                onChange={(e) => onFormChange({ tare: e.target.value })}
                placeholder="0.00"
                className="h-10"
                disabled={!formData.product}
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs">Peso neto</FieldLabel>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                {netWeight.toFixed(2)} kg
              </div>
            </Field>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="text-xl font-semibold tabular-nums">
            ${lineTotal.toLocaleString("es-CL", { minimumFractionDigits: 0 })}
          </p>
        </div>
        <Button
          onClick={onAddProduct}
          disabled={!isValid}
          size="lg"
          className="h-12 px-6"
        >
          <Plus className="mr-2 size-4" />
          Agregar
        </Button>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import type { EntryFormData } from "@/lib/pos-types"

interface EntryFormProps {
  formData: EntryFormData
  onFormChange: (data: Partial<EntryFormData>) => void
  onAddProduct: () => void
}

export function EntryForm({ formData, onFormChange, onAddProduct }: EntryFormProps) {
  const quantity = parseFloat(formData.quantity) || 0
  const tare = parseFloat(formData.tare) || 0
  const unitPrice = parseFloat(formData.unitPrice) || 0
  const netWeight = Math.max(0, quantity - tare)
  const lineTotal = netWeight * unitPrice

  const isValid = formData.product && quantity > 0

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {formData.product?.emoji || "?"}
          </span>
          <span className="text-card-foreground">
            {formData.product?.name || "Seleccione un producto"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs text-muted-foreground">
              Cantidad/Peso
            </Label>
            <Input
              id="quantity"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formData.quantity}
              onChange={(e) => onFormChange({ quantity: e.target.value })}
              className="h-12 text-lg font-semibold"
              disabled={!formData.product}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unitPrice" className="text-xs text-muted-foreground">
              Precio Unitario
            </Label>
            <Input
              id="unitPrice"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formData.unitPrice}
              onChange={(e) => onFormChange({ unitPrice: e.target.value })}
              className="h-12 text-lg font-semibold"
              disabled={!formData.product}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tare" className="text-xs text-muted-foreground">
              Tara (Contenedor)
            </Label>
            <Input
              id="tare"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formData.tare}
              onChange={(e) => onFormChange({ tare: e.target.value })}
              className="h-10"
              disabled={!formData.product}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Peso Neto</Label>
            <div className="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-medium text-muted-foreground">
              {netWeight.toFixed(2)} {formData.product?.unit || "kg"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
          <span className="text-sm font-medium text-secondary-foreground">Total Línea</span>
          <span className="text-xl font-bold text-primary">
            ${lineTotal.toLocaleString("es-CL", { minimumFractionDigits: 0 })}
          </span>
        </div>

        <Button
          onClick={onAddProduct}
          disabled={!isValid}
          className="h-14 w-full text-base font-semibold"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          AGREGAR PRODUCTO
        </Button>
      </CardContent>
    </Card>
  )
}

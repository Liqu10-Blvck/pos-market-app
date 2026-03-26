"use client"

import type { Product } from "@/lib/pos-types"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  products: Product[]
  onProductSelect: (product: Product) => void
  selectedProduct: Product | null
}

export function ProductGrid({ products, onProductSelect, selectedProduct }: ProductGridProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Productos</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductSelect(product)}
            className={cn(
              "flex flex-col items-start rounded-md border p-3 text-left transition-all",
              "hover:border-foreground/20 hover:bg-accent/50",
              "active:scale-[0.98]",
              selectedProduct?.id === product.id
                ? "border-foreground bg-accent"
                : "border-border bg-background"
            )}
          >
            <span className="text-sm font-medium leading-tight">{product.name}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              ${product.price.toLocaleString("es-CL")} / {product.unit}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

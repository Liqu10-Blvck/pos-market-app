"use client"

import { Card } from "@/components/ui/card"
import type { Product } from "@/lib/pos-types"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  products: Product[]
  onProductSelect: (product: Product) => void
  selectedProduct: Product | null
}

export function ProductGrid({ products, onProductSelect, selectedProduct }: ProductGridProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Productos
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
        {products.map((product) => (
          <Card
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => onProductSelect(product)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onProductSelect(product)
              }
            }}
            className={cn(
              "cursor-pointer select-none p-3 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
              "flex flex-col items-center justify-center gap-1 text-center",
              "min-h-[100px] border-2",
              selectedProduct?.id === product.id
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-transparent hover:border-primary/30"
            )}
          >
            <span className="text-3xl" role="img" aria-label={product.name}>
              {product.emoji}
            </span>
            <span className="text-sm font-medium leading-tight text-card-foreground">
              {product.name}
            </span>
            <span className="text-xs font-semibold text-primary">
              ${product.price.toLocaleString("es-CL")}/{product.unit}
            </span>
          </Card>
        ))}
      </div>
    </section>
  )
}

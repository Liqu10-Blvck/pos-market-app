"use client"

import Image from "next/image"
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductSelect(product)}
            className={cn(
              "group flex flex-col overflow-hidden rounded-lg border transition-all",
              "hover:border-foreground/30 hover:shadow-sm",
              "active:scale-[0.98]",
              selectedProduct?.id === product.id
                ? "border-foreground ring-1 ring-foreground"
                : "border-border bg-background"
            )}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />
            </div>
            <div className="flex flex-col items-start p-2">
              <span className="text-xs font-medium leading-tight line-clamp-1">{product.name}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                ${product.price.toLocaleString("es-CL")}/{product.unit}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

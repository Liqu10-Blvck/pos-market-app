'use client';

import { motion } from 'framer-motion';
import { Producto } from '@/lib/types/pos';
import { Badge } from '@/components/ui/badge';
import { formatCLPCurrency } from '@/lib/utils';
import { AlertCircle, Package } from 'lucide-react';

interface ProductCardBentoProps {
  producto: Producto;
  onSelect: (producto: Producto) => void;
  index: number;
}

import { getProductAsset } from '@/lib/constants/product-assets';

export function ProductCardBento({ producto, onSelect, index }: ProductCardBentoProps) {
  const isLowStock = producto.stock_actual < 10;
  const isOutOfStock = producto.stock_actual <= 0;
  const asset = getProductAsset(producto.nombre);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
      onClick={() => !isOutOfStock && onSelect(producto)}
      disabled={isOutOfStock}
      className={`
        group relative flex w-full flex-col overflow-hidden rounded-2xl p-4 text-left
        bg-white border border-border/60 transition-all hover:border-primary/40 hover:shadow-md
        ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 overflow-hidden group-hover:scale-110 transition-transform duration-500">
          {asset.type === 'image' ? (
            <img src={asset.value} alt={producto.nombre} className="h-full w-full object-cover" />
          ) : asset.type === 'emoji' ? (
            <span className="text-3xl">{asset.value}</span>
          ) : (
            <Package className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider h-6">
            {producto.unidad}
          </Badge>
          {isLowStock && !isOutOfStock && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase">
              <AlertCircle className="h-3 w-3" />
              Stock bajo
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="line-clamp-2 text-base font-bold text-foreground leading-tight">
          {producto.nombre}
        </h3>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
          {producto.unidad === 'kg' ? 'Venta por peso' : 'Venta por unidad'}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xl font-bold text-primary">
            {formatCLPCurrency(producto.precio)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold block leading-none">
            {producto.stock_actual}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase font-medium">
            Disponibles
          </span>
        </div>
      </div>

      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <Badge variant="destructive" className="font-bold uppercase tracking-widest">Agotado</Badge>
        </div>
      )}
    </motion.button>
  );
}

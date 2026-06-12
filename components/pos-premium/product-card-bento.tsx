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
  const stockValue = producto.unidad === 'kg' ? producto.stock_actual : (producto.stock_cajas || producto.stock_actual);
  const isOutOfStock = stockValue <= 0;
  const isLowStock = stockValue < 10 && !isOutOfStock;
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
        bg-background dark:bg-card border border-border/40 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5
        ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 dark:bg-muted/20 overflow-hidden group-hover:scale-110 transition-transform duration-500 border border-border/10">
          {asset.type === 'image' ? (
            <img src={asset.value} alt={producto.nombre} className="h-full w-full object-cover" />
          ) : asset.type === 'emoji' ? (
            <span className="text-3xl">{asset.value}</span>
          ) : (
            <Package className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest h-6 bg-muted/30 border-border/20">
            {producto.unidad}
          </Badge>
          {isLowStock && !isOutOfStock && (
            <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-tighter">
              <AlertCircle className="h-3 w-3" />
              Stock bajo
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex-1">
        <h3 className="line-clamp-2 text-base font-black text-foreground leading-tight tracking-tight">
          {producto.nombre}
        </h3>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mt-1.5 opacity-60">
          {producto.unidad === 'kg' ? 'Venta por peso' : 'Venta por unidad'}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between pt-2 border-t border-border/10">
        <div className="flex flex-col">
          <span className="text-xl font-black text-primary drop-shadow-sm">
            {formatCLPCurrency(producto.precio)}
          </span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-black block leading-none text-foreground">
            {producto.unidad === 'kg'
              ? producto.stock_actual.toFixed(1)
              : (producto.stock_cajas || producto.stock_actual)}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
            {producto.unidad === 'kg' ? 'Kilos' : 'Cajas'} Disp.
          </span>
        </div>
      </div>

      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 dark:bg-card/80 backdrop-blur-[2px] transition-all duration-300">
          <Badge variant="destructive" className="font-black uppercase tracking-[0.2em] shadow-lg">Agotado</Badge>
        </div>
      )}
    </motion.button>
  );
}

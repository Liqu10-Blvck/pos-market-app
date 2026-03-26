'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CarritoItem } from '@/lib/types/pos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ShoppingBag, ShoppingCart, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCLPCurrency } from '@/lib/utils';
import { getProductAsset } from '@/lib/constants/product-assets';

interface CartPremiumProps {
  items: CarritoItem[];
  onEliminarItem: (tempId: string) => void;
}

export function CartPremium({ items, onEliminarItem }: CartPremiumProps) {
  const total = items.reduce((sum, item) => sum + item.total, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-muted/5">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" strokeWidth={1} />
        <h3 className="text-lg font-bold text-foreground opacity-60">Carrito Vacío</h3>
        <p className="text-xs text-muted-foreground max-w-[180px] mt-1">Selecciona productos para comenzar una venta.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background border-l border-border/60">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Venta Actual</h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{items.length} productos</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-5 mt-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <motion.div
                key={item.temp_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group p-4 bg-muted/30 border border-border/40 rounded-2xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/30 overflow-hidden flex items-center justify-center">
                        {(() => {
                          const asset = getProductAsset(item.nombre);
                          if (asset.type === 'image') return <img src={asset.value} alt={item.nombre} className="h-full w-full object-cover" />;
                          if (asset.type === 'emoji') return <span className="text-xl">{asset.value}</span>;
                          return <Package className="h-5 w-5 text-muted-foreground/30" strokeWidth={1} />;
                        })()}
                      </div>
                      <h4 className="flex-1 truncate text-sm font-bold text-foreground leading-tight">{item.nombre}</h4>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase py-0 leading-none">
                        {item.unidad === 'kg' ? 'PESO' : 'UNID'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCLPCurrency(item.precio_unitario)} × {item.neto} {item.unidad}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarItem(item.temp_id);
                    }}
                    className="h-10 w-10 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
                    title="Eliminar del carrito"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-border/40 pt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Subtotal</p>
                    <p className="text-base font-bold text-primary">{formatCLPCurrency(item.total)}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Neto: {item.neto.toFixed(3)} {item.unidad}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>

      {/* Summary Section - Minimalist */}
      <div className="p-6 bg-muted/10 border-t border-border/60">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Subtotal</span>
            <span className="text-sm font-bold">{formatCLPCurrency(total)}</span>
          </div>

          <div className="p-5 bg-background border border-border/80 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Final</span>
              <div className="text-right">
                <span className="text-xs font-bold text-primary mr-1">CLP</span>
                <span className="text-3xl font-black tabular-nums tracking-tighter">{formatCLPCurrency(total).replace('$', '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

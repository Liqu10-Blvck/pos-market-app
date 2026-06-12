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

      <div className="flex-1 overflow-y-auto px-5 mt-2 custom-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          <div className="flex flex-col gap-3 pb-32">
            {items.map((item) => (
              <motion.div
                key={item.temp_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group p-4 bg-secondary/30 dark:bg-card/40 border border-border/40 rounded-2xl hover:bg-secondary/50 dark:hover:bg-card/60 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-background/50 dark:bg-muted/50 overflow-hidden flex items-center justify-center border border-border/20 shadow-inner">
                        {(() => {
                          const asset = getProductAsset(item.nombre);
                          if (asset.type === 'image') return <img src={asset.value} alt={item.nombre} className="h-full w-full object-cover" />;
                          if (asset.type === 'emoji') return <span className="text-xl">{asset.value}</span>;
                          return <Package className="h-5 w-5 text-muted-foreground/30" strokeWidth={1} />;
                        })()}
                      </div>
                      <div>
                        <h4 className="flex-1 truncate text-sm font-black text-foreground leading-tight">{item.nombre}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.origen && (
                            <Badge variant="outline" className={`text-[8px] font-black uppercase px-1.5 py-0 h-4 ${item.origen === 'nacional' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                              {item.origen === 'nacional' ? '🇨🇱 Nacional' : '✈️ Importado'}
                            </Badge>
                          )}
                          {item.variedad && (
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20">
                              {item.variedad}
                            </Badge>
                          )}
                          {item.calibre && (
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 h-4 bg-muted/50 border-border/40">
                              CAL: {item.calibre}
                            </Badge>
                          )}
                          <span className="text-[10px] font-bold text-muted-foreground ml-0.5">
                            {formatCLPCurrency(item.precio_unitario)} × {item.peso_neto || item.neto} {item.unidad}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarItem(item.temp_id);
                    }}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-all active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {item.envase_nombre && (
                  <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2">
                       <Package className="h-3 w-3 text-primary opacity-60" />
                       <span className="text-[10px] font-bold text-primary truncate max-w-[120px]">
                          {item.envase_cantidad} × {item.envase_nombre}
                       </span>
                    </div>
                    <span className="text-[10px] font-black text-primary/80">
                       {formatCLPCurrency(item.total_envases || 0)}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex items-end justify-between border-t border-border/10 pt-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Subtotal</p>
                    <p className="text-base font-black text-foreground drop-shadow-sm">{formatCLPCurrency(item.total)}</p>
                  </div>
                  <div className="text-right">
                    {item.total_envases ? (
                      <span className="text-[9px] text-muted-foreground font-bold bg-muted/30 px-2 py-0.5 rounded-md border border-border/10">
                        FRUTA: {formatCLPCurrency(item.total_fruta || 0)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[9px] text-muted-foreground font-bold bg-muted/30 px-2 py-0.5 rounded-md border border-border/10 uppercase tracking-wider">
                          LOG: {item.peso_neto || 0}kg
                        </span>
                        {item.cantidad && (
                          <span className="text-[8px] text-primary/60 font-black uppercase">
                            {item.cantidad} Bultos
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

    </div>
  );
}

import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Producto } from '../../../lib/types/pos';
import { formatCLPCurrency } from '../../../lib/utils';
import { useAdminStore } from '../hooks/useAdminStore';
import { obtenerDiasParaVencer } from '../utils/adminUtils';
import { Edit, Package, Barcode, ShoppingBag, Apple, Leaf, Package2, Award } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
}

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  const handleAbrirModal = useAdminStore((state) => state.handleAbrirModal);
  const handleAbrirModalCompra = useAdminStore((state) => state.handleAbrirModalCompra);

  const diasRestantes = producto.fecha_caducidad ? obtenerDiasParaVencer(producto.fecha_caducidad) : null;
  const estaVencido = diasRestantes !== null && diasRestantes < 0;
  const proximoAVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

  return (
    <Card className="rounded-[22px] border-border/50 shadow-sm overflow-hidden flex flex-row items-center p-4 gap-4 transition-all duration-300 hover:shadow-md hover:border-primary/20 bg-card">
      {/* Product Image Thumbnail */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted rounded-2xl border border-border/40 flex items-center justify-center">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground opacity-30" />
        )}
        {producto.sku && (
          <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md text-white text-[8px] font-black tracking-wider px-1 py-0.5 rounded flex items-center gap-0.5">
            <Barcode className="h-2 w-2" />
            {producto.sku.slice(-4)}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-24 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-black tracking-tight text-foreground flex items-center gap-1.5" title={producto.nombre}>
            {producto.nombre}
            {producto.fecha_caducidad && (
              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${estaVencido ? 'bg-red-500 animate-pulse' :
                proximoAVencer ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`} title={estaVencido ? 'Vencido' : proximoAVencer ? 'Próximo a vencer' : 'Vence pronto'} />
            )}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAbrirModal(producto)}
            className="h-7 w-7 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-all duration-200 shrink-0"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-xs font-bold text-foreground">{formatCLPCurrency(producto.precio)}</span>
          {producto.costo_actual && (
            <span className="text-[10px] text-muted-foreground">
              Costo: {formatCLPCurrency(producto.costo_actual)}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between mt-1 gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap gap-1 items-center">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border w-fit truncate ${producto.stock_actual < 5 ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                producto.stock_actual < 15 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                Stock: {producto.unidad === 'kg' ? producto.stock_actual.toFixed(2) : Math.round(producto.stock_actual)} {producto.unidad}
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/10 w-fit flex items-center gap-1">
                {producto.categoria === 'fruta'
                  ? <><Apple className="h-2.5 w-2.5 text-rose-500" />Fruta</>
                  : producto.categoria === 'verdura'
                  ? <><Leaf className="h-2.5 w-2.5 text-emerald-500" />Verdura</>
                  : <><Package2 className="h-2.5 w-2.5 text-indigo-500" />Otros</>}
              </span>
              {producto.calidad && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10 w-fit flex items-center gap-1">
                  <Award className="h-2.5 w-2.5" />{producto.calidad}
                </span>
              )}
            </div>
            {producto.cantidad_por_caja && producto.cantidad_por_caja > 0 && (() => {
              const ratio = producto.stock_actual / producto.cantidad_por_caja;
              const formattedRatio = ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(1);
              const empaqueLabel = producto.tipo_empaque || 'Caja';
              return (
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider pl-1">
                  {formattedRatio} {empaqueLabel}s
                </span>
              );
            })()}
          </div>

          <Button
            size="sm"
            onClick={() => handleAbrirModalCompra(producto)}
            className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
          >
            <ShoppingBag className="h-3 w-3" />
            Comprar
          </Button>
        </div>
      </div>
    </Card>
  );
};

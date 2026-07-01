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
    <Card className="rounded-[24px] border-border/50 shadow-sm overflow-hidden flex flex-col p-4 gap-3.5 transition-all duration-300 hover:shadow-md hover:border-primary/20 bg-card group relative">
      {/* Product Image Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shrink-0">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Package className="h-10 w-10 text-slate-300" />
        )}
        {producto.sku && (
          <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <Barcode className="h-2.5 w-2.5" />
            {producto.sku.slice(-4)}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between gap-3">
        {/* Title and Edit Button */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black tracking-tight text-slate-800 flex items-center gap-1.5 line-clamp-1" title={producto.nombre}>
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
              className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 shrink-0"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Pricing */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-1">
            <span className="text-sm font-black text-emerald-800">{formatCLPCurrency(producto.precio)}</span>
            {producto.costo_actual && (
              <span className="text-[10px] text-slate-400 font-bold">
                Costo: {formatCLPCurrency(producto.costo_actual)}
              </span>
            )}
          </div>
        </div>

        {/* Badges / Stock / Formato */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1 items-center">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border w-fit truncate ${producto.stock_actual < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' :
              producto.stock_actual < 15 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
              Stock: {producto.stock_actual} {producto.unidad}
            </span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-indigo-50/5 text-indigo-600 border-indigo-100/50 w-fit flex items-center gap-1">
              {producto.categoria === 'fruta'
                ? <><Apple className="h-2.5 w-2.5 text-rose-500" />Fruta</>
                : producto.categoria === 'verdura'
                ? <><Leaf className="h-2.5 w-2.5 text-emerald-500" />Verdura</>
                : <><Package2 className="h-2.5 w-2.5 text-indigo-500" />Otros</>}
            </span>
            {producto.calidad && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-amber-50 text-amber-600 border-amber-100 w-fit flex items-center gap-1">
                <Award className="h-2.5 w-2.5" />{producto.calidad}
              </span>
            )}
          </div>
          {producto.cantidad_por_caja && producto.cantidad_por_caja > 0 && (() => {
            const ratio = producto.stock_actual / producto.cantidad_por_caja;
            const formattedRatio = ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(1);
            const empaqueLabel = producto.tipo_empaque || 'Caja';
            return (
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider pl-0.5 block">
                Equivale a: {formattedRatio} {empaqueLabel}s
              </span>
            );
          })()}
        </div>

        {/* Action Button */}
        <div className="border-t border-slate-100 pt-3 mt-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acciones</span>
          <Button
            size="sm"
            onClick={() => handleAbrirModalCompra(producto)}
            className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Abastecer
          </Button>
        </div>
      </div>
    </Card>
  );
};

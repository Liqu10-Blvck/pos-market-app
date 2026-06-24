import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Producto } from '../../../lib/types/pos';
import { formatCLPCurrency } from '../../../lib/utils';
import { useAdminStore } from '../hooks/useAdminStore';
import { Package, ShoppingBag, Edit } from 'lucide-react';

interface ShoppingListTableProps {
  productosFiltrados: Producto[];
}

export const ShoppingListTable: React.FC<ShoppingListTableProps> = ({ productosFiltrados }) => {
  const handleAbrirModal = useAdminStore((state) => state.handleAbrirModal);
  const handleAbrirModalCompra = useAdminStore((state) => state.handleAbrirModalCompra);

  return (
    <div className="overflow-x-auto w-full">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="pl-6 w-[30%]">Producto</TableHead>
            <TableHead className="w-[15%]">Último Costo</TableHead>
            <TableHead className="w-[15%]">Stock Actual</TableHead>
            <TableHead className="w-[15%]">Motivo</TableHead>
            <TableHead className="w-[25%] text-right pr-6">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productosFiltrados.map((producto) => {
            // Calculate Motivo
            let motivoLabel = "Interés Manual";
            let motivoColor = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
            if (!producto.es_interes) {
              if (producto.stock_actual <= 0) {
                motivoLabel = "Agotado";
                motivoColor = "bg-red-500/10 text-red-500 border-red-500/20";
              } else {
                motivoLabel = "Stock Bajo";
                motivoColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
              }
            }

            return (
              <TableRow key={producto.id} className="hover:bg-muted/5 transition-colors text-xs border-b last:border-0 border-border/30">
                {/* Product Name */}
                <TableCell className="font-bold pl-6 py-3.5 flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden bg-muted rounded-lg border border-border/40 flex items-center justify-center">
                    {producto.imagen_url ? (
                      <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground opacity-30" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-foreground text-sm">{producto.nombre}</span>
                    {producto.sku && <span className="text-[10px] text-muted-foreground font-mono">SKU: {producto.sku}</span>}
                  </div>
                </TableCell>

                {/* Cost */}
                <TableCell className="font-semibold text-foreground">
                  {producto.costo_actual ? `${formatCLPCurrency(producto.costo_actual)} / ${producto.unidad}` : 'Sin datos'}
                </TableCell>

                {/* Stock */}
                <TableCell className="py-3.5">
                  <span className={`font-bold text-sm ${
                    producto.stock_actual < 5 ? 'text-red-500 font-black' : 'text-amber-500'
                  }`}>
                    {producto.unidad === 'kg' ? producto.stock_actual.toFixed(2) : Math.round(producto.stock_actual)} {producto.unidad}
                  </span>
                </TableCell>

                {/* Motivo */}
                <TableCell className="py-3.5">
                  <Badge className={`${motivoColor} font-bold text-[9px] uppercase tracking-wider border`}>
                    {motivoLabel}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right pr-6 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAbrirModalCompra(producto)}
                      className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-500/10 transition-all"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Comprar / Abastecer
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAbrirModal(producto)}
                      className="h-8 w-8 rounded-xl bg-muted/60 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

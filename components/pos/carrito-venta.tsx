'use client';

import { CarritoItem } from '@/lib/types/pos';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CarritoVentaProps {
  items: CarritoItem[];
  onEliminarItem: (tempId: string) => void;
}

export function CarritoVenta({ items, onEliminarItem }: CarritoVentaProps) {
  const total = items.reduce((sum, item) => sum + item.total, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <p className="text-lg">Carrito vacío</p>
        <p className="text-sm">Selecciona productos para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {items.map((item) => (
            <div
              key={item.temp_id}
              className="bg-card border rounded-lg p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.nombre}</h4>
                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                  {item.unidad === 'kg' ? (
                    <>
                      <p>Bruto: {item.peso_bruto?.toFixed(3)} kg</p>
                      <p>Tara: {item.tara?.toFixed(3)} kg</p>
                      <p className="font-medium text-foreground">
                        Neto: {item.neto.toFixed(3)} kg
                      </p>
                    </>
                  ) : (
                    <p>Cantidad: {item.cantidad} unid</p>
                  )}
                  <p className="text-xs">
                    ${item.precio_unitario.toFixed(2)} × {item.neto.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-lg whitespace-nowrap">
                  ${item.total.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onEliminarItem(item.temp_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4 bg-background">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold">Items:</span>
          <span className="text-lg">{items.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold">TOTAL:</span>
          <span className="text-3xl font-bold text-primary">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

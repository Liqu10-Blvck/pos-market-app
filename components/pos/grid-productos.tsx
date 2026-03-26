'use client';

import { Producto } from '@/lib/types/pos';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface GridProductosProps {
  productos: Producto[];
  onSeleccionar: (producto: Producto) => void;
}

export function GridProductos({ productos, onSeleccionar }: GridProductosProps) {
  if (productos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
      {productos.map((producto) => (
        <Card
          key={producto.id}
          className="cursor-pointer hover:shadow-lg transition-shadow active:scale-95 overflow-hidden"
          onClick={() => onSeleccionar(producto)}
        >
          <div className="aspect-square relative bg-muted">
            {producto.imagen_url ? (
              <Image
                src={producto.imagen_url}
                alt={producto.nombre}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-4xl">
                📦
              </div>
            )}
            <Badge
              variant={producto.stock_actual > 0 ? 'default' : 'destructive'}
              className="absolute top-2 right-2"
            >
              {producto.stock_actual} {producto.unidad}
            </Badge>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm truncate mb-1">
              {producto.nombre}
            </h3>
            <p className="text-lg font-bold text-primary">
              ${producto.precio.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              por {producto.unidad}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

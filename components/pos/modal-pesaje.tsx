'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Producto, ItemVenta } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';

interface ModalPesajeProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onAgregar: (item: ItemVenta) => void;
}

export function ModalPesaje({ producto, open, onClose, onAgregar }: ModalPesajeProps) {
  const [pesoBruto, setPesoBruto] = useState('');
  const [tara, setTara] = useState('');
  const [cantidad, setCantidad] = useState('1');

  useEffect(() => {
    if (open) {
      setPesoBruto('');
      setTara('');
      setCantidad('1');
    }
  }, [open]);

  if (!producto) return null;

  const esKg = producto.unidad === 'kg';

  const calcularNeto = () => {
    if (esKg) {
      const bruto = parseFloat(pesoBruto) || 0;
      const taraVal = parseFloat(tara) || 0;
      return VentasService.calcularNeto(bruto, taraVal);
    }
    return parseFloat(cantidad) || 0;
  };

  const neto = calcularNeto();
  const total = VentasService.calcularTotal(neto, producto.precio);

  const handleAgregar = () => {
    if (neto <= 0) {
      alert('El peso neto o cantidad debe ser mayor a 0');
      return;
    }

    if (neto > producto.stock_actual) {
      alert(`Stock insuficiente. Disponible: ${producto.stock_actual} ${producto.unidad}`);
      return;
    }

    const item: ItemVenta = {
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: producto.precio,
      unidad: producto.unidad,
      neto,
      total
    };

    if (esKg) {
      item.peso_bruto = parseFloat(pesoBruto);
      item.tara = parseFloat(tara);
    } else {
      item.cantidad = parseFloat(cantidad);
    }

    onAgregar(item);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{producto.nombre}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Precio: ${producto.precio.toFixed(2)} / {producto.unidad}
          </p>
          <p className="text-sm text-muted-foreground">
            Stock: {producto.stock_actual} {producto.unidad}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {esKg ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="peso-bruto" className="text-base font-semibold">
                  Peso Bruto (kg)
                </Label>
                <Input
                  id="peso-bruto"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={pesoBruto}
                  onChange={(e) => setPesoBruto(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tara" className="text-base font-semibold">
                  Tara (kg)
                </Label>
                <Input
                  id="tara"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={tara}
                  onChange={(e) => setTara(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Peso Neto:</span>
                  <span className="text-2xl font-bold">{neto.toFixed(3)} kg</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-base font-semibold">
                Cantidad (unidades)
              </Label>
              <Input
                id="cantidad"
                type="number"
                step="1"
                min="1"
                placeholder="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
            </div>
          )}

          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg border-2 border-green-500">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">TOTAL:</span>
              <span className="text-3xl font-bold text-green-700 dark:text-green-400">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleAgregar} className="flex-1 h-12 text-lg" disabled={neto <= 0}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
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
  const [precioManual, setPrecioManual] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    if (open && producto) {
      setPesoBruto('');
      setTara('');
      setCantidad('1');
      setPrecioManual(producto.precio.toString());
    }
  }, [open, producto]);

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
  const precioAplicado = parseFloat(precioManual) || producto.precio;
  const total = VentasService.calcularTotal(neto, precioAplicado);

  const isAdmin = user?.role === 'admin';
  const precioBloqueado = producto.precio_bloqueado && !isAdmin;

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
      precio_unitario: precioAplicado,
      unidad: producto.unidad,
      peso_neto: neto,
      neto,
      total_fruta: total,
      total_envases: 0,
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

          <div className="space-y-4 p-4 bg-zinc-50 dark:bg-neutral-900/50 rounded-2xl border-2 border-zinc-100 dark:border-neutral-800">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-black uppercase opacity-60">Precio Unitario ($)</Label>
              <Input
                type="number"
                value={precioManual}
                onChange={(e) => setPrecioManual(e.target.value)}
                disabled={precioBloqueado}
                className={`w-32 h-10 text-right font-black rounded-xl border-2 ${precioBloqueado ? 'bg-zinc-100 border-zinc-200 opacity-50' : 'border-primary/20 focus:border-primary'}`}
              />
            </div>
            
            <div className="flex justify-between items-center py-2 border-t-2 border-zinc-100 dark:border-neutral-800/50">
              <span className="text-lg font-black uppercase tracking-tight">TOTAL VENTA:</span>
              <span className="text-3xl font-black text-primary">
                ${total.toLocaleString('es-CL')}
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

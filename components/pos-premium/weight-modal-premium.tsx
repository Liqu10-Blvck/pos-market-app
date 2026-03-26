'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Producto, ItemVenta } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { formatCLPCurrency } from '@/lib/utils';
import { NumericKeypad } from './numeric-keypad';
import { ShoppingCart, AlertCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WeightModalPremiumProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onAgregar: (item: ItemVenta) => void;
}

export function WeightModalPremium({ producto, open, onClose, onAgregar }: WeightModalPremiumProps) {
  const [activeInput, setActiveInput] = useState<'bruto' | 'tara' | 'cantidad' | 'precio'>('bruto');
  const [pesoBruto, setPesoBruto] = useState('');
  const [tara, setTara] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioManual, setPrecioManual] = useState('');

  useEffect(() => {
    if (open && producto) {
      setPesoBruto('');
      setTara('');
      setCantidad('');
      setPrecioManual(producto.precio.toString());
      setActiveInput(producto.unidad === 'kg' ? 'bruto' : 'cantidad');
    }
  }, [open, producto]);

  if (!producto) return null;

  const esKg = producto.unidad === 'kg';
  const unitLabel = esKg ? 'kg' : 'unid';
  
  const calcularNeto = () => {
    if (esKg) {
      const bruto = parseFloat(pesoBruto) || 0;
      const taraVal = parseFloat(tara) || 0;
      return VentasService.calcularNeto(bruto, taraVal);
    }
    return parseFloat(cantidad) || 0;
  };

  const neto = calcularNeto();
  const precioActual = parseFloat(precioManual) || 0;
  const total = VentasService.calcularTotal(neto, precioActual);
  const isReadyToAdd = neto > 0 && neto <= producto.stock_actual;
  const isPriceModified = precioActual !== producto.precio;

  const handleAgregar = () => {
    if (!isReadyToAdd) return;

    const item: ItemVenta = {
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: precioActual,
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

  const getCurrentValue = () => {
    if (activeInput === 'precio') return precioManual;
    if (esKg) {
      if (activeInput === 'bruto') return pesoBruto;
      if (activeInput === 'tara') return tara;
    }
    return cantidad;
  };

  const handleValueChange = (value: string) => {
    if (activeInput === 'precio') {
      setPrecioManual(value);
    } else if (esKg) {
      if (activeInput === 'bruto') setPesoBruto(value);
      else if (activeInput === 'tara') setTara(value);
    } else {
      setCantidad(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <div className="flex flex-col h-full bg-white dark:bg-[#080b12]">
          
          <div className="p-5 pb-2">
            <div className="mb-4">
              <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <DialogTitle className="text-xl font-bold tracking-tight uppercase leading-tight">
                    {producto.nombre}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Configura el peso y precio para la venta.
                  </DialogDescription>
                </div>
                <Badge variant="secondary" className="font-bold text-xs h-8 px-3">
                  Stock: {producto.stock_actual}
                </Badge>
              </DialogHeader>

              <div className="mt-3 flex items-center gap-2">
                <span className={`text-sm font-medium ${isPriceModified ? 'text-muted-foreground line-through opacity-50' : 'text-primary'}`}>
                  {formatCLPCurrency(producto.precio)}/{unitLabel}
                </span>
                {isPriceModified && (
                  <span className="text-sm font-bold text-amber-600">
                    {formatCLPCurrency(precioActual)}/{unitLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1.5 rounded-2xl mb-4">
              {esKg ? (
                <>
                  <button
                    onClick={() => setActiveInput('bruto')}
                    className={`h-11 rounded-xl text-xs font-bold transition-all ${activeInput === 'bruto' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                  >BRUTO</button>
                  <button
                    onClick={() => setActiveInput('tara')}
                    className={`h-11 rounded-xl text-xs font-bold transition-all ${activeInput === 'tara' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                  >TARA</button>
                </>
              ) : (
                <button
                  onClick={() => setActiveInput('cantidad')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all ${activeInput === 'cantidad' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                >CANTIDAD</button>
              )}
              <button
                onClick={() => setActiveInput('precio')}
                className={`h-11 rounded-xl text-xs font-bold transition-all ${activeInput === 'precio' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
              >PRECIO</button>
            </div>

            <div className="bg-muted p-6 rounded-[2rem] text-center mb-4 min-h-[120px] flex flex-col justify-center border-2 border-primary/5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-60">
                {activeInput === 'precio' ? 'Precio de Venta' : 
                 activeInput === 'bruto' ? 'Ingresa Peso Bruto' : 
                 activeInput === 'tara' ? 'Ingresa Tara' : 
                 'Ingresa Cantidad'}
              </p>
              <div className="text-5xl font-mono font-bold tracking-tighter text-foreground">
                {activeInput === 'precio' && <span className="text-2xl mr-1 text-muted-foreground">$</span>}
                {getCurrentValue() || '0'}
                {activeInput !== 'precio' && <span className="text-2xl ml-1 text-muted-foreground">{unitLabel}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-sm font-bold border-b border-border pb-3 mb-2">
              <div className="text-muted-foreground flex gap-1 items-center">
                Neto: <span className="text-foreground">{neto.toFixed(esKg ? 3 : 0)} {unitLabel}</span>
              </div>
              <div className="text-muted-foreground flex gap-1 items-center">
                Total: <span className="text-primary text-xl font-black">{formatCLPCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="px-5">
            <NumericKeypad
              value={getCurrentValue()}
              onChange={handleValueChange}
              maxDecimals={activeInput === 'precio' ? 0 : (esKg ? 3 : 0)}
            />
          </div>

          <AnimatePresence>
            {neto > producto.stock_actual && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mx-5 mb-2 bg-red-50 text-red-600 rounded-xl p-3 flex pt-2 items-center justify-center gap-2 text-xs font-bold border border-red-100"
              >
                <AlertCircle className="h-4 w-4" />
                STOCK INSUFICIENTE
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-5 pt-2 grid grid-cols-2 gap-4">
            <Button variant="ghost" onClick={onClose} className="h-14 rounded-2xl font-bold uppercase tracking-widest text-muted-foreground">
              Cancelar
            </Button>
            <Button 
              onClick={handleAgregar} 
              disabled={!isReadyToAdd} 
              className="h-14 rounded-2xl font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Agregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

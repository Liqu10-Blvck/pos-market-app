'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Producto, ItemVenta } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { formatCLPCurrency } from '@/lib/utils';
import { NumericKeypad } from './numeric-keypad';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WeightModalProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onAgregar: (item: ItemVenta) => void;
}

export function WeightModal({ producto, open, onClose, onAgregar }: WeightModalProps) {
  const [modoVenta, setModoVenta] = useState<'detalle' | 'caja'>('detalle');
  const [activeInput, setActiveInput] = useState<'bruto' | 'tara' | 'cantidad' | 'precio'>('bruto');
  const [pesoBruto, setPesoBruto] = useState('');
  const [tara, setTara] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioManual, setPrecioManual] = useState('');

  useEffect(() => {
    if (open && producto) {
      setPesoBruto('');
      setTara('');
      setCantidad(producto.unidad === 'unid' ? '1' : '');
      setPrecioManual(producto.precio.toString());
      setModoVenta('detalle');
      setActiveInput(producto.unidad === 'kg' ? 'bruto' : 'cantidad');
    }
  }, [open, producto]);

  if (!producto) return null;

  const esVentaCaja = modoVenta === 'caja';
  const esKg = producto.unidad === 'kg' && !esVentaCaja;
  const empaqueLabel = producto.tipo_empaque || 'Caja';
  const unitLabel = esVentaCaja ? `${empaqueLabel}(s)` : (producto.unidad === 'kg' ? 'kg' : 'unid');
  
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
  
  // Stock checking helper based on sale mode
  const stockRequerido = esVentaCaja && producto.cantidad_por_caja ? (neto * producto.cantidad_por_caja) : neto;
  const isReadyToAdd = neto > 0 && stockRequerido <= producto.stock_actual;
  
  const precioOriginal = esVentaCaja ? (producto.precio_caja || 0) : producto.precio;
  const isPriceModified = precioActual !== precioOriginal;

  const handleAgregar = () => {
    if (!isReadyToAdd) return;

    const item: ItemVenta = {
      producto_id: producto.id,
      nombre: esVentaCaja ? `${producto.nombre} (${empaqueLabel})` : producto.nombre,
      precio_unitario: precioActual,
      unidad: esVentaCaja ? 'unid' : producto.unidad,
      neto,
      total,
      facturable: producto.facturable !== false,
      ...(esVentaCaja ? { 
        es_caja: true, 
        cantidad_por_caja: producto.cantidad_por_caja,
        tipo_empaque: empaqueLabel
      } : {})
    };

    if (esKg) {
      item.peso_bruto = parseFloat(pesoBruto) || 0;
      item.tara = parseFloat(tara) || 0;
    } else {
      item.cantidad = parseFloat(cantidad) || 0;
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
        <div className="flex flex-col h-full bg-white dark:bg-card">
          
          <div className="p-5 pb-2">
            <div className="mb-4">
              <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <DialogTitle className="text-xl font-bold tracking-tight uppercase leading-tight text-foreground">
                    {producto.nombre}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-medium">
                    Configura el peso y precio para la venta.
                  </DialogDescription>
                </div>
                <Badge variant="secondary" className="font-bold text-xs h-8 px-3 bg-muted dark:bg-muted/50 text-foreground border-border/40">
                  Stock: {producto.stock_actual.toFixed(2)} {producto.unidad}
                  {producto.cantidad_por_caja && producto.cantidad_por_caja > 0 ? (() => {
                    const ratio = producto.stock_actual / producto.cantidad_por_caja;
                    const formattedRatio = ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(1);
                    return ` (~${formattedRatio} ${empaqueLabel}s)`;
                  })() : ''}
                </Badge>
              </DialogHeader>

              <div className="mt-3 flex items-center gap-2">
                <span className={`text-sm font-bold ${isPriceModified ? 'text-muted-foreground line-through opacity-50' : 'text-primary'}`}>
                  {formatCLPCurrency(precioOriginal)}/{unitLabel}
                </span>
                {isPriceModified && (
                  <span className="text-sm font-black text-amber-500 dark:text-amber-400">
                    {formatCLPCurrency(precioActual)}/{unitLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Mode Selector Tabs (Detail vs Box) */}
            {producto.cantidad_por_caja && producto.precio_caja && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 dark:bg-muted/10 rounded-xl mb-4 border border-border/10">
                <button
                  type="button"
                  onClick={() => {
                    setModoVenta('detalle');
                    setPrecioManual(producto.precio.toString());
                    setActiveInput(producto.unidad === 'kg' ? 'bruto' : 'cantidad');
                    setCantidad('');
                    setPesoBruto('');
                    setTara('');
                  }}
                  className={`h-9 rounded-lg text-xs font-black transition-all ${
                    modoVenta === 'detalle'
                      ? 'bg-background shadow-sm text-primary dark:text-white dark:bg-primary'
                      : 'text-muted-foreground hover:bg-background/40'
                  }`}
                >
                  Detalle ({producto.unidad === 'kg' ? 'Kilo' : 'Unid'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoVenta('caja');
                    setPrecioManual((producto.precio_caja || 0).toString());
                    setActiveInput('cantidad');
                    setCantidad('');
                    setPesoBruto('');
                    setTara('');
                  }}
                  className={`h-9 rounded-lg text-xs font-black transition-all ${
                    modoVenta === 'caja'
                      ? 'bg-background shadow-sm text-primary dark:text-white dark:bg-primary'
                      : 'text-muted-foreground hover:bg-background/40'
                  }`}
                >
                  {empaqueLabel} Completa ({producto.cantidad_por_caja} {producto.unidad})
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 bg-muted/40 dark:bg-muted/10 p-1.5 rounded-2xl mb-4 border border-border/10">
              {esKg ? (
                <>
                  <button
                    onClick={() => setActiveInput('bruto')}
                    className={`h-11 rounded-xl text-xs font-black transition-all ${activeInput === 'bruto' ? 'bg-background shadow-md text-primary dark:text-white dark:bg-primary' : 'text-muted-foreground hover:bg-background/50'}`}
                  >BRUTO</button>
                  <button
                    onClick={() => setActiveInput('tara')}
                    className={`h-11 rounded-xl text-xs font-black transition-all ${activeInput === 'tara' ? 'bg-background shadow-md text-primary dark:text-white dark:bg-primary' : 'text-muted-foreground hover:bg-background/50'}`}
                  >TARA</button>
                </>
              ) : (
                <button
                  onClick={() => setActiveInput('cantidad')}
                  className={`h-11 rounded-xl text-xs font-black transition-all ${activeInput === 'cantidad' ? 'bg-background shadow-md text-primary dark:text-white dark:bg-primary' : 'text-muted-foreground hover:bg-background/50'}`}
                >CANTIDAD</button>
              )}
              <button
                onClick={() => setActiveInput('precio')}
                className={`h-11 rounded-xl text-xs font-black transition-all ${activeInput === 'precio' ? 'bg-background shadow-md text-primary dark:text-white dark:bg-primary' : 'text-muted-foreground hover:bg-background/50'}`}
              >PRECIO</button>
            </div>

            <div className="bg-muted dark:bg-muted/20 p-6 rounded-[2rem] text-center mb-4 min-h-[120px] flex flex-col justify-center border-2 border-primary/10 shadow-inner">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-70">
                {activeInput === 'precio' ? 'Precio de Venta' : 
                 activeInput === 'bruto' ? 'Peso Bruto' : 
                 activeInput === 'tara' ? 'Tara' : 
                 'Cantidad'}
              </p>
              <div className="text-5xl font-mono font-black tracking-tighter text-foreground drop-shadow-sm">
                {activeInput === 'precio' && <span className="text-2xl mr-1 text-muted-foreground/60">$</span>}
                {getCurrentValue() || '0'}
                {activeInput !== 'precio' && <span className="text-2xl ml-1 text-muted-foreground/60">{unitLabel}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-sm font-bold border-b border-border/20 pb-3 mb-2">
              <div className="text-muted-foreground flex gap-1 items-center">
                Neto: <span className="text-foreground">{neto.toFixed(esKg ? 2 : 0)} {unitLabel}</span>
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
              maxDecimals={activeInput === 'precio' ? 0 : (esKg ? 2 : 0)}
            />
          </div>

          <AnimatePresence>
            {stockRequerido > producto.stock_actual && (
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

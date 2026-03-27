import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Producto, ItemVenta, TipoEnvase, Lote, Reserva } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { LoteService } from '@/lib/services/lote.service';
import { formatCLPCurrency } from '@/lib/utils';
import { NumericKeypad } from './numeric-keypad';
import { ShoppingCart, AlertCircle, X, Package, Ruler, Info, Star, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TIPOS_ENVASES } from '@/lib/constants/envases';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { useToast } from '@/hooks/use-toast';

interface WeightModalPremiumProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onAgregar: (item: ItemVenta) => void;
  clienteId?: string; // Nuevo: Soporte para reservas
}

export function WeightModalPremium({ producto, open, onClose, onAgregar, clienteId }: WeightModalPremiumProps) {
  const { toast } = useToast();
  const [activeInput, setActiveInput] = useState<'neto' | 'cantidad' | 'precio' | 'envases_cant'>('neto');
  const [isFirstKey, setIsFirstKey] = useState(true);
  const [pesoNeto, setPesoNeto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [envaseId, setEnvaseId] = useState<string | null>(null);
  const [cantidadEnvases, setCantidadEnvases] = useState('1');


  // Logistics Logic
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [selectedCalibre, setSelectedCalibre] = useState<string | null>(null);

  const envaseSeleccionado = useMemo(() =>
    TIPOS_ENVASES.find(e => e.id === envaseId) || null
    , [envaseId]);

  const loteSeleccionado = useMemo(() =>
    lotes.find(l => l.id === selectedLoteId) || null
    , [lotes, selectedLoteId]);

  const reservaActiva = useMemo(() =>
    reservas.find(r => r.lote_id === selectedLoteId && r.activo) || null
    , [reservas, selectedLoteId]);

  // Catalog fallbacks for wholesale agility
  const variedadesDisponibles = useMemo(() => {
    const fromLotes = lotes.map(l => l.variedad).filter(Boolean);
    const fromTemplate = producto?.variedades || [];
    return Array.from(new Set([...fromLotes, ...fromTemplate]));
  }, [lotes, producto]);

  const calibresDisponibles = useMemo(() => {
    if (loteSeleccionado) {
      return loteSeleccionado.calibres.map(c => c.calibre);
    }
    const fromLotes = lotes.flatMap(l => l.calibres.map(c => c.calibre));
    const fromTemplate = producto?.calibres || [];
    return Array.from(new Set([...fromLotes, ...fromTemplate]));
  }, [lotes, loteSeleccionado, producto]);

  useEffect(() => {
    if (open && producto) {
      setPesoNeto('');
      setCantidad('');
      setPrecioManual(producto.precio.toString());
      setEnvaseId(null);
      setCantidadEnvases('1');
      setSelectedLoteId(null);
      setSelectedCalibre(null);
      setActiveInput(producto.unidad === 'kg' ? 'neto' : 'cantidad');
      setIsFirstKey(true); // Reset for first interaction

      // Fetch available batches
      LoteService.obtenerLotesDisponibles(producto.id).then(lotesData => {
        setLotes(lotesData);
        // Auto-select first lot (FIFO)
        if (lotesData.length > 0) {
          setSelectedLoteId(lotesData[0].id);
        }
      });

      // Fetch reservations (Simulado por ahora o fetch simple)
      getDocs(query(collection(db, 'reservas'), where('activo', '==', true)))
        .then(snap => setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reserva))));
    }
  }, [open, producto]);

  if (!producto) return null;

  const esKg = producto.unidad === 'kg';
  const unitLabel = esKg ? 'kg' : 'unid';

  const neto = esKg ? (parseFloat(pesoNeto) || 0) : (parseFloat(cantidad) || 0);
  const precioSugerido = loteSeleccionado?.precio_sugerido || producto.precio;
  const precioActual = precioManual !== '' ? (parseFloat(precioManual) || 0) : precioSugerido;
  const cantEnvases = parseInt(cantidadEnvases) || 0;

  const totalFruta = VentasService.calcularTotal(neto, precioActual);
  const totalEnvases = (envaseSeleccionado?.precio_venta || 0) * cantEnvases;
  const totalGeneral = totalFruta + totalEnvases;

  const isReadyToAdd = neto > 0;
  const isPriceModified = precioActual !== producto.precio;

  const handleAgregar = () => {
    if (!isReadyToAdd) return;

    const item: ItemVenta = {
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: precioActual,
      unidad: producto.unidad,
      peso_neto: neto,
      neto: neto,
      total_fruta: totalFruta,
      total_envases: totalEnvases,
      total: totalGeneral,

      lote_id: selectedLoteId || undefined,
      calibre: selectedCalibre || undefined,
      variedad: loteSeleccionado?.variedad || undefined,

      ...(envaseSeleccionado ? {
        envase_id: envaseSeleccionado.id,
        envase_nombre: envaseSeleccionado.nombre,
        envase_cantidad: cantEnvases,
        envase_precio_unitario: envaseSeleccionado.precio_venta
      } : {})
    };

    onAgregar(item);

    // Reset inputs for next caliber/item of same product
    setPesoNeto('');
    setCantidad('');
    setSelectedCalibre(null);
    toast({ title: 'Agregado', description: `${item.variedad || ''} ${item.calibre || ''} añadido` });
  };

  const getCurrentValue = () => {
    if (activeInput === 'precio') return precioManual;
    if (activeInput === 'envases_cant') return cantidadEnvases;
    if (esKg) return pesoNeto;
    return cantidad;
  };

  const handleValueChange = (keyValue: string) => {
    const updateValue = (current: string) => {
      if (isFirstKey) {
        setIsFirstKey(false);
        return keyValue; // Overwrite
      }
      return current + keyValue; // Append
    };

    if (activeInput === 'precio') setPrecioManual(updateValue(precioManual));
    else if (activeInput === 'envases_cant') setCantidadEnvases(updateValue(cantidadEnvases));
    else if (esKg) setPesoNeto(updateValue(pesoNeto));
    else setCantidad(updateValue(cantidad));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <div className="flex flex-col h-full bg-white dark:bg-card">

          <div className="p-5 pb-2 overflow-y-auto max-h-[85vh] custom-scrollbar">
            <div className="mb-4">
              <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <DialogTitle className="text-xl font-black tracking-tight uppercase leading-tight text-foreground flex items-center gap-2">
                    {producto.nombre}
                    {reservaActiva && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">
                    MERCADO MAYORISTA · {unitLabel}
                  </DialogDescription>
                </div>
                <Badge variant="secondary" className="font-black text-[10px] h-7 px-2.5 bg-primary/10 text-primary border-none rounded-lg">
                  STOCK: {producto.stock_actual}
                </Badge>
              </DialogHeader>

              {/* Lotes y Variedades */}
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-80">Partida / Pallet</span>
                  </div>
                  {loteSeleccionado && (
                    <span className="text-[10px] font-black text-primary/60">{loteSeleccionado.stock_actual_kg.toFixed(0)}kg Disponibles</span>
                  )}
                </div>

                {lotes.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 px-1 -mx-1 custom-scrollbar">
                    {lotes.map(l => {
                      const hasReserva = reservas.some(r => r.lote_id === l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLoteId(l.id === selectedLoteId ? null : l.id)}
                          className={`shrink-0 px-4 py-2.5 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 min-w-[100px] relative ${selectedLoteId === l.id ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-border/10 bg-muted/30 hover:bg-muted/50'}`}
                        >
                          {hasReserva && (
                            <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                              <Star className="h-2.5 w-2.5 fill-current" />
                            </div>
                          )}
                          <span className="text-[9px] font-black opacity-60 uppercase leading-none">{l.variedad}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black">{l.origen === 'nacional' ? '🇨🇱' : '🌎'}</span>
                            <span className="text-[10px] font-black">{l.nombre_producto.split(' ')[0]}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Calibres - Siempre visibles si existen en catálogo o lote */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Ruler className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Talla / Calibre</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {calibresDisponibles.map(c => {
                      const lCal = loteSeleccionado?.calibres.find(lc => lc.calibre === c);
                      return (
                        <button
                          key={c}
                          onClick={() => setSelectedCalibre(c === selectedCalibre ? null : c)}
                          className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${selectedCalibre === c ? 'bg-primary border-primary text-white shadow-md' : 'bg-background border-border/20 text-muted-foreground hover:border-primary/20'}`}
                        >
                          {c}
                          {lCal && <span className="block text-[8px] opacity-60 leading-none mt-0.5">{lCal.cantidad_cajas}u</span>}
                        </button>
                      );
                    })}
                    {calibresDisponibles.length === 0 && (
                      <span className="text-[10px] text-muted-foreground opacity-40 italic">Sin calibres definidos</span>
                    )}
                  </div>
                </div>

                {reservaActiva && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase leading-none mb-0.5">Reserva Detectada</p>
                      <p className="text-xs font-bold text-amber-600">Para: {reservaActiva.cliente_nombre}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-amber-500 ml-auto" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div
                  className={`px-4 py-2 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === 'precio' ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200' : 'border-transparent bg-muted/40 hover:bg-muted/60'}`}
                  onClick={() => {
                    setActiveInput('precio');
                    setIsFirstKey(true);
                    if (!precioManual) setPrecioManual(precioActual.toString());
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase block leading-none">Precio Unitario ({unitLabel})</span>
                    {isPriceModified && <Badge className="bg-amber-500 text-white border-none text-[8px] h-4 py-0">MANUAL</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-black ${activeInput === 'precio' ? 'text-amber-600' : 'text-foreground'}`}>
                      {formatCLPCurrency(precioActual)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">MÉTODO DE PAGO</span>
                  <Badge variant="outline" className="text-[10px] font-black opacity-80 border-border/40">PESO REAL (EFECT./TRANSF.)</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              {/* Pantalla de Pesaje Principal */}
              <div
                className={`bg-muted dark:bg-muted/20 p-6 rounded-[2.5rem] text-center transition-all border-2 relative overflow-hidden ${activeInput === 'neto' || activeInput === 'cantidad' ? 'border-primary shadow-2xl scale-[1.02] bg-white dark:bg-card' : 'border-transparent opacity-80'}`}
                onClick={() => {
                  setActiveInput(esKg ? 'neto' : 'cantidad');
                  setIsFirstKey(true);
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/10" />
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2 opacity-50">
                  {esKg ? 'Peso Neto Certificado' : 'Cantidad de Unidades'}
                </p>
                <div className="text-7xl font-mono font-black tracking-tighter text-foreground leading-none">
                  {esKg ? (pesoNeto || '0') : (cantidad || '0')}
                  <span className="text-2xl ml-1 text-primary/40 font-black">{unitLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Selección de Envases */}
                <div className="bg-muted/40 dark:bg-muted/5 rounded-3xl p-4 border border-border/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Envase</span>
                    {envaseSeleccionado && <span className="text-[10px] font-black text-primary">+{envaseSeleccionado.precio_venta}</span>}
                  </div>

                  <div className="flex gap-1.5">
                    {TIPOS_ENVASES.slice(0, 3).map(e => (
                      <button
                        key={e.id}
                        onClick={() => setEnvaseId(envaseId === e.id ? null : e.id)}
                        className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl transition-all border-2 ${envaseId === e.id ? 'bg-primary border-primary text-white shadow-md' : 'bg-background border-border/10 text-muted-foreground hover:border-primary/20'}`}
                      >
                        <Package className="h-4 w-4 mb-1" />
                        <span className="text-[9px] font-black uppercase leading-none text-center">{e.nombre.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad Envases */}
                <div
                  className={`rounded-3xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${activeInput === 'envases_cant' ? 'border-primary bg-primary/5 shadow-md' : 'bg-muted/40 border-border/10'}`}
                  onClick={() => {
                    setActiveInput('envases_cant');
                    setIsFirstKey(true);
                  }}
                >
                  <span className="text-[10px] font-black text-muted-foreground uppercase">Cant. Envases</span>
                  <div className="text-3xl font-black text-foreground text-center">{cantidadEnvases}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-5 bg-primary/10 rounded-[2rem] border-2 border-primary/20 shadow-inner mb-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest leading-none block mb-1">Total a Cobrar</span>
                <div className="text-4xl font-black text-primary tracking-tighter leading-none">
                  {formatCLPCurrency(totalGeneral)}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-[9px] font-black text-primary/60 uppercase">Fruta: {formatCLPCurrency(totalFruta)}</div>
                <div className="text-[9px] font-black text-primary/60 uppercase">Cajas: {formatCLPCurrency(totalEnvases)}</div>
                <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden mt-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-primary" />
                </div>
              </div>
            </div>

            <div className="px-1 mb-2">
              <NumericKeypad
                onKeyClick={handleValueChange}
                onDelete={() => {
                  const updateDelete = (current: string) => current.slice(0, -1);
                  if (activeInput === 'precio') setPrecioManual(updateDelete(precioManual));
                  else if (activeInput === 'envases_cant') setCantidadEnvases(updateDelete(cantidadEnvases));
                  else if (esKg && activeInput === 'neto') setPesoNeto(updateDelete(pesoNeto));
                  else setCantidad(updateDelete(cantidad));
                  setIsFirstKey(false);
                }}
                onClear={() => {
                  if (activeInput === 'precio') setPrecioManual('');
                  else if (activeInput === 'envases_cant') setCantidadEnvases('');
                  else if (esKg && activeInput === 'neto') setPesoNeto('');
                  else setCantidad('');
                  setIsFirstKey(true);
                }}
              />
            </div>
          </div>

          <div className="p-5 pt-3 grid grid-cols-2 gap-4 border-t border-border/10 bg-muted/20">
            <Button variant="ghost" onClick={onClose} className="h-14 rounded-2xl font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all">
              Cerrar
            </Button>
            <Button
              onClick={handleAgregar}
              disabled={!isReadyToAdd}
              className="h-14 rounded-2xl font-black uppercase tracking-widest bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Listar Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

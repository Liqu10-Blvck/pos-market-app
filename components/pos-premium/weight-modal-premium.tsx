'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Producto, ItemVenta, TipoEnvase, Lote, Reserva, UnidadMedida } from '@/lib/types/pos';
import { LoteService } from '@/lib/services/lote.service';
import { formatCLPCurrency } from '@/lib/utils';
import { NumericKeypad } from './numeric-keypad';
import { Package, Ruler, Star, Scale, Hash, Box, Info, X, Trash2, ChevronDown, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';

interface WeightModalPremiumProps {
  producto: Producto | null;
  open: boolean;
  onClose: () => void;
  onAgregar: (item: ItemVenta) => void;
  clienteId?: string;
}

export function WeightModalPremium({ producto, open, onClose, onAgregar, clienteId }: WeightModalPremiumProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // -- UI State --
  const [activeInput, setActiveInput] = useState<'peso_bruto' | 'tara' | 'cantidad' | 'precio' | 'envases_cant' | 'bultos'>('peso_bruto');
  const [isFirstKey, setIsFirstKey] = useState(true);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadMedida>('kg');

  // -- Input States --
  const [pesoFruta, setPesoFruta] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [cantidadUnid, setCantidadUnid] = useState(''); 
  const [cantidadCajas, setCantidadCajas] = useState(''); 
  const [cantidadEnvases, setCantidadEnvases] = useState('1');
  const [envaseId, setEnvaseId] = useState<string | null>(null);

  // -- Data States --
  const [catalogoEnvases, setCatalogoEnvases] = useState<TipoEnvase[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [selectedCalibre, setSelectedCalibre] = useState<string | null>(null);

  const envaseSeleccionado = useMemo(() => catalogoEnvases.find(e => e.id === envaseId) || null, [envaseId, catalogoEnvases]);
  const loteSeleccionado = useMemo(() => lotes.find(l => l.id === selectedLoteId) || null, [lotes, selectedLoteId]);

  const esVentaPorPeso = unidadSeleccionada === 'kg';
  const esVentaPorCaja = unidadSeleccionada === 'caja';

  const pesoFrutaNum = parseFloat(pesoFruta) || 0;
  const cantEnvasesNum = parseInt(cantidadEnvases) || 0;
  
  const precioSugerido = loteSeleccionado?.precio_sugerido || producto?.precio || 0;
  const precioActual = precioManual !== '' ? (parseFloat(precioManual) || 0) : precioSugerido;

  const qFinal = esVentaPorPeso 
    ? pesoFrutaNum
    : (esVentaPorCaja ? (parseInt(cantidadCajas) || 0) : (parseInt(cantidadUnid) || 0));

  const totalFruta = qFinal * precioActual;
  const totalEnvases = cantEnvasesNum * (envaseSeleccionado?.precio_venta || 0);
  const totalGeneral = totalFruta + totalEnvases;

  const isPriceLocked = producto?.precio_bloqueado;
  const canEditPrice = !isPriceLocked || user?.role === 'admin';

  const isReadyToAdd = qFinal > 0 && precioActual > 0;

  useEffect(() => {
    if (open && producto) {
      setUnidadSeleccionada(producto.unidad);
      setPesoFruta('');
      setPrecioManual(producto.precio.toString());
      setEnvaseId(null);
      setCantidadEnvases('1');
      setSelectedLoteId(null);
      setSelectedCalibre(null);
      setIsFirstKey(true);

      if (producto.unidad === 'kg') setActiveInput('peso_bruto');
      else if (producto.unidad === 'caja') setActiveInput('bultos');
      else setActiveInput('cantidad');

      if (user?.tenantId && user?.sucursalesIds?.[0]) {
        LoteService.obtenerLotesDisponibles(producto.id, user.tenantId, user.sucursalesIds[0]).then(lotesData => {
          setLotes(lotesData);
          if (lotesData.length > 0) setSelectedLoteId(lotesData[0].id);
        });
      } else {
        setLotes([]);
      }

      const unsubEnvases = onSnapshot(collection(db, 'envases'), (snapshot) => {
        setCatalogoEnvases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TipoEnvase[]);
      });

      return () => unsubEnvases();
    }
  }, [open, producto]);

  const handleAgregar = () => {
    if (!isReadyToAdd || !producto) return;

    // Validación de stock estricta
    const stockDisponible = esVentaPorPeso 
      ? (loteSeleccionado?.stock_actual_kg || 0) 
      : (loteSeleccionado?.stock_actual_cajas || 0);

    if (qFinal > stockDisponible) {
      toast({ 
        title: 'Stock Insuficiente', 
        description: `Solo hay ${stockDisponible.toFixed(2)} ${unidadSeleccionada} disponibles en este lote.`, 
        variant: 'destructive' 
      });
      return;
    }

    onAgregar({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_unitario: precioActual,
      unidad: unidadSeleccionada,
      peso_neto: esVentaPorPeso ? qFinal : 0,
      neto: qFinal,
      cantidad: esVentaPorPeso ? 1 : qFinal,
      total_fruta: totalFruta,
      total_envases: totalEnvases,
      total: totalGeneral,
      lote_id: selectedLoteId,
      calibre: selectedCalibre,
      variedad: loteSeleccionado?.variedad || null,
      origen: loteSeleccionado?.origen || null,
      envase_id: envaseId || null,
      envase_nombre: envaseSeleccionado?.nombre || null,
      envase_cantidad: cantEnvasesNum || 0,
      envase_precio_unitario: envaseSeleccionado?.precio_venta || 0,
      peso_bruto: esVentaPorPeso ? pesoFrutaNum : 0,
      tara: 0,
    });
    toast({ title: 'Agregado', description: `${producto.nombre} añadido` });
    onClose();
  };

  const handleKeyClick = (key: string) => {
    const update = (prev: string) => {
      if (isFirstKey) {
        setIsFirstKey(false);
        return key === '.' ? '0.' : key;
      }
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    };
    if (activeInput === 'precio') setPrecioManual(update(precioManual));
    else if (activeInput === 'envases_cant') setCantidadEnvases(update(cantidadEnvases));
    else if (activeInput === 'bultos') setCantidadCajas(update(cantidadCajas));
    else if (activeInput === 'peso_bruto') setPesoFruta(update(pesoFruta));
    else if (activeInput === 'cantidad') setCantidadUnid(update(cantidadUnid));
  };

  const handleBackspace = () => {
    const back = (prev: string) => prev.slice(0, -1);
    if (activeInput === 'precio') setPrecioManual(back(precioManual));
    else if (activeInput === 'envases_cant') setCantidadEnvases(back(cantidadEnvases));
    else if (activeInput === 'bultos') setCantidadCajas(back(cantidadCajas));
    else if (activeInput === 'peso_bruto') setPesoFruta(back(pesoFruta));
    else if (activeInput === 'cantidad') setCantidadUnid(back(cantidadUnid));
  };

  if (!producto) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-card shadow-2xl rounded-[2.5rem]">
        <div className="flex flex-col">
          <div className="p-4 pb-2 overflow-y-auto max-h-[55vh] custom-scrollbar">
            <DialogHeader className="mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black uppercase text-foreground leading-tight">{producto.nombre}</DialogTitle>
                  <DialogDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                    Mayorista · {unidadSeleccionada}
                  </DialogDescription>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none h-8 font-black uppercase text-[10px]">
                  {formatCLPCurrency(precioActual)} / {unidadSeleccionada}
                </Badge>
              </div>
            </DialogHeader>

            {/* Unidad y Lote */}
            <div className="space-y-4 mb-6">
              {(producto.unidades_permitidas && producto.unidades_permitidas.length > 1) && (
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted/30 rounded-2xl border border-border/5">
                  {producto.unidades_permitidas.map(u => (
                    <button key={u} onClick={() => setUnidadSeleccionada(u)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${unidadSeleccionada === u ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-background/50'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {lotes.map(l => (
                  <button key={l.id} onClick={() => setSelectedLoteId(l.id === selectedLoteId ? null : l.id)}
                    className={`shrink-0 px-3 py-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedLoteId === l.id ? 'border-primary bg-primary/5' : 'border-border/10 opacity-50grayscale'}`}>
                    <span className="text-lg leading-none">{l.origen === 'nacional' ? '🇨🇱' : '🌎'}</span>
                    <span className="text-[9px] font-black uppercase">{l.variedad}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pantalla de Entrada */}
            <div className="space-y-4 mb-6">
              {esVentaPorPeso ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer text-center ${activeInput === 'peso_bruto' ? 'border-primary bg-primary/5 shadow-inner' : 'border-transparent bg-muted/40'}`}
                    onClick={() => { setActiveInput('peso_bruto'); setIsFirstKey(true); }}>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 block">Peso de Fruta (KG)</span>
                    <div className="text-4xl font-black">{pesoFruta || '0.000'}</div>
                    {activeInput === 'peso_bruto' && <div className="text-[8px] font-black text-primary uppercase mt-0.5">Editando...</div>}
                  </div>
                  
                  {/* Info Compacta Side-by-Side */}
                  <div className="bg-muted/30 rounded-2xl p-3 border border-border/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{loteSeleccionado?.origen === 'nacional' ? '🇨🇱' : '🌎'}</span>
                        <div>
                          <p className="text-[7px] font-black uppercase text-muted-foreground opacity-60 leading-none">Partida</p>
                          <p className="text-[10px] font-black uppercase truncate max-w-[80px]">{loteSeleccionado?.variedad || 'Variedad'}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black uppercase text-muted-foreground opacity-60 leading-none">Calibre</p>
                        <p className="text-[10px] font-black uppercase text-primary">{selectedCalibre || '-'}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-right border-r pr-3 border-border/20">
                           <p className="text-[7px] font-black uppercase text-muted-foreground opacity-60 leading-none">Stock KG</p>
                           <p className="text-[10px] font-black">{loteSeleccionado?.stock_actual_kg.toFixed(0) || 0}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[7px] font-black uppercase text-muted-foreground opacity-60 leading-none">Cajas</p>
                           <p className="text-[10px] font-black text-amber-600">{loteSeleccionado?.stock_actual_cajas || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer text-center ${activeInput === (esVentaPorCaja ? 'bultos' : 'cantidad') ? 'border-primary bg-primary/5 shadow-inner' : 'border-transparent bg-muted/40'}`}
                  onClick={() => { setActiveInput(esVentaPorCaja ? 'bultos' : 'cantidad'); setIsFirstKey(true); }}>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 block">Cantidad de {unidadSeleccionada}</span>
                  <div className="text-5xl font-black">{esVentaPorCaja ? (cantidadCajas || '0') : (cantidadUnid || '0')}</div>
                  {activeInput === (esVentaPorCaja ? 'bultos' : 'cantidad') && <div className="text-[8px] font-black text-primary uppercase mt-0.5">Editando...</div>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${activeInput === 'precio' ? 'border-amber-500 bg-amber-500/5' : 'border-transparent bg-muted/30'} ${!canEditPrice ? 'opacity-50 grayscale' : ''}`}
                  onClick={() => { 
                    if (!canEditPrice) {
                      toast({ title: 'Bloqueado', description: 'Solo el administrador puede cambiar este precio', variant: 'destructive' });
                      return;
                    }
                    setActiveInput('precio'); 
                    setIsFirstKey(true); 
                  }}>
                  <span className="text-[8px] font-black text-muted-foreground uppercase mb-0.5 block flex items-center gap-1">
                    Precio {isPriceLocked && <Lock className="h-2 w-2 text-amber-500" />}
                  </span>
                  <div className="text-base font-black">{formatCLPCurrency(precioActual)}</div>
                  {isPriceLocked && !canEditPrice && <div className="absolute inset-0 bg-transparent flex items-center justify-center"></div>}
                </div>
                <div className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${activeInput === 'envases_cant' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'}`}
                  onClick={() => { setActiveInput('envases_cant'); setIsFirstKey(true); }}>
                  <span className="text-[8px] font-black text-muted-foreground uppercase mb-0.5 block">Envases</span>
                  <div className="text-base font-black">{cantidadEnvases} u.</div>
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-2xl border-2 border-primary/10">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black text-primary/60 uppercase">Total Final</span>
                    <div className="text-3xl font-black text-primary">{formatCLPCurrency(totalGeneral)}</div>
                  </div>
                  <div className="text-right text-[8px] font-bold text-primary/40 uppercase">
                    <div>Neto: {qFinal.toFixed(2)} {unidadSeleccionada}</div>
                    <div>Envases: {formatCLPCurrency(totalEnvases)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teclado */}
          <div className="p-6 pt-2 bg-muted/20">
             <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[10px] font-black uppercase opacity-40">Editando: {activeInput.replace('_', ' ')}</span>
                <button onClick={() => {
                  if (activeInput === 'precio') setPrecioManual('');
                  else if (activeInput === 'envases_cant') setCantidadEnvases('0');
                  else if (activeInput === 'bultos') setCantidadCajas('');
                  else if (activeInput === 'peso_bruto') setPesoFruta('');
                  else setCantidadUnid('');
                  setIsFirstKey(true);
                }} className="text-[10px] font-black text-primary uppercase">Limpiar</button>
             </div>
             <NumericKeypad 
               onKeyClick={handleKeyClick} 
               onDelete={handleBackspace} 
               onClear={() => {
                 if (activeInput === 'precio') setPrecioManual('');
                 else if (activeInput === 'envases_cant') setCantidadEnvases('0');
                 else if (activeInput === 'bultos') setCantidadCajas('');
                 else if (activeInput === 'peso_bruto') setPesoFruta('');
                 else setCantidadUnid('');
                 setIsFirstKey(true);
               }}
             />
             <div className="grid grid-cols-2 gap-4 mt-6">
                <Button variant="ghost" onClick={onClose} className="h-14 rounded-2xl font-black uppercase text-xs opacity-50">Cancelar</Button>
                <Button onClick={handleAgregar} disabled={!isReadyToAdd} className="h-14 rounded-2xl font-black uppercase shadow-xl shadow-primary/20">Listar Venta</Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

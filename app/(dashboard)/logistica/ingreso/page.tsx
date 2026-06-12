'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Producto, Lote, LoteCalibre, TipoEnvase } from '@/lib/types/pos';
import { LoteService } from '@/lib/services/lote.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  ChevronRight,
  ChevronLeft,
  Save,
  Printer,
  Package,
  Scale,
  TrendingUp,
  LayoutGrid,
  Zap,
  CheckCircle2,
  Trash2,
  History,
  Box,
  Truck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCLPCurrency } from '@/lib/utils';
import Image from 'next/image';

type Step = 'producto' | 'bulto' | 'medidas' | 'detalles';

const getProductoImagen = (nombre: string) => {
  const n = nombre.toLowerCase();
  if (n.includes('palta')) return '/products/palta.jpg';
  if (n.includes('manzana')) return '/products/manzana.jpg';
  if (n.includes('tomate')) return '/products/tomate.jpg';
  if (n.includes('platano') || n.includes('banano')) return '/products/banano.jpg';
  if (n.includes('mango')) return '/products/mango.jpg';
  if (n.includes('piña')) return '/products/pina.jpg';
  return null;
};

export default function IngresoMercaderiaPage() {
  const [currentStep, setCurrentStep] = useState<Step>('producto');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // -- Form State --
  const [productoId, setProductoId] = useState<string>('');
  const [variedad, setVariedad] = useState<string>('');
  const [origen, setOrigen] = useState<'nacional' | 'internacional'>('nacional');
  const [tipoBulto, setTipoBulto] = useState<'pallet' | 'bin' | 'saco'>('pallet');
  const [cantidadBultos, setCantidadBultos] = useState<string>('1');
  const [pesoTotal, setPesoTotal] = useState<string>('');
  const [costoUnidad, setCostoUnidad] = useState<string>('');
  const [precioSugerido, setPrecioSugerido] = useState<string>('');
  const [envaseId, setEnvaseId] = useState<string>('');
  const [calibres, setCalibres] = useState<LoteCalibre[]>([]);
  const [isModoSimple, setIsModoSimple] = useState(true);
  const [cantidadCajasSimple, setCantidadCajasSimple] = useState<string>('0');
  
  // -- UI Feedback --
  const [errorPeso, setErrorPeso] = useState(false);
  
  // -- Meta Data --
  const [envases, setEnvases] = useState<TipoEnvase[]>([]);
  const [procesando, setProcesando] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const productoSeleccionado = useMemo(() => productos.find(p => p.id === productoId), [productoId, productos]);
  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      query(collection(db, 'productos'), where('tenantId', '==', user.tenantId || 'default-tenant')), 
      (snapshot) => {
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Producto[]);
      }
    );
    const unsubEnvases = onSnapshot(collection(db, 'envases'), (snapshot) => {
      setEnvases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TipoEnvase[]);
    });
    return () => { unsub(); unsubEnvases(); };
  }, [user]);

  const handleSelectProducto = (p: Producto) => {
    setProductoId(p.id);
    setPrecioSugerido(p.precio.toString());
    setCostoUnidad(p.costo_referencia?.toString() || '');
    setIsModoSimple(p.unidad !== 'kg');
    setCurrentStep('bulto');
  };

  const nextStepMedidas = () => {
    const esPalta = productoSeleccionado?.nombre.toLowerCase().includes('palta');
    if (esPalta && !pesoTotal) {
      setErrorPeso(true);
      toast({ title: 'Peso requerido', description: 'El peso es obligatorio para ingresar Palta.', variant: 'destructive' });
      return;
    }
    setErrorPeso(false);
    setCurrentStep('detalles');
  };

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'producto', label: 'Qué llegó', icon: Package },
    { id: 'bulto', label: 'Cómo llegó', icon: Truck },
    { id: 'medidas', label: 'Cuánto es', icon: Scale },
    { id: 'detalles', label: 'Detalles', icon: LayoutGrid },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleGuardar = async () => {
    if (!productoSeleccionado) return;
    const esPalta = productoSeleccionado.nombre.toLowerCase().includes('palta');

    if (!variedad || (esPalta && !pesoTotal) || !precioSugerido) {
      toast({ title: 'Error', description: 'Completa los campos obligatorios', variant: 'destructive' });
      return;
    }

    setProcesando(true);
    try {
      const calibresFinales = isModoSimple 
        ? [{ calibre: 'STD', cantidad_cajas: parseInt(cantidadCajasSimple) || 0 }]
        : calibres;

      const totalCajasFinal = isModoSimple 
        ? (parseInt(cantidadCajasSimple) || 0) 
        : calibres.reduce((sum, c) => sum + c.cantidad_cajas, 0);

      const cantBultosNum = parseInt(cantidadBultos) || 1;

      for (let i = 0; i < cantBultosNum; i++) {
        await LoteService.registrarLote({
          producto_id: productoId,
          nombre_producto: productoSeleccionado.nombre,
          unidad: productoSeleccionado.unidad,
          variedad,
          origen,
          calibres: calibresFinales,
          peso_total_neto: (parseFloat(pesoTotal) || 0) / cantBultosNum,
          costo_unidad: parseFloat(costoUnidad) || 0,
          precio_sugerido: parseFloat(precioSugerido),
          tipo_bulto: tipoBulto as any,
          envase_id: envaseId || undefined,
          envase_cantidad_total: Math.ceil(totalCajasFinal / cantBultosNum)
        }, user?.tenantId || 'default-tenant', user?.sucursalesIds?.[0] || 'default-sucursal');
      }

      toast({ title: 'Éxito', description: `${cantBultosNum} Bultos registrados correctamente` });
      router.push('/logistica');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#F3F4F6] dark:bg-neutral-950 overflow-hidden">
      {/* Header Premium con Progreso */}
      <div className="bg-white dark:bg-neutral-900 border-b border-zinc-200 dark:border-neutral-800 shadow-sm z-20">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
               <button onClick={() => currentStep === 'producto' ? router.back() : setCurrentStep(steps[currentStepIndex-1].id)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 transition-colors">
                 <ChevronLeft className="h-5 w-5" />
               </button>
               <div>
                  <h1 className="text-lg font-black uppercase tracking-tight">Ingreso de Mercadería</h1>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paso {currentStepIndex + 1} de 4 · {steps[currentStepIndex].label}</p>
               </div>
            </div>
            {productoSeleccionado && (
              <Badge variant="outline" className="h-10 px-4 rounded-xl font-black uppercase border-primary/20 bg-primary/5 text-primary gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {productoSeleccionado.nombre}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2 relative">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === currentStep;
              const isPast = steps.findIndex(st => st.id === currentStep) > idx;

              return (
                <div key={s.id} className="flex-1 relative">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${isPast || isActive ? 'bg-primary' : 'bg-zinc-200 dark:bg-neutral-800'}`} />
                  <div className={`mt-4 flex items-center gap-2 transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1'}`}>
                     <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-100 dark:bg-neutral-800 border border-zinc-200 dark:border-transparent'}`}>
                        <Icon className="h-3.5 w-3.5" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full p-6 custom-scrollbar relative">
        <div className="max-w-5xl mx-auto min-h-[60vh] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {/* PASO 1: SELECCIÓN DE PRODUCTO */}
            {currentStep === 'producto' && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                className="w-full space-y-8"
              >
                <div className="text-center max-w-md mx-auto space-y-2">
                   <h2 className="text-3xl font-black tracking-tight uppercase">¿Qué fruta llegó hoy?</h2>
                   <p className="text-sm font-medium text-neutral-500">Busca y selecciona el producto para iniciar el pesaje y desglose.</p>
                </div>

                <div className="relative max-w-xl mx-auto">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400" />
                   <Input 
                     placeholder="Buscar manzana, palta, naranja..."
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="h-16 pl-14 rounded-[2rem] border-2 border-zinc-200 bg-white dark:bg-neutral-900 shadow-xl shadow-zinc-200/50 dark:shadow-none text-lg font-bold focus:ring-4 ring-primary/20 transition-all focus:border-primary"
                   />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {productosFiltrados.map((p) => {
                    const img = getProductoImagen(p.nombre);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProducto(p)}
                        className="group relative h-40 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 rounded-[2.5rem] border-2 border-zinc-100 dark:border-neutral-800 hover:border-primary hover:shadow-2xl transition-all overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-20 w-full relative mb-2">
                          {img ? (
                            <Image 
                              src={img} 
                              alt={p.nombre} 
                              fill 
                              className="object-contain p-2 group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-neutral-800 rounded-2xl group-hover:bg-primary/10 transition-colors">
                              <Package className="h-8 w-8 text-zinc-300 group-hover:text-primary" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black uppercase text-center px-4 leading-tight group-hover:text-primary transition-colors">{p.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* PASO 2: LOGÍSTICA (Bultos y Origen) */}
            {currentStep === 'bulto' && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-3xl space-y-12"
              >
                <div className="text-center space-y-2">
                   <h2 className="text-3xl font-black tracking-tight uppercase">Configuración de Carga</h2>
                   <p className="text-sm font-medium text-neutral-500">¿Cómo viene el producto {productoSeleccionado?.nombre}?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-2">Origen del Producto</Label>
                      <div className="grid grid-cols-2 gap-3 bg-zinc-100 dark:bg-neutral-900 p-2 rounded-[2rem] border border-zinc-200 dark:border-neutral-800">
                         <button onClick={() => setOrigen('nacional')} className={`h-16 rounded-3xl flex items-center justify-center gap-3 transition-all ${origen === 'nacional' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-zinc-200 dark:hover:bg-neutral-800 opacity-40'}`}>
                            <span className="text-2xl">🇨🇱</span>
                            <span className="font-black uppercase text-xs">Nacional</span>
                         </button>
                         <button onClick={() => setOrigen('internacional')} className={`h-16 rounded-3xl flex items-center justify-center gap-3 transition-all ${origen === 'internacional' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-zinc-200 dark:hover:bg-neutral-800 opacity-40'}`}>
                            <span className="text-2xl">🌎</span>
                            <span className="font-black uppercase text-xs">Importado</span>
                         </button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-2">¿En qué viene apoyado?</Label>
                      <div className="grid grid-cols-3 gap-3">
                         {[
                           { id: 'pallet', label: 'Pallet', icon: LayoutGrid },
                           { id: 'bin', label: 'Bines', icon: Box },
                           { id: 'saco', label: 'Sacos', icon: Package }
                         ].map(b => {
                           const Icon = b.icon;
                           return (
                             <button key={b.id} onClick={() => setTipoBulto(b.id as any)} className={`h-28 rounded-[2rem] flex flex-col items-center justify-center gap-2 border-2 transition-all ${tipoBulto === b.id ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grayscale opacity-40 hover:border-zinc-300'}`}>
                                <Icon className="h-6 w-6" />
                                <span className="font-black uppercase text-[10px]">{b.label}</span>
                             </button>
                           );
                         })}
                      </div>
                   </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] shadow-xl border-2 border-zinc-200 dark:border-neutral-800 flex flex-col items-center space-y-6">
                   <div className="text-center">
                     <Label className="text-[10px] font-black uppercase opacity-60 mb-2 block">¿Cuántos {tipoBulto}s son?</Label>
                     <div className="flex items-center gap-6">
                        <button onClick={() => setCantidadBultos(prev => Math.max(1, parseInt(prev) - 1).toString())} className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-neutral-800 border border-zinc-200 dark:border-transparent flex items-center justify-center text-2xl font-black hover:bg-zinc-200 transition-colors">-</button>
                        <Input 
                          type="number" 
                          value={cantidadBultos} 
                          onChange={e => setCantidadBultos(e.target.value)}
                          className="w-32 h-20 text-center text-6xl font-black border-none bg-transparent"
                        />
                        <button onClick={() => setCantidadBultos(prev => (parseInt(prev) + 1).toString())} className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-neutral-800 border border-zinc-200 dark:border-transparent flex items-center justify-center text-2xl font-black hover:bg-zinc-200 transition-colors">+</button>
                     </div>
                   </div>
                </div>

                <div className="flex justify-end gap-4">
                   <Button onClick={() => setCurrentStep('medidas')} size="lg" className="h-16 px-12 rounded-[2rem] font-black uppercase tracking-tight gap-3 shadow-xl shadow-primary/20">
                     Siguiente <ChevronRight className="h-5 w-5" />
                   </Button>
                </div>
              </motion.div>
            )}

            {/* PASO 3: MEDIDAS Y COSTOS */}
            {currentStep === 'medidas' && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-5xl space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                   {/* Col Left: Inputs */}
                   <div className="space-y-8">
                      <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-2 border-zinc-200 dark:border-neutral-800 shadow-sm space-y-8">
                         <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase opacity-60 flex items-center gap-2">
                               <Scale className="h-4 w-4 text-primary" /> Peso Total de la Carga (KG)
                            </Label>
                            <div className="relative group">
                               <Input 
                                 type="number" 
                                 value={pesoTotal}
                                 onChange={e => {
                                   setPesoTotal(e.target.value);
                                   if (e.target.value) setErrorPeso(false);
                                 }}
                                 placeholder="0.000"
                                 className={`h-24 text-6xl font-black border-2 bg-zinc-50 dark:bg-neutral-800/50 rounded-[2rem] px-8 transition-all group-hover:bg-zinc-100 focus:ring-4 ${errorPeso ? 'border-destructive ring-destructive/20 animate-shake' : 'border-transparent focus:border-primary ring-primary/20'}`}
                               />
                               <span className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black opacity-20">KG</span>
                            </div>
                            {errorPeso && (
                              <p className="text-[10px] font-black text-destructive uppercase animate-bounce ml-2">⚠️ El peso es obligatorio para la Palta</p>
                            )}
                            <p className="text-[10px] font-bold text-zinc-400 uppercase italic">
                               {productoSeleccionado?.nombre.toLowerCase().includes('palta') ? '* Obligatorio para Palta' : 'Opcional si es bulto cerrado'}
                            </p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black opacity-60 uppercase">Costo Referencia</Label>
                               <Input 
                                 type="number"
                                 value={costoUnidad}
                                 onChange={e => setCostoUnidad(e.target.value)}
                                 className="h-14 rounded-2xl bg-zinc-100 dark:bg-neutral-800 border-2 border-zinc-200 dark:border-transparent font-bold px-4 focus:border-primary transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black opacity-60 uppercase">Precio Venta Sug.</Label>
                               <Input 
                                 type="number"
                                 value={precioSugerido}
                                 onChange={e => setPrecioSugerido(e.target.value)}
                                 className="h-14 rounded-2xl bg-primary/5 border-2 border-primary/40 font-black text-primary px-4 focus:border-primary transition-all"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="bg-card dark:bg-neutral-900 p-6 rounded-[2rem] border-2 border-zinc-200 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-200 dark:border-transparent">
                               <Zap className="h-6 w-6" />
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase leading-tight">Variedad de Fruta</p>
                               <p className="text-[10px] font-bold text-zinc-400">Ej: Hass, Tommy, etc.</p>
                            </div>
                         </div>
                         <Input 
                           value={variedad}
                           onChange={e => setVariedad(e.target.value)}
                           className="w-48 h-12 bg-zinc-100 dark:bg-neutral-800 rounded-xl font-black uppercase text-center border-2 border-zinc-200 dark:border-transparent focus:border-primary transition-all shadow-sm"
                           placeholder="HASS"
                         />
                      </div>
                   </div>

                   {/* Col Right: Smart Preview Card */}
                   <div className="space-y-8">
                      <div className="bg-primary p-10 rounded-[4rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
                         <div className="absolute -right-20 -top-20 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
                         <div className="absolute -left-10 -bottom-10 h-40 w-40 bg-black/10 rounded-full blur-2xl" />
                         
                         <div className="relative space-y-10">
                            <div className="flex items-center justify-between">
                               <div className="bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md">
                                  <span className="text-[10px] font-black uppercase tracking-widest">{productoSeleccionado?.nombre}</span>
                               </div>
                               <Plus className="h-6 w-6" />
                            </div>

                            <div className="space-y-2">
                               <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Inversión Estimada</p>
                               <h3 className="text-6xl font-black tracking-tighter">
                                 {formatCLPCurrency((parseFloat(pesoTotal) || 0) * (parseFloat(costoUnidad) || 0))}
                               </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/20">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black opacity-60 uppercase">Peso x {tipoBulto}</p>
                                  <p className="text-2xl font-black">
                                    {((parseFloat(pesoTotal) || 0) / (parseInt(cantidadBultos) || 1)).toFixed(2)} KG
                                  </p>
                               </div>
                               <div className="space-y-1 text-right">
                                  <p className="text-[10px] font-black opacity-60 uppercase">Rentabilidad Sug.</p>
                                  <p className="text-2xl font-black text-green-300">
                                    +{(((parseFloat(precioSugerido) || 1) / (parseFloat(costoUnidad) || 1) - 1) * 100).toFixed(0)}%
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <Button onClick={() => setCurrentStep('bulto')} variant="outline" className="h-16 rounded-[2rem] font-black uppercase text-xs">Atrás</Button>
                         <Button onClick={nextStepMedidas} className="h-16 rounded-[2rem] font-black uppercase shadow-lg shadow-primary/20">Configurar Envase <ChevronRight className="h-4 w-4 ml-2" /></Button>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {/* PASO 4: DESGLOSE Y FINALIZACIÓN */}
            {currentStep === 'detalles' && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-5xl space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   {/* Left Col: Breakdown */}
                   <div className="lg:col-span-8 space-y-8">
                      <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-2 border-zinc-200 dark:border-neutral-800 shadow-sm min-h-[400px]">
                         <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                               <LayoutGrid className="h-6 w-6 text-primary" /> Desglose por Calibre
                            </h3>
                            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-neutral-700">
                               <button onClick={() => setIsModoSimple(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isModoSimple ? 'bg-white dark:bg-neutral-700 shadow-sm text-primary' : 'opacity-40'}`}>Simple</button>
                               <button onClick={() => setIsModoSimple(false)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isModoSimple ? 'bg-white dark:bg-neutral-700 shadow-sm text-primary' : 'opacity-40'}`}>Detalle</button>
                            </div>
                         </div>

                         <div className="space-y-6">
                            {isModoSimple ? (
                               <div className="flex flex-col items-center justify-center p-12 space-y-6 bg-zinc-50 dark:bg-neutral-800/20 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-neutral-800">
                                  <Label className="text-[10px] font-black uppercase opacity-60">Cantidad total de bultos/cajas</Label>
                                  <div className="flex items-center gap-8">
                                     <button onClick={() => setCantidadCajasSimple(prev => Math.max(0, parseInt(prev) - 1).toString())} className="h-16 w-16 bg-zinc-100 dark:bg-neutral-800 border border-zinc-200 dark:border-transparent rounded-3xl flex items-center justify-center text-3xl font-black shadow-sm transition-colors hover:bg-zinc-200">-</button>
                                     <Input 
                                       type="number" 
                                       value={cantidadCajasSimple}
                                       onChange={e => setCantidadCajasSimple(e.target.value)}
                                       className="h-24 w-40 border-none bg-transparent text-center text-7xl font-black focus:ring-0"
                                     />
                                     <button onClick={() => setCantidadCajasSimple(prev => (parseInt(prev) + 1).toString())} className="h-16 w-16 bg-zinc-100 dark:bg-neutral-800 border border-zinc-200 dark:border-transparent rounded-3xl flex items-center justify-center text-3xl font-black shadow-sm transition-colors hover:bg-zinc-200">+</button>
                                  </div>
                               </div>
                            ) : (
                               <div className="space-y-4">
                                  <div className="flex flex-wrap gap-2 mb-6 p-4 bg-primary/5 rounded-[2rem] border-2 border-primary/20">
                                     {['Extra', '1ra', '2da', '3ra', '4ta', '12', '18', '20', '22', 'Mixto'].map(c => (
                                       <button key={c} onClick={() => !calibres.find(cl => cl.calibre === c) && setCalibres([...calibres, { calibre: c, cantidad_cajas: 0 }])} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${calibres.find(cl => cl.calibre === c) ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-neutral-800 border-zinc-200 dark:border-neutral-700 hover:border-primary/50'}`}>
                                          {c}
                                       </button>
                                     ))}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                    {calibres.map((c, idx) => (
                                      <div key={idx} className="bg-zinc-50 dark:bg-neutral-800/40 p-4 rounded-3xl flex items-center justify-between border-2 border-zinc-100 dark:border-neutral-800 transition-all hover:border-primary/30 shadow-sm">
                                         <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-white dark:bg-neutral-700 rounded-2xl flex items-center justify-center font-black text-xs text-primary border border-zinc-200 dark:border-transparent shadow-sm">{c.calibre[0]}</div>
                                            <span className="font-black uppercase text-[10px]">{c.calibre}</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                            <Input 
                                              type="number"
                                              className="w-20 h-10 border-2 border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-xl text-center font-black focus:border-primary transition-all shadow-inner"
                                              value={c.cantidad_cajas || ''}
                                              onChange={e => {
                                                const newCal = [...calibres];
                                                newCal[idx].cantidad_cajas = parseInt(e.target.value) || 0;
                                                setCalibres(newCal);
                                              }}
                                            />
                                            <button onClick={() => setCalibres(calibres.filter((_, i) => i !== idx))} className="text-destructive/30 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                                         </div>
                                      </div>
                                    ))}
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>

                   {/* Right Col: Summary & Actions */}
                   <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-2 border-zinc-200 dark:border-neutral-800 shadow-sm space-y-8">
                          <div className="space-y-4">
                             <Label className="text-[10px] font-black opacity-60 uppercase pl-1">Tipo de Envase</Label>
                             <div className="grid grid-cols-1 gap-2">
                                {envases.slice(0, 4).map(e => (
                                  <button key={e.id} onClick={() => setEnvaseId(e.id)} className={`h-14 px-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${envaseId === e.id ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-100 dark:border-neutral-800 bg-zinc-50/50 hover:border-zinc-300'}`}>
                                     <Package className="h-5 w-5 opacity-40" />
                                     <span className="font-black uppercase text-[10px]">{e.nombre}</span>
                                     {envaseId === e.id && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                                  </button>
                                ))}
                             </div>
                          </div>
 
                          <div className="space-y-4 pt-4 border-t-2 border-zinc-100 dark:border-neutral-800">
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase opacity-60">
                                <span>Cajas Totales</span>
                                <span className="text-zinc-900 dark:text-white font-black">{isModoSimple ? cantidadCajasSimple : calibres.reduce((s, c) => s + c.cantidad_cajas, 0)} u.</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase opacity-60">
                                <span>Peso por Caja</span>
                                <span className="text-zinc-900 dark:text-white font-black">{((parseFloat(pesoTotal) || 0) / (parseInt(isModoSimple ? cantidadCajasSimple : calibres.reduce((s, c) => s + c.cantidad_cajas, 0).toString()) || 1)).toFixed(2)} KG</span>
                             </div>
                          </div>
                       </div>
                      <div className="flex flex-col gap-4">
                         <Button
                           onClick={handleGuardar}
                           disabled={procesando}
                           size="lg"
                           className="h-24 w-full rounded-[2.5rem] bg-primary text-white font-black text-xl uppercase shadow-2xl shadow-primary/30 tracking-tight gap-3 hover:scale-[1.02] transition-all"
                         >
                            <Save className={`${procesando ? 'animate-spin' : ''}`} />
                            {procesando ? 'Procesando...' : 'Finalizar Ingreso'}
                         </Button>
                         <Button onClick={() => setCurrentStep('medidas')} variant="ghost" className="h-14 rounded-[2rem] font-black uppercase text-xs opacity-40">Regresar</Button>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <div className="fixed -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
    </div>
  );
}

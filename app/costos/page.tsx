'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto } from '@/lib/types/pos';
import { CostosService } from '@/lib/services/costos.service';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  Sparkles, 
  Save, 
  Check, 
  Loader2, 
  Search, 
  ArrowRightLeft, 
  AlertCircle,
  Calendar,
  AlertTriangle,
  Barcode,
  Package,
  CalendarOff
} from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { motion, AnimatePresence } from 'framer-motion';

function CostosPage() {
  const [activeTab, setActiveTab] = useState<'precios' | 'vencimientos'>('precios');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  
  // Local states for inputs per product
  const [nuevosCostos, setNuevosCostos] = useState<Record<string, string>>({});
  const [margenesDeseados, setMargenesDeseados] = useState<Record<string, string>>({});
  const [guardandoProductoId, setGuardandoProductoId] = useState<string | null>(null);

  // Bulk operation states
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [aplicandoTodo, setAplicandoTodo] = useState(false);

  // AI assistant states
  const [aiContexto, setAiContexto] = useState('');
  const [aiRespuesta, setAiRespuesta] = useState<string | null>(null);
  const [aiCargando, setAiCargando] = useState(false);

  // Expiration-specific AI states
  const [aiRespuestaVencidos, setAiRespuestaVencidos] = useState<string | null>(null);
  const [aiCargandoVencidos, setAiCargandoVencidos] = useState(false);

  const { toast } = useToast();

  // Load products in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];
      
      const activeProducts = productosData.filter(p => p.activo !== false);
      setProductos(activeProducts.sort((a, b) => a.nombre.localeCompare(b.nombre)));

      // Initialize inputs from loaded database values
      const initialCostos: Record<string, string> = {};
      const initialMargenes: Record<string, string> = {};
      
      activeProducts.forEach(p => {
        initialCostos[p.id] = p.costo_actual ? p.costo_actual.toString() : '';
        initialMargenes[p.id] = p.margen_deseado ? p.margen_deseado.toString() : '30';
      });

      setNuevosCostos(prev => ({ ...initialCostos, ...prev }));
      setMargenesDeseados(prev => ({ ...initialMargenes, ...prev }));
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  // Expiration math helper
  const obtenerDiasParaVencer = (fechaCaducidad: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaCaducidad + 'T00:00:00');
    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtered product list (precios tab)
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  // Expiration-only products list
  const productosConVencimiento = productos
    .filter(p => p.fecha_caducidad)
    .sort((a, b) => new Date(a.fecha_caducidad!).getTime() - new Date(b.fecha_caducidad!).getTime());

  // Filtered expiration list
  const productosConVencimientoFiltrados = productosConVencimiento.filter(p =>
    p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  // Calculations
  const calcularPrecioSugerido = (productoId: string, costoActual?: number) => {
    const costoInput = nuevosCostos[productoId];
    const costo = costoInput !== undefined && costoInput !== '' ? parseFloat(costoInput) : (costoActual || 0);
    const margenInput = margenesDeseados[productoId] || '30';
    const margen = parseFloat(margenInput) || 0;
    
    if (costo <= 0) return 0;
    return Math.round(costo * (1 + margen / 100));
  };

  // Check if anything changed locally
  const esDiferente = (p: Producto) => {
    const costoOriginal = p.costo_actual !== undefined ? p.costo_actual.toString() : '';
    const margenOriginal = p.margen_deseado !== undefined ? p.margen_deseado.toString() : '30';
    
    const costoActual = nuevosCostos[p.id] || '';
    const margenActual = margenesDeseados[p.id] || '30';

    return costoOriginal !== costoActual || margenOriginal !== margenActual;
  };

  // Save changes for a single product (Cost and Margin)
  const handleGuardarProducto = async (p: Producto) => {
    const costoStr = nuevosCostos[p.id];
    const margenStr = margenesDeseados[p.id] || '30';

    if (!costoStr || isNaN(parseFloat(costoStr)) || parseFloat(costoStr) < 0) {
      toast({
        title: 'Costo inválido',
        description: `El costo para ${p.nombre} debe ser un número mayor o igual a 0.`,
        variant: 'destructive',
      });
      return;
    }

    const costoVal = parseFloat(costoStr);
    const margenVal = parseFloat(margenStr) || 0;

    setGuardandoProductoId(p.id);
    try {
      await CostosService.registrarCostoDiario(p.id, p.nombre, costoVal, margenVal);
      toast({
        title: 'Guardado',
        description: `Costo y margen para ${p.nombre} actualizados con éxito.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setGuardandoProductoId(null);
    }
  };

  // Save all changed costs/margins in bulk
  const handleGuardarTodo = async () => {
    const modificados = productos.filter(esDiferente);
    if (modificados.length === 0) {
      toast({
        title: 'Sin cambios',
        description: 'No hay costos ni márgenes modificados para guardar.',
      });
      return;
    }

    setGuardandoTodo(true);
    try {
      const batch = writeBatch(db);
      
      for (const p of modificados) {
        const costoVal = parseFloat(nuevosCostos[p.id]) || 0;
        const margenVal = parseFloat(margenesDeseados[p.id]) || 0;

        // Log daily cost
        const costoRef = doc(collection(db, 'costos_diarios'));
        batch.set(costoRef, {
          producto_id: p.id,
          nombre: p.nombre,
          costo: costoVal,
          fecha: Timestamp.now(),
          createdAt: Timestamp.now()
        });

        // Update product
        const productoRef = doc(db, 'productos', p.id);
        batch.update(productoRef, {
          costo_actual: costoVal,
          margen_deseado: margenVal,
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
      toast({
        title: 'Éxito',
        description: `Se guardaron los costos y márgenes de ${modificados.length} productos.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los costos.',
        variant: 'destructive',
      });
    } finally {
      setGuardandoTodo(false);
    }
  };

  // Apply suggested price for a single product
  const handleAplicarSugerido = async (p: Producto) => {
    const sugerido = calcularPrecioSugerido(p.id, p.costo_actual);
    if (sugerido <= 0) {
      toast({
        title: 'Precio sugerido inválido',
        description: 'Asegúrate de ingresar un costo primero.',
        variant: 'destructive',
      });
      return;
    }

    const margenVal = parseFloat(margenesDeseados[p.id]) || 0;

    try {
      await CostosService.actualizarPrecioVenta(p.id, sugerido, margenVal);
      toast({
        title: 'Precio aplicado',
        description: `Nuevo precio de venta para ${p.nombre} establecido en ${formatCLPCurrency(sugerido)}.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo aplicar el precio de venta.',
        variant: 'destructive',
      });
    }
  };

  // Apply all suggested prices in bulk
  const handleAplicarTodoSugerido = async () => {
    const productosConSugerencia = productos.filter(p => {
      const sugerido = calcularPrecioSugerido(p.id, p.costo_actual);
      return sugerido > 0 && sugerido !== p.precio;
    });

    if (productosConSugerencia.length === 0) {
      toast({
        title: 'Precios ya al día',
        description: 'Todos los precios actuales coinciden con los precios sugeridos.',
      });
      return;
    }

    setAplicandoTodo(true);
    try {
      const batch = writeBatch(db);

      productosConSugerencia.forEach(p => {
        const sugerido = calcularPrecioSugerido(p.id, p.costo_actual);
        const margenVal = parseFloat(margenesDeseados[p.id]) || 30;
        const productoRef = doc(db, 'productos', p.id);
        
        batch.update(productoRef, {
          precio: sugerido,
          margen_deseado: margenVal,
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      toast({
        title: 'Éxito',
        description: `Se actualizaron los precios de venta para ${productosConSugerencia.length} productos.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudieron aplicar los precios sugeridos.',
        variant: 'destructive',
      });
    } finally {
      setAplicandoTodo(false);
    }
  };

  // General marketing AI suggestions
  const handleGenerarMarketingIA = async () => {
    setAiCargando(true);
    setAiRespuesta(null);

    const payloadProductos = productos.map(p => ({
      nombre: p.nombre,
      stock_actual: p.stock_actual,
      unidad: p.unidad,
      precio: p.precio,
      costo_actual: nuevosCostos[p.id] ? parseFloat(nuevosCostos[p.id]) : (p.costo_actual || 0),
      margen_deseado: margenesDeseados[p.id] ? parseFloat(margenesDeseados[p.id]) : (p.margen_deseado || 30)
    }));

    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: payloadProductos,
          contexto: aiContexto
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      setAiRespuesta(data.sugerencias);
      toast({
        title: 'Recomendaciones listas',
        description: 'Gemini ha terminado de analizar tu negocio.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo obtener sugerencia de Gemini.',
        variant: 'destructive',
      });
    } finally {
      setAiCargando(false);
    }
  };

  // Gemini IA Expiration Liquidation Strategy Assistant
  const handleGenerarLiquidacionVencimientos = async () => {
    const vencidosONear = productosConVencimiento.filter(p => {
      const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
      return dias <= 30;
    });

    if (vencidosONear.length === 0) {
      toast({
        title: 'Todo al día',
        description: 'No tienes productos vencidos o próximos a vencer en los próximos 30 días.',
      });
      return;
    }

    setAiCargandoVencidos(true);
    setAiRespuestaVencidos(null);

    const promptContext = `
A continuación tienes la lista de productos de abarrotes de mi negocio que se encuentran ya VENCIDOS o PRÓXIMOS A VENCER (en menos de 30 días), con sus niveles de inventario en stock, costos y precios actuales.

Por favor, como asesor de marketing experto de POS, recomiéndame:
1. Ideas de combos o packs promocionales atractivos (cross-selling) para liquidar estos abarrotes rápidamente hoy mismo.
2. Descuentos porcentuales específicos recomendados en base a su cercanía de vencimiento y margen de ganancia.
3. Carteles de ofertas creativos y mensajes persuasivos para los clientes que visitan el local.
4. Estrategia de prevención para el futuro.

Lista de productos en riesgo:
${vencidosONear.map(p => {
  const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
  const estadoText = dias < 0 ? 'VENCIDO' : `${dias} días para vencer`;
  return `- **${p.nombre}**:
    * SKU: ${p.sku || 'Sin SKU'}
    * Stock actual: ${p.stock_actual} ${p.unidad}
    * Precio actual: ${formatCLPCurrency(p.precio)}
    * Costo actual: ${p.costo_actual ? formatCLPCurrency(p.costo_actual) : 'Sin registrar'}
    * Estado: ${estadoText} (Fecha: ${p.fecha_caducidad})
  `;
}).join('\n')}
`;

    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: [], 
          contexto: promptContext
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      setAiRespuestaVencidos(data.sugerencias);
      toast({
        title: 'Plan de liquidación listo',
        description: 'Gemini ha elaborado las ofertas de liquidación.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo generar el plan de liquidación.',
        variant: 'destructive',
      });
    } finally {
      setAiCargandoVencidos(false);
    }
  };

  // Basic markdown client-side renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const blocks = text.split('\n');
    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-base font-black mt-5 mb-2 text-indigo-600 dark:text-indigo-400 tracking-tight">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-lg font-black mt-6 mb-3 text-foreground border-b border-border/60 pb-1.5 tracking-tight">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-xl font-black mt-8 mb-4 text-foreground tracking-tight">
            {trimmed.replace('# ', '')}
          </h2>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        const parts = content.split('**');
        return (
          <li key={idx} className="ml-5 list-disc text-sm my-1 text-muted-foreground leading-relaxed">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-semibold text-foreground">{part}</strong> : part)}
          </li>
        );
      }

      const parts = trimmed.split('**');
      return (
        <p key={idx} className="text-sm my-2 text-muted-foreground leading-relaxed">
          {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-foreground">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">Pricing & Inventario</span>
            </div>
            <h1 className="text-2xl font-black text-foreground sm:text-3xl tracking-tight leading-tight">
              Control de Costos, Precios y Caducidades
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Gestiona los costos de tus productos, prevé pérdidas controlando fechas de vencimiento y optimiza tus ventas con IA.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            {activeTab === 'precios' && (
              <>
                <Button 
                  onClick={handleGuardarTodo} 
                  disabled={guardandoTodo || productos.filter(esDiferente).length === 0}
                  variant="outline"
                  className="rounded-2xl border-border/80 text-xs font-black shadow-sm h-11 w-full sm:w-auto"
                >
                  {guardandoTodo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 text-indigo-500" />}
                  Guardar Costos ({productos.filter(esDiferente).length})
                </Button>
                <Button 
                  onClick={handleAplicarTodoSugerido} 
                  disabled={aplicandoTodo}
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm h-11 w-full sm:w-auto"
                >
                  {aplicandoTodo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Aplicar Precios Sugeridos
                </Button>
              </>
            )}

            {activeTab === 'vencimientos' && (
              <Button 
                onClick={handleGenerarLiquidacionVencimientos} 
                disabled={aiCargandoVencidos || productosConVencimiento.length === 0}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm h-11 w-full sm:w-auto"
              >
                {aiCargandoVencidos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Crear Ofertas de Liquidación (IA)
              </Button>
            )}
          </div>
        </header>

        {/* Tab Selector */}
        <div className="flex border-b border-border/50 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('precios')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'precios'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Costos y Márgenes
          </button>
          
          <button
            onClick={() => setActiveTab('vencimientos')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 relative ${
              activeTab === 'vencimientos'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Control de Vencimientos
            {productosConVencimiento.some(p => obtenerDiasParaVencer(p.fecha_caducidad!) <= 30) && (
              <span className="absolute -top-1.5 -right-3.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          {activeTab === 'precios' ? (
            <motion.div 
              key="precios-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-3"
            >
              
              {/* Product Cost entries */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-3 px-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold tracking-tight">Listado de Cotizaciones</CardTitle>
                        <CardDescription className="text-xs">Introduce el costo mayorista y previsualiza los precios.</CardDescription>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
                        <Input
                          placeholder="Buscar producto..."
                          value={filtroBusqueda}
                          onChange={(e) => setFiltroBusqueda(e.target.value)}
                          className="pl-9 rounded-xl border-border/60 text-[16px] md:text-xs bg-background/50 h-10"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {/* Desktop Table View */}
                  <CardContent className="p-0">
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            <th className="p-4 pl-6">Producto</th>
                            <th className="p-4">Costo Mayorista</th>
                            <th className="p-4">Margen Deseado</th>
                            <th className="p-4">Venta Sugerida</th>
                            <th className="p-4">Venta Actual</th>
                            <th className="p-4 pr-6 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {productosFiltrados.map((p) => {
                            const sug = calcularPrecioSugerido(p.id, p.costo_actual);
                            const changed = esDiferente(p);
                            
                            return (
                              <tr 
                                key={p.id}
                                className={`group transition-colors ${changed ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : 'hover:bg-muted/30'}`}
                              >
                                <td className="p-4 pl-6">
                                  <div>
                                    <div className="font-bold text-foreground text-sm tracking-tight">{p.nombre}</div>
                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5 flex items-center gap-1.5 opacity-70">
                                      <span>{p.unidad === 'kg' ? 'Venta por Peso' : 'Venta por Unidad'}</span>
                                      <span className="h-1 w-1 rounded-full bg-border" />
                                      <span className="text-indigo-500 font-bold">Stock: {p.stock_actual.toFixed(2)} {p.unidad}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="relative w-28">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-60">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={nuevosCostos[p.id] || ''}
                                      onChange={(e) => setNuevosCostos({ ...nuevosCostos, [p.id]: e.target.value })}
                                      className="pl-6 pr-2 rounded-lg border-border/60 text-xs bg-background/40 h-9 font-semibold"
                                    />
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="relative w-20">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="1000"
                                      placeholder="30"
                                      value={margenesDeseados[p.id] || '30'}
                                      onChange={(e) => setMargenesDeseados({ ...margenesDeseados, [p.id]: e.target.value })}
                                      className="pr-6 pl-2.5 rounded-lg border-border/60 text-xs bg-background/40 h-9 font-semibold text-center"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground opacity-60 font-black">%</span>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                    {sug > 0 ? formatCLPCurrency(sug) : '—'}
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="font-bold text-foreground text-sm">
                                    {formatCLPCurrency(p.precio)}
                                  </div>
                                  {p.costo_actual && p.costo_actual > 0 ? (
                                    <div className={`text-[9px] font-black mt-0.5 uppercase tracking-wide ${
                                      p.precio < p.costo_actual ? 'text-red-500' : 'text-emerald-500'
                                    }`}>
                                      {(((p.precio - p.costo_actual) / p.precio) * 100).toFixed(0)}% real
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-muted-foreground mt-0.5 font-semibold uppercase opacity-50">
                                      Sin costo
                                    </div>
                                  )}
                                </td>

                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {changed && (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={guardandoProductoId === p.id}
                                        onClick={() => handleGuardarProducto(p)}
                                        className="h-8 w-8 rounded-lg border-indigo-500/20 bg-indigo-500/5 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                                      >
                                        {guardandoProductoId === p.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={sug <= 0 || sug === p.precio}
                                      onClick={() => handleAplicarSugerido(p)}
                                      className="h-8 text-[10px] font-bold rounded-lg border border-border bg-background hover:bg-muted"
                                    >
                                      Aplicar
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Card View */}
                    <div className="block md:hidden divide-y divide-border/30">
                      {productosFiltrados.map((p) => {
                        const sug = calcularPrecioSugerido(p.id, p.costo_actual);
                        const changed = esDiferente(p);
                        
                        return (
                          <div 
                            key={p.id}
                            className={`p-4 transition-colors ${changed ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div>
                                <h4 className="font-bold text-sm text-foreground leading-tight">{p.nombre}</h4>
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block mt-0.5">
                                  Stock: {p.stock_actual.toFixed(2)} {p.unidad} ({p.unidad === 'kg' ? 'peso' : 'unid'})
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {changed && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={guardandoProductoId === p.id}
                                    onClick={() => handleGuardarProducto(p)}
                                    className="h-9 w-9 rounded-xl bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
                                  >
                                    {guardandoProductoId === p.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={sug <= 0 || sug === p.precio}
                                  onClick={() => handleAplicarSugerido(p)}
                                  className="h-9 text-[10px] font-black rounded-xl"
                                >
                                  Aplicar
                                </Button>
                              </div>
                            </div>

                            {/* Cost and Margin side by side */}
                            <div className="grid grid-cols-2 gap-3.5 mb-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-75">Costo Mayorista</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-60">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={nuevosCostos[p.id] || ''}
                                    onChange={(e) => setNuevosCostos({ ...nuevosCostos, [p.id]: e.target.value })}
                                    className="pl-6 pr-2 rounded-xl text-[16px] bg-background/40 h-10 font-bold border-border/70"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-75">Margen Deseado</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    placeholder="30"
                                    value={margenesDeseados[p.id] || '30'}
                                    onChange={(e) => setMargenesDeseados({ ...margenesDeseados, [p.id]: e.target.value })}
                                    className="pr-6 pl-3 rounded-xl text-[16px] bg-background/40 h-10 font-bold text-center border-border/70"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">%</span>
                                </div>
                              </div>
                            </div>

                            {/* Suggested Pricing row */}
                            <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl text-xs font-semibold">
                              <div>
                                <span className="text-muted-foreground text-[10px]">Sugerido:</span>{' '}
                                <span className="font-black text-indigo-600 dark:text-indigo-400">
                                  {sug > 0 ? formatCLPCurrency(sug) : '—'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground text-[10px]">Actual:</span>{' '}
                                <span className="font-bold text-foreground">
                                  {formatCLPCurrency(p.precio)}
                                </span>
                                {p.costo_actual && p.costo_actual > 0 && (
                                  <span className={`ml-1 text-[9px] font-black uppercase ${
                                    p.precio < p.costo_actual ? 'text-red-500' : 'text-emerald-500'
                                  }`}>
                                    ({(((p.precio - p.costo_actual) / p.precio) * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {productosFiltrados.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground font-semibold">
                        {cargando ? (
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Cargando catálogo...
                          </div>
                        ) : (
                          'No se encontraron productos activos.'
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Assistant */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border-indigo-500/20 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="h-24 w-24 text-indigo-500" />
                  </div>

                  <CardHeader className="border-b border-border/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Asistente de Marketing</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-black opacity-60">Sugerencias Inteligentes Gemini</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="contexto" className="text-xs font-bold">Instrucciones o Contexto del Negocio</Label>
                      <textarea
                        id="contexto"
                        rows={4}
                        placeholder="Ej: 'Quiero liquidar las manzanas porque hay mucho stock' o 'Es fin de semana largo y quiero aumentar ventas en picoteos'."
                        value={aiContexto}
                        onChange={(e) => setAiContexto(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-border/60 text-[16px] md:text-xs bg-background/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium leading-relaxed resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleGenerarMarketingIA}
                      disabled={aiCargando || productos.length === 0}
                      className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-500/10 h-11"
                    >
                      {aiCargando ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analizando costos y rentabilidad...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generar Estrategias con IA
                        </>
                      )}
                    </Button>

                    <AnimatePresence>
                      {(aiRespuesta || aiCargando) && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="rounded-2xl border border-border bg-background/40 p-4 max-h-[480px] overflow-y-auto custom-scrollbar"
                        >
                          {aiCargando ? (
                            <div className="space-y-3 py-6 text-center text-xs text-muted-foreground font-semibold">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                              <span>Gemini está analizando tu catálogo...</span>
                            </div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert">
                              {renderMarkdown(aiRespuesta || '')}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!aiRespuesta && !aiCargando && (
                      <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground font-medium">
                        <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground/60 mb-2" />
                        Haz click arriba para generar ideas de venta para hoy basadas en la rentabilidad de tus precios.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="vencimientos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-3"
            >
              
              {/* Product Expirations list */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-3 px-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold tracking-tight">Vencimiento de Abarrotes</CardTitle>
                        <CardDescription className="text-xs">
                          Listado de productos con caducidades registradas, ordenados de forma crítica.
                        </CardDescription>
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
                        <Input
                          placeholder="Buscar producto..."
                          value={filtroBusqueda}
                          onChange={(e) => setFiltroBusqueda(e.target.value)}
                          className="pl-9 rounded-xl border-border/60 text-[16px] md:text-xs bg-background/50 h-10"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-3">
                      {productosConVencimientoFiltrados.map((p) => {
                        const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
                        const estaVencido = dias < 0;
                        const proximo = dias >= 0 && dias <= 30;

                        return (
                          <div 
                            key={p.id}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border transition-all duration-300 ${
                              estaVencido ? 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400' :
                              proximo ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400' :
                              'bg-card border-border/40'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{p.nombre}</span>
                                {p.sku && (
                                  <span className="text-[9px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1 shrink-0">
                                    <Barcode className="h-2.5 w-2.5" />
                                    {p.sku}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-semibold flex flex-wrap items-center gap-2">
                                <span className="text-indigo-500 font-bold">Stock: {p.stock_actual} {p.unidad}</span>
                                <span className="h-1 w-1 rounded-full bg-border" />
                                <span>Precio: {formatCLPCurrency(p.precio)}</span>
                              </div>
                            </div>

                            <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-border/30 pt-2.5 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <div className="text-xs font-bold flex items-center gap-1.5 justify-start sm:justify-end">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{p.fecha_caducidad}</span>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-wider mt-0.5 opacity-80">
                                  {estaVencido ? (
                                    <span className="text-red-500 font-black">Vencido</span>
                                  ) : proximo ? (
                                    <span className="text-amber-500">{dias} días restantes</span>
                                  ) : (
                                    <span className="text-emerald-500">{dias} días restantes</span>
                                  )}
                                </div>
                              </div>

                              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                estaVencido ? 'bg-red-500/10 text-red-500' :
                                proximo ? 'bg-amber-500/10 text-amber-500' :
                                'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {productosConVencimiento.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground font-semibold">
                          <CalendarOff className="h-16 w-16 mx-auto opacity-30 mb-4" />
                          <h3>No hay productos con vencimiento</h3>
                          <p className="text-xs text-muted-foreground/85 font-medium mt-1">
                            Para monitorear vencimientos, edita un producto en el catálogo y añade su fecha de caducidad.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Liquidation Plan Assistant */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border-indigo-500/20 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="h-24 w-24 text-indigo-500" />
                  </div>

                  <CardHeader className="border-b border-border/40 bg-gradient-to-r from-red-500/5 to-indigo-500/5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Liquidación Inteligente IA</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-black opacity-60">Prevención de Pérdidas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5">
                    <div className="text-xs text-muted-foreground font-medium leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border/50">
                      Esta herramienta analiza los abarrotes que vencen pronto y genera combos de descuento, carteles promocionales y consejos estratégicos para vender el stock hoy mismo.
                    </div>

                    <Button
                      onClick={handleGenerarLiquidacionVencimientos}
                      disabled={aiCargandoVencidos || productosConVencimiento.length === 0}
                      className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/10 h-11"
                    >
                      {aiCargandoVencidos ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando ofertas de liquidación...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Diseñar Estrategia de Ofertas (IA)
                        </>
                      )}
                    </Button>

                    <AnimatePresence>
                      {(aiRespuestaVencidos || aiCargandoVencidos) && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="rounded-2xl border border-border bg-background/40 p-4 max-h-[480px] overflow-y-auto custom-scrollbar"
                        >
                          {aiCargandoVencidos ? (
                            <div className="space-y-3 py-6 text-center text-xs text-muted-foreground font-semibold">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                              <span>Gemini calculando ofertas y redactando carteles de descuento...</span>
                            </div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert">
                              {renderMarkdown(aiRespuestaVencidos || '')}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!aiRespuestaVencidos && !aiCargandoVencidos && (
                      <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground font-medium">
                        <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground/60 mb-2" />
                        Haz click en el botón de arriba para que Gemini cree estrategias rápidas de liquidación.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <CostosPage />
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venta, SesionCaja, Producto } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketGenerator } from '@/lib/utils/ticket-generator';
import { formatCLPCurrency } from '@/lib/utils';
import { 
  History, Printer, DollarSign, Calendar, TrendingUp, AlertTriangle, 
  Layers, Search, FileText, ShoppingBag, CreditCard, 
  ArrowRight, Users, CheckCircle, PackageOpen, HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface VentasDia {
  fechaKey: string; // YYYY-MM-DD
  fechaDisplay: Date;
  ventas: Venta[];
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  fiado: number;
  cantidad: number;
}

function HistorialPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [sesiones, setSesiones] = useState<SesionCaja[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Date range filters (default to last 30 days)
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // Selected states
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);

  // Replenishment states
  const [umbralReposicion, setUmbralReposicion] = useState<number>(5);
  const [busquedaReposicion, setBusquedaReposicion] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // 1. Fetch sessions (last 20)
      const sesionesQuery = query(
        collection(db, 'sesiones_caja'),
        orderBy('fecha_apertura', 'desc'),
        limit(20)
      );
      const sesionesSnapshot = await getDocs(sesionesQuery);
      const sesionesData = sesionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SesionCaja[];
      setSesiones(sesionesData);

      // 2. Fetch all active products for replenishment analysis
      const productosSnapshot = await getDocs(collection(db, 'productos'));
      const productosData = productosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];
      setProductos(productosData);

      // 3. Fetch sales with date range
      await cargarVentasFiltradas(fechaInicio, fechaFin);

    } catch (error) {
      console.error('Error al cargar datos contables e historial:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarVentasFiltradas = async (ini: string, fin: string) => {
    try {
      const start = new Date(ini + 'T00:00:00');
      const end = new Date(fin + 'T23:59:59');

      const ventasQuery = query(
        collection(db, 'ventas'),
        where('fecha', '>=', Timestamp.fromDate(start)),
        where('fecha', '<=', Timestamp.fromDate(end)),
        orderBy('fecha', 'desc')
      );
      const ventasSnapshot = await getDocs(ventasQuery);
      const ventasData = ventasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venta[];

      setVentas(ventasData);

      // Automatically select the first day if available
      if (ventasData.length > 0) {
        const firstSaleDate = ventasData[0].fecha.toDate();
        const firstDayKey = format(firstSaleDate, 'yyyy-MM-dd');
        setSelectedDayKey(firstDayKey);
      } else {
        setSelectedDayKey(null);
      }
      setSelectedVenta(null);

    } catch (err) {
      console.error("Error al cargar ventas en rango:", err);
    }
  };

  const handleFiltrarRango = async () => {
    setCargando(true);
    await cargarVentasFiltradas(fechaInicio, fechaFin);
    setCargando(false);
  };

  const handleImprimirTicket = (venta: Venta) => {
    const ticket = TicketGenerator.generar(venta, 'POS MARKET');
    TicketGenerator.imprimir(ticket);
  };

  // Group sales by day
  const ventasAgrupadasPorDia = useMemo((): VentasDia[] => {
    const grupos: { [key: string]: VentasDia } = {};

    ventas.forEach(venta => {
      const date = venta.fecha.toDate();
      const key = format(date, 'yyyy-MM-dd');

      if (!grupos[key]) {
        grupos[key] = {
          fechaKey: key,
          fechaDisplay: date,
          ventas: [],
          total: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          fiado: 0,
          cantidad: 0
        };
      }

      grupos[key].ventas.push(venta);
      grupos[key].total += venta.total;
      grupos[key].cantidad += 1;

      switch (venta.metodo_pago) {
        case 'efectivo':
          grupos[key].efectivo += venta.total;
          break;
        case 'transferencia':
          grupos[key].transferencia += venta.total;
          break;
        case 'tarjeta':
          grupos[key].tarjeta += venta.total;
          break;
        case 'fiado':
          grupos[key].fiado += venta.total;
          break;
      }
    });

    return Object.values(grupos).sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
  }, [ventas]);

  // Selected day data
  const selectedDayData = useMemo((): VentasDia | null => {
    if (!selectedDayKey) return null;
    return ventasAgrupadasPorDia.find(g => g.fechaKey === selectedDayKey) || null;
  }, [selectedDayKey, ventasAgrupadasPorDia]);

  // Top products for selected day
  const topProductsSelectedDay = useMemo(() => {
    if (!selectedDayData) return [];
    const counts: { [nombre: string]: { cantidad: number; total: number; unidad: string } } = {};

    selectedDayData.ventas.forEach(venta => {
      venta.items.forEach(item => {
        const nombre = item.nombre;
        if (!counts[nombre]) {
          counts[nombre] = { cantidad: 0, total: 0, unidad: item.unidad };
        }
        counts[nombre].cantidad += item.neto;
        counts[nombre].total += item.total;
      });
    });

    return Object.entries(counts)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [selectedDayData]);

  // Filter products that need replenishment
  const productosAReponer = useMemo(() => {
    return productos
      .filter(p => p.activo !== false && p.es_interes !== true)
      .filter(p => p.stock_actual <= umbralReposicion)
      .filter(p => {
        if (!busquedaReposicion.trim()) return true;
        const term = busquedaReposicion.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(term) || 
          (p.sku && p.sku.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => a.stock_actual - b.stock_actual);
  }, [productos, umbralReposicion, busquedaReposicion]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm font-semibold">Cargando historial y estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Header section with premium blur */}
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6 lg:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight uppercase">
                <History className="h-8 w-8 shrink-0 text-primary" />
                Historial y Reposición
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-70 mt-1">
                Agrupación diaria, distribución de medios de pago, ranking de ventas y alerta de reposición.
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-border/10">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider px-2">Inicio</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="bg-background border border-border/50 text-foreground px-3 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider px-2">Fin</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="bg-background border border-border/50 text-foreground px-3 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button
                onClick={handleFiltrarRango}
                className="h-9 rounded-xl px-4 text-xs font-bold bg-primary text-white self-end hover:bg-primary/90 transition-all duration-300"
              >
                Filtrar Rango
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        <Tabs defaultValue="diario" className="w-full">
          <TabsList className="w-full max-w-md grid grid-cols-3 gap-2 bg-muted/30 p-1.5 rounded-2xl mb-6 border border-border/10">
            <TabsTrigger value="diario" className="rounded-xl text-xs font-bold py-2.5">
              Ventas por Día
            </TabsTrigger>
            <TabsTrigger value="sesiones" className="rounded-xl text-xs font-bold py-2.5">
              Sesiones de Caja
            </TabsTrigger>
            <TabsTrigger value="reposicion" className="rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
              Reponer Stock
              {productosAReponer.length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VENTAS POR DÍA */}
          <TabsContent value="diario" className="mt-0 outline-none">
            {ventasAgrupadasPorDia.length === 0 ? (
              <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <CardTitle className="text-base text-muted-foreground">No se encontraron ventas</CardTitle>
                <p className="text-xs text-muted-foreground/70 max-w-sm mt-1">
                  Intenta expandiendo el rango de fechas en la cabecera del panel.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Days List */}
                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Días Registrados</h3>
                  <ScrollArea className="h-[70vh] pr-2">
                    <div className="space-y-2.5">
                      {ventasAgrupadasPorDia.map((dia) => {
                        const active = selectedDayKey === dia.fechaKey;
                        return (
                          <div
                            key={dia.fechaKey}
                            onClick={() => {
                              setSelectedDayKey(dia.fechaKey);
                              setSelectedVenta(null);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-1.5 ${
                              active 
                                ? 'bg-primary/5 border-primary shadow-sm'
                                : 'bg-card border-border/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                                {format(dia.fechaDisplay, "EEEE d 'de' MMM", { locale: es })}
                              </span>
                              <Badge variant={active ? 'default' : 'secondary'} className="text-[10px] font-bold">
                                {dia.cantidad} transac.
                              </Badge>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-xl font-black text-foreground">
                                {formatCLPCurrency(dia.total)}
                              </span>
                              <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${active ? 'text-primary translate-x-1' : 'text-muted-foreground/40'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Column 2: Day Details */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedDayData ? (
                    <>
                      {/* KPIs and Stats */}
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
                          Estadísticas del {format(selectedDayData.fechaDisplay, "EEEE d 'de' MMMM", { locale: es })}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Card className="bg-gradient-to-br from-card to-muted/20">
                            <CardContent className="pt-6">
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Vendido Total</p>
                              <p className="text-2xl font-black mt-1.5 text-foreground">{formatCLPCurrency(selectedDayData.total)}</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-card to-muted/20">
                            <CardContent className="pt-6">
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Transacciones</p>
                              <p className="text-2xl font-black mt-1.5 text-foreground">{selectedDayData.cantidad}</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-card to-muted/20">
                            <CardContent className="pt-6">
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Ticket Promedio</p>
                              <p className="text-2xl font-black mt-1.5 text-foreground">
                                {formatCLPCurrency(Math.round(selectedDayData.total / selectedDayData.cantidad))}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Payment Methods */}
                      <Card className="border border-border/50">
                        <CardHeader className="py-4">
                          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            Distribución de Medios de Pago
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 bg-muted/30 rounded-xl border border-border/10">
                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Efectivo</p>
                              <p className="text-base font-extrabold mt-1 text-foreground">{formatCLPCurrency(selectedDayData.efectivo)}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border border-border/10">
                              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Transferencia</p>
                              <p className="text-base font-extrabold mt-1 text-foreground">{formatCLPCurrency(selectedDayData.transferencia)}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border border-border/10">
                              <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Tarjeta</p>
                              <p className="text-base font-extrabold mt-1 text-foreground">{formatCLPCurrency(selectedDayData.tarjeta)}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border border-border/10">
                              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Fiado</p>
                              <p className="text-base font-extrabold mt-1 text-foreground">{formatCLPCurrency(selectedDayData.fiado)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Split list of sales and Top Products */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Sales List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Ventas Realizadas</h4>
                          <ScrollArea className="h-[380px] border border-border/40 rounded-2xl bg-card">
                            <div className="p-4 space-y-2">
                              {selectedDayData.ventas.map((v) => {
                                const isSelectedVenta = selectedVenta?.id === v.id;
                                return (
                                  <div
                                    key={v.id}
                                    onClick={() => setSelectedVenta(isSelectedVenta ? null : v)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                                      isSelectedVenta 
                                        ? 'bg-muted/80 border-primary'
                                        : 'bg-muted/20 border-border/10 hover:bg-muted/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-mono font-bold">N° {v.numero_venta || v.id.slice(-6)}</span>
                                      <span className="text-muted-foreground font-medium">
                                        {format(v.fecha.toDate(), 'HH:mm')} hrs
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                        v.metodo_pago === 'efectivo' ? 'bg-green-500/10 text-green-600' :
                                        v.metodo_pago === 'transferencia' ? 'bg-blue-500/10 text-blue-600' :
                                        v.metodo_pago === 'tarjeta' ? 'bg-purple-500/10 text-purple-600' :
                                        'bg-amber-500/10 text-amber-600'
                                      }`}>
                                        {v.metodo_pago}
                                      </span>
                                      <span className="text-sm font-black">{formatCLPCurrency(v.total)}</span>
                                    </div>
                                    {v.cliente_nombre && (
                                      <p className="text-[10px] text-muted-foreground font-semibold">
                                        Cliente: {v.cliente_nombre}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Right: Selected Sale detail or Top Products */}
                        <div className="space-y-3">
                          {selectedVenta ? (
                            <>
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Detalle Venta N° {selectedVenta.numero_venta}</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImprimirTicket(selectedVenta)}
                                  className="h-8 rounded-lg px-2 flex items-center gap-1.5 text-xs text-primary hover:bg-primary/5"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Imprimir Ticket
                                </Button>
                              </div>
                              <Card className="border border-border/50 h-[380px] flex flex-col justify-between">
                                <CardContent className="p-4 overflow-y-auto flex-1">
                                  <div className="space-y-3.5">
                                    <div className="border-b pb-2">
                                      <p className="text-xs text-muted-foreground font-bold">Resumen de Compra</p>
                                    </div>
                                    <div className="space-y-2.5">
                                      {selectedVenta.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-xs border-b border-border/5 pb-2">
                                          <div className="min-w-0 pr-2">
                                            <p className="font-extrabold text-foreground break-words">{item.nombre}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                              {item.neto} {item.unidad} x {formatCLPCurrency(item.precio_unitario)}
                                              {item.es_caja && ` (${item.tipo_empaque || 'Caja'})`}
                                            </p>
                                          </div>
                                          <span className="font-bold shrink-0">{formatCLPCurrency(item.total)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </CardContent>
                                <div className="p-4 border-t bg-muted/10 flex items-center justify-between shrink-0 rounded-b-2xl">
                                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Cobrado:</span>
                                  <span className="text-base font-black text-primary">{formatCLPCurrency(selectedVenta.total)}</span>
                                </div>
                              </Card>
                            </>
                          ) : (
                            <>
                              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Productos Más Vendidos (Día)</h4>
                              <Card className="border border-border/50 h-[380px] flex flex-col p-4">
                                <ScrollArea className="flex-1 pr-1">
                                  <div className="space-y-3.5">
                                    {topProductsSelectedDay.map((p, idx) => (
                                      <div key={idx} className="flex items-center gap-3 border-b border-border/5 pb-3">
                                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center font-black text-xs text-primary shrink-0">
                                          {idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-foreground truncate">{p.nombre}</p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Total vendido: {p.cantidad.toFixed(2)} {p.unidad}
                                          </p>
                                        </div>
                                        <span className="text-xs font-extrabold shrink-0 text-foreground">
                                          {formatCLPCurrency(p.total)}
                                        </span>
                                      </div>
                                    ))}

                                    {topProductsSelectedDay.length === 0 && (
                                      <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center gap-2">
                                        <PackageOpen className="h-8 w-8 text-muted-foreground/30" />
                                        No hay información disponible para este día
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </Card>
                            </>
                          )}
                        </div>

                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
                      <HelpCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-semibold">Selecciona un día del listado</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </TabsContent>

          {/* TAB 2: SESIONES DE CAJA */}
          <TabsContent value="sesiones" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sesiones.map((sesion) => (
                <Card key={sesion.id} className="border border-border/50">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        sesion.cerrada ? 'bg-muted text-muted-foreground border' : 'bg-green-500/10 text-green-600 border border-green-500/20'
                      }`}>
                        {sesion.cerrada ? 'Cerrada' : 'Activa'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(sesion.fecha_apertura.toDate(), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <CardTitle className="text-base font-extrabold mt-3 text-foreground">
                      {format(sesion.fecha_apertura.toDate(), "dd 'de' MMMM", { locale: es })}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium opacity-70">
                      Apertura: {format(sesion.fecha_apertura.toDate(), 'HH:mm')} hrs
                      {sesion.fecha_cierre && ` · Cierre: ${format(sesion.fecha_cierre.toDate(), 'HH:mm')} hrs`}
                    </p>
                  </CardHeader>
                  <CardContent className="border-t border-border/10 pt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-1 border-b border-border/5">
                      <span className="text-muted-foreground font-medium">Monto Inicial en Caja:</span>
                      <span className="font-bold">{formatCLPCurrency(sesion.monto_inicial)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-1 border-b border-border/5">
                      <span className="text-muted-foreground font-medium">Ventas Totales:</span>
                      <span className="font-bold">{formatCLPCurrency(sesion.total_ventas || 0)}</span>
                    </div>
                    
                    {sesion.cerrada ? (
                      <>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-muted/10 p-2.5 rounded-xl border border-border/5 my-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Efectivo:</span>
                            <span className="font-bold">{formatCLPCurrency(sesion.total_efectivo || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transfer:</span>
                            <span className="font-bold">{formatCLPCurrency(sesion.total_transferencia || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tarjeta:</span>
                            <span className="font-bold">{formatCLPCurrency(sesion.total_tarjeta || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fiado:</span>
                            <span className="font-bold">{formatCLPCurrency(sesion.total_fiado || 0)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-dashed font-bold text-sm">
                          <span>Diferencia en Cierre:</span>
                          <span className={`${(sesion.diferencia || 0) < 0 ? 'text-red-500' : (sesion.diferencia || 0) > 0 ? 'text-green-500' : 'text-foreground'}`}>
                            {formatCLPCurrency(sesion.diferencia || 0)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center text-[11px] text-muted-foreground bg-green-500/5 rounded-xl border border-green-500/10">
                        La sesión de caja sigue activa y recibiendo transacciones.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {sesiones.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No se encontraron sesiones de caja registradas
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: PRODUCTOS A REPONER */}
          <TabsContent value="reposicion" className="mt-0 outline-none">
            <Card className="border border-border/50">
              <CardHeader className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Inventario Crítico / A Reponer
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Productos activos del catálogo que están bajo el nivel óptimo de stock.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search filter */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      type="text"
                      placeholder="Buscar producto a reponer..."
                      value={busquedaReposicion}
                      onChange={(e) => setBusquedaReposicion(e.target.value)}
                      className="h-9 pl-9 pr-3 rounded-xl text-xs"
                    />
                  </div>

                  {/* Threshold setting */}
                  <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/10">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider px-2">Stock Crítico &lt;=</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={umbralReposicion}
                      onChange={(e) => setUmbralReposicion(Number(e.target.value))}
                      className="h-7 w-16 text-center font-bold text-xs rounded-lg p-0"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="w-[30%] pl-6">Producto</TableHead>
                      <TableHead className="w-[20%]">Código / SKU</TableHead>
                      <TableHead className="w-[15%] text-center">Stock Actual</TableHead>
                      <TableHead className="w-[15%] text-right">Costo Actual</TableHead>
                      <TableHead className="w-[15%] text-right">Precio Venta</TableHead>
                      <TableHead className="w-[10%] text-center pr-6">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosAReponer.map((p) => {
                      const outOfStock = p.stock_actual <= 0;
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-extrabold pl-6">
                            <span className="text-foreground">{p.nombre}</span>
                            <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                              Unidad: {p.unidad}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                            {p.sku || <span className="text-muted-foreground/30 font-sans italic">No asignado</span>}
                          </TableCell>
                          <TableCell className="text-center font-black text-sm">
                            <span className={outOfStock ? 'text-red-500' : 'text-amber-500'}>
                              {p.unidad === 'kg' ? p.stock_actual.toFixed(2) : p.stock_actual}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {p.costo_actual ? formatCLPCurrency(p.costo_actual) : <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCLPCurrency(p.precio)}
                          </TableCell>
                          <TableCell className="text-center pr-6">
                            <Badge 
                              className={`font-bold text-[9px] ${outOfStock ? '' : 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'}`} 
                              variant={outOfStock ? 'destructive' : 'default'}
                            >
                              {outOfStock ? 'Agotado' : 'Bajo Stock'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {productosAReponer.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <p className="text-xs font-bold text-foreground">¡Todo al día!</p>
                            <p className="text-[10px] text-muted-foreground/80">
                              No hay productos activos con stock menor o igual a {umbralReposicion}.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HistorialPage />
    </ProtectedRoute>
  );
}

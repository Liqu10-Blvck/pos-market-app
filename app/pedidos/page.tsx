'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { usePedidosStore } from './hooks/usePedidosStore';
import { filtrarPedidos, calcularKPIsPedidos } from './utils/pedidosUtils';
import { OrderCard } from './components/OrderCard';
import { OrderModal } from './components/OrderModal';
import { OrderDetailModal } from './components/OrderDetailModal';

import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { SesionService } from '@/lib/services/sesion.service';
import { formatCLPCurrency } from '@/lib/utils';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Clock, 
  Package, 
  DollarSign, 
  Truck, 
  XCircle 
} from 'lucide-react';

function PedidosPageContent() {
  // Global App Store actions & state
  const iniciarProductosListener = useAppStore((state) => state.iniciarProductosListener);
  const iniciarClientesListener = useAppStore((state) => state.iniciarClientesListener);
  const setSesionActiva = useAppStore((state) => state.setSesionActiva);

  // Local Pedidos Store state & actions
  const pedidos = usePedidosStore((state) => state.pedidos);
  const cargando = usePedidosStore((state) => state.cargando);
  const searchQuery = usePedidosStore((state) => state.searchQuery);
  const filtroEstado = usePedidosStore((state) => state.filtroEstado);
  const filtroPago = usePedidosStore((state) => state.filtroPago);
  
  const setSearchQuery = usePedidosStore((state) => state.setSearchQuery);
  const setFiltroEstado = usePedidosStore((state) => state.setFiltroEstado);
  const setFiltroPago = usePedidosStore((state) => state.setFiltroPago);
  const setCreateModalOpen = usePedidosStore((state) => state.setCreateModalOpen);
  const iniciarPedidosListener = usePedidosStore((state) => state.iniciarPedidosListener);

  // Load active cash session
  useEffect(() => {
    SesionService.obtenerSesionActiva()
      .then((sesion) => setSesionActiva(sesion))
      .catch((err) => console.error('Error fetching active session:', err));
  }, [setSesionActiva]);

  // Connect listeners
  useEffect(() => {
    const unsubPedidos = iniciarPedidosListener();
    const unsubProductos = iniciarProductosListener();
    const unsubClientes = iniciarClientesListener();
    return () => {
      unsubPedidos();
      unsubProductos();
      unsubClientes();
    };
  }, [iniciarPedidosListener, iniciarProductosListener, iniciarClientesListener]);

  // KPIs
  const kpis = calcularKPIsPedidos(pedidos);

  // Filtered orders list
  const pedidosFiltrados = filtrarPedidos(pedidos, searchQuery, filtroEstado, filtroPago);

  if (cargando) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center gap-4">
          <ClipboardList className="h-16 w-16 text-indigo-500 animate-bounce" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">
            Cargando módulo de pedidos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Header */}
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
          <div className="flex min-h-[72px] flex-col justify-center gap-1.5 sm:min-h-[84px] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight">
                <ClipboardList className="h-8 w-8 shrink-0 text-indigo-500" />
                Gestión de Pedidos
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Administra encargos, preventas y despachos del local.
              </p>
            </div>
            <Button 
              onClick={() => setCreateModalOpen(true)} 
              size="lg" 
              className="w-full sm:w-auto rounded-2xl font-bold shadow-md h-12 bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0 active:scale-95 transition-transform"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Pedido
            </Button>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-8 space-y-8">
        
        {/* KPI Panel */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card 1: Pedidos Pendientes */}
          <div className="rounded-3xl border border-border/40 bg-card p-4 sm:p-5 space-y-1.5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Pendientes</span>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpis.totalPendientes}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">Esperando preparación</p>
          </div>

          {/* Card 2: Pedidos Preparados */}
          <div className="rounded-3xl border border-border/40 bg-card p-4 sm:p-5 space-y-1.5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 text-blue-500">
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Preparados</span>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpis.totalPreparados}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">Listos para entrega</p>
          </div>

          {/* Card 3: Monto Pendiente Cobro */}
          <div className="rounded-3xl border border-border/40 bg-card p-4 sm:p-5 space-y-1.5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 text-indigo-500">
              <DollarSign className="h-4.5 w-4.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Monto por Cobrar</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-foreground truncate">
              {formatCLPCurrency(kpis.montoPendienteCobro)}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">Pedidos sin pagar</p>
          </div>

          {/* Card 4: Entregados Hoy */}
          <div className="rounded-3xl border border-border/40 bg-card p-4 sm:p-5 space-y-1.5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 text-emerald-500">
              <Truck className="h-4.5 w-4.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Entregados Hoy</span>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpis.entregadosHoy}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">Completados hoy</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-card/50 backdrop-blur-md border border-border/40 rounded-[2rem] p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-border/60 bg-white/50 dark:bg-black/20 rounded-xl text-xs font-bold"
              />
            </div>

            {/* Reset filters */}
            {(filtroEstado !== 'todos' || filtroPago !== 'todos' || searchQuery !== '') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setFiltroEstado('todos');
                  setFiltroPago('todos');
                }}
                className="text-xs font-black uppercase text-indigo-500 hover:text-indigo-600 rounded-xl h-10 px-4 self-start lg:self-center"
              >
                Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Filters Sub-section */}
          <div className="flex flex-col sm:flex-row gap-6 pt-2 border-t border-border/30">
            {/* State filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Estado de Preparación
              </label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 dark:bg-muted/10 rounded-2xl w-fit">
                {['todos', 'pendiente', 'preparado', 'entregado', 'cancelado'].map((opt) => {
                  const active = filtroEstado === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setFiltroEstado(opt as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'bg-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt === 'todos' ? 'Todos' : opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Estado de Pago
              </label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 dark:bg-muted/10 rounded-2xl w-fit">
                {['todos', 'pendiente', 'pagado'].map((opt) => {
                  const active = filtroPago === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setFiltroPago(opt as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'bg-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt === 'todos' ? 'Todos' : opt === 'pendiente' ? 'Impago' : 'Pagado'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Listing Grid */}
        {pedidosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-muted/15 rounded-[2.5rem] border-2 border-dashed border-border/50">
            <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-foreground">No se encontraron pedidos</h3>
            <p className="text-muted-foreground text-xs max-w-xs mx-auto mt-2 mb-6">
              Prueba modificando los filtros de búsqueda o registra un nuevo pedido en el botón de arriba.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} variant="outline" className="rounded-xl font-bold text-xs">
              Crear Nuevo Pedido
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pedidosFiltrados.map((pedido) => (
              <OrderCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderModal />
      <OrderDetailModal />
    </div>
  );
}

export default function PedidosPage() {
  return (
    <ProtectedRoute>
      <PedidosPageContent />
    </ProtectedRoute>
  );
}

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useVentasStore } from './hooks/useVentasStore';
import { filtrarProductosVentas } from './utils/ventasUtils';

import { ProductCardBento } from '@/components/pos/product-card-bento';
import { WeightModal } from '@/components/pos/weight-modal';
import { Cart } from '@/components/pos/cart';
import { PaymentDrawer } from '@/components/pos/payment-drawer';
import { BarcodeScannerModal } from '@/components/pos/barcode-scanner-modal';

import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency } from '@/lib/utils';
import { ShoppingCart, DollarSign, Search, Package, ScanBarcode } from 'lucide-react';

function VentasPage() {
  const { toast } = useToast();

  // Global App Store cache
  const productos = useAppStore((state) => state.productos);
  const clientes = useAppStore((state) => state.clientes);
  const iniciarProductosListener = useAppStore((state) => state.iniciarProductosListener);
  const iniciarClientesListener = useAppStore((state) => state.iniciarClientesListener);

  // Local Ventas Store
  const carrito = useVentasStore((state) => state.carrito);
  const productoSeleccionado = useVentasStore((state) => state.productoSeleccionado);
  const modalPesajeOpen = useVentasStore((state) => state.modalPesajeOpen);
  const modalPagoOpen = useVentasStore((state) => state.modalPagoOpen);
  const sesionActiva = useVentasStore((state) => state.sesionActiva);
  const procesando = useVentasStore((state) => state.procesando);
  const searchQuery = useVentasStore((state) => state.searchQuery);
  const isOnline = useVentasStore((state) => state.isOnline);
  const modalScannerOpen = useVentasStore((state) => state.modalScannerOpen);

  const setModalPesajeOpen = useVentasStore((state) => state.setModalPesajeOpen);
  const setModalPagoOpen = useVentasStore((state) => state.setModalPagoOpen);
  const setSearchQuery = useVentasStore((state) => state.setSearchQuery);
  const setIsOnline = useVentasStore((state) => state.setIsOnline);
  const setModalScannerOpen = useVentasStore((state) => state.setModalScannerOpen);

  // Store actions
  const verificarSesionActiva = useVentasStore((state) => state.verificarSesionActiva);
  const handleProductDetected = useVentasStore((state) => state.handleProductDetected);
  const handleAgregarAlCarrito = useVentasStore((state) => state.handleAgregarAlCarrito);
  const handleEliminarItem = useVentasStore((state) => state.handleEliminarItem);
  const handleProcesarVenta = useVentasStore((state) => state.handleProcesarVenta);

  // Filter master list for active non-interest items
  const productosActivos = productos.filter(p => p.activo !== false && p.es_interes !== true);
  const clientesActivos = clientes.filter(c => c.activo !== false);

  // Apply search query filtering
  const productosFiltrados = filtrarProductosVentas(productosActivos, searchQuery);

  // Connect listeners and check cash session
  useEffect(() => {
    const unsubProductos = iniciarProductosListener();
    const unsubClientes = iniciarClientesListener();
    verificarSesionActiva(toast);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubProductos();
      unsubClientes();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [iniciarProductosListener, iniciarClientesListener, verificarSesionActiva, setIsOnline, toast]);

  // Global barcode listener for physical gun scanners
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const matched = productosActivos.find(p => p.sku && p.sku.trim() === buffer.trim());
          if (matched) {
            e.preventDefault();
            e.stopPropagation();
            handleProductDetected(matched, toast);
            if (activeEl && activeEl instanceof HTMLInputElement) {
              activeEl.value = '';
            }
            setSearchQuery('');
          }
          buffer = '';
        }
      } else if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [productosActivos, handleProductDetected, setSearchQuery, toast]);

  const handleSeleccionarProducto = (producto: any) => {
    if (producto.stock_actual <= 0) return;
    handleProductDetected(producto, toast);
  };

  const handleAbrirModalPago = () => {
    if (carrito.length === 0 || !sesionActiva) return;
    setModalPagoOpen(true);
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden selection:bg-primary/10">
      <AppNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="px-6 py-4 border-b border-border/40 bg-muted/5">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    Catálogo de Productos
                    <Badge variant="outline" className="text-[10px] font-bold py-0 h-4">{productosFiltrados.length}</Badge>
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success' : 'bg-destructive'}`} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-wider">
                      {isOnline ? 'Sincronizado' : 'Offline'}
                    </span>
                  </div>
               </div>

               {sesionActiva && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    CAJA ABIERTA
                  </Badge>
               )}
            </div>

            <div className="flex items-center gap-2 max-w-xl w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim() !== '') {
                      const query = searchQuery.trim().toLowerCase();
                      const matched = productosActivos.find(
                        p => p.sku && p.sku.trim().toLowerCase() === query
                      );
                      if (matched) {
                        e.preventDefault();
                        handleProductDetected(matched, toast);
                        setSearchQuery('');
                      }
                    }
                  }}
                  className="h-10 pl-10 border-border/40 bg-background text-sm rounded-xl focus:ring-0 text-[16px] md:text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalScannerOpen(true)}
                className="h-10 px-3 bg-background hover:bg-muted border-border/40 rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <ScanBarcode className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline text-xs font-bold">Escanear SKU</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-muted/[0.02]">
            {productosFiltrados.length === 0 ? (
               <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-40">
                  <Package className="h-12 w-12 mb-2" strokeWidth={1} />
                  <p className="text-sm font-medium">Búsqueda sin resultados</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-32 lg:pb-8">
                  {productosFiltrados.map((producto, index) => (
                    <ProductCardBento 
                      key={producto.id} 
                      producto={producto} 
                      onSelect={handleSeleccionarProducto} 
                      index={index} 
                    />
                  ))}
               </div>
            )}
          </main>
        </div>

        {/* Sidebar Cart */}
        <aside className="hidden w-80 2xl:w-96 flex-col lg:flex border-l border-border/40 relative bg-background overflow-hidden h-[calc(100vh-80px)]">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Cart items={carrito} onEliminarItem={handleEliminarItem} />
          </div>
          
          <div className="p-5 border-t border-border/40 bg-muted/10">
            <Button 
              size="lg" 
              onClick={handleAbrirModalPago} 
              disabled={carrito.length === 0 || !sesionActiva} 
              className="h-14 w-full text-base font-bold bg-primary hover:bg-primary-600 rounded-xl shadow-sm flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" strokeWidth={2.5} />
                <span>Pagar</span>
              </div>
              <span className="font-mono tabular-nums bg-background/20 px-3 py-1 rounded-lg text-sm">
                {formatCLPCurrency(totalCarrito)}
              </span>
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden bg-background border-t border-border/60 shadow-lg">
          <Button
            size="lg"
            onClick={handleAbrirModalPago}
            disabled={carrito.length === 0 || !sesionActiva}
            className="h-14 w-full text-sm font-bold rounded-xl space-x-3"
          >
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Caja ({carrito.length})</span>
              </div>
              <span className="font-mono">{formatCLPCurrency(totalCarrito)}</span>
            </div>
          </Button>
      </div>

      {/* Báscula Modal */}
      <WeightModal 
        producto={productoSeleccionado} 
        open={modalPesajeOpen} 
        onClose={() => setModalPesajeOpen(false)} 
        onAgregar={(item) => handleAgregarAlCarrito(item, toast)} 
      />
      
      {/* Pasarela Modal Drawer */}
      <PaymentDrawer 
        open={modalPagoOpen} 
        onOpenChange={setModalPagoOpen} 
        items={carrito} 
        total={totalCarrito} 
        clientes={clientesActivos} 
        onConfirm={(metodo, cliente, pagoCon) => handleProcesarVenta(metodo, cliente, pagoCon, toast)} 
        procesando={procesando} 
      />

      {/* Cámara Scanner Modal */}
      <BarcodeScannerModal 
        open={modalScannerOpen} 
        onClose={() => setModalScannerOpen(false)} 
        productos={productosActivos} 
        onDetected={(producto) => handleProductDetected(producto, toast)} 
      />
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <VentasPage />
    </ProtectedRoute>
  );
}

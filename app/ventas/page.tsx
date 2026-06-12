'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto, CarritoItem, ItemVenta, MetodoPago, Cliente } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { SesionService } from '@/lib/services/sesion.service';
import { ProductCardBento } from '@/components/pos/product-card-bento';
import { WeightModal } from '@/components/pos/weight-modal';
import { Cart } from '@/components/pos/cart';
import { PaymentDrawer } from '@/components/pos/payment-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AppNav } from '@/components/layout/app-nav';
import { formatCLPCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Search, Wifi, WifiOff, Package, ScanBarcode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { BarcodeScannerModal } from '@/components/pos/barcode-scanner-modal';

function VentasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalPesajeOpen, setModalPesajeOpen] = useState(false);
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sesionActiva, setSesionActiva] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [modalScannerOpen, setModalScannerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubProductos = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const productosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Producto[];
      const activos = productosData.filter((producto) => producto.activo !== false && producto.es_interes !== true);
      setProductos(activos);
      setProductosFiltrados(activos);
    });

    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cliente[];
      setClientes(clientesData.filter((cliente) => cliente.activo !== false));
    });

    verificarSesionActiva();

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
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') {
      setProductosFiltrados(productos);
      return;
    }
    setProductosFiltrados(
      productos.filter((producto) =>
        producto.nombre.toLowerCase().includes(query) ||
        (producto.sku && producto.sku.toLowerCase().includes(query))
      )
    );
  }, [productos, searchQuery]);

  const verificarSesionActiva = async () => {
    try {
      const sesion = await SesionService.obtenerSesionActiva();
      if (sesion) {
        setSesionActiva(sesion.id);
      } else {
        toast({
          title: 'No hay sesión activa',
          description: 'Abre sesión para vender',
          variant: 'destructive'
        });
      }
    } catch (error) {
           console.error('Error al verificar sesión:', error);
    }
  };

  const handleProductDetected = (producto: Producto) => {
    if (producto.stock_actual <= 0) {
      toast({
        title: 'Sin stock',
        description: `El producto ${producto.nombre} no tiene stock disponible para la venta.`,
        variant: 'destructive'
      });
      return;
    }

    // Always open the Weight/Quantity modal so the cashier can set the amount
    setProductoSeleccionado(producto);
    setModalPesajeOpen(true);
  };

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
          const matched = productos.find(p => p.sku && p.sku.trim() === buffer.trim());
          if (matched) {
            e.preventDefault();
            e.stopPropagation();
            handleProductDetected(matched);
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
  }, [productos]);

  const handleSeleccionarProducto = (producto: Producto) => {
    if (producto.stock_actual <= 0) return;
    setProductoSeleccionado(producto);
    setModalPesajeOpen(true);
  };

  const handleAgregarAlCarrito = (itemToScan: ItemVenta) => {
    setCarrito(prev => {
      const existing = prev.find(i => 
        i.nombre === itemToScan.nombre && 
        i.unidad === itemToScan.unidad && 
        i.precio_unitario === itemToScan.precio_unitario
      );
      
      if (existing) {
        return prev.map(i => 
          i.temp_id === existing.temp_id 
            ? { 
                ...i, 
                neto: i.neto + itemToScan.neto, 
                total: Math.round(i.total + itemToScan.total),
                peso_bruto: (i.peso_bruto || 0) + (itemToScan.peso_bruto || 0),
                tara: (i.tara || 0) + (itemToScan.tara || 0),
                cantidad: (i.cantidad || 0) + (itemToScan.cantidad || 0)
              } 
            : i
        );
      }
      
      return [...prev, { ...itemToScan, temp_id: `${Date.now()}-${Math.random()}` }];
    });
    toast({ title: 'Agregado', description: `${itemToScan.nombre} al carrito` });
  };

  const handleEliminarItem = (tempId: string) => {
    setCarrito(prev => prev.filter(item => item.temp_id !== tempId));
  };

  const handleAbrirModalPago = () => {
    if (carrito.length === 0 || !sesionActiva) return;
    setModalPagoOpen(true);
  };

  const handleProcesarVenta = async (metodoPago: MetodoPago, clienteSeleccionado?: string, pagoCon?: number) => {
    if (!sesionActiva) return;
    setProcesando(true);
    try {
      const items: ItemVenta[] = carrito.map(({ temp_id, ...item }) => item);
      await VentasService.procesarVenta(items, metodoPago, sesionActiva, clienteSeleccionado || undefined);
      
      const vuelto = (pagoCon && pagoCon > totalCarrito) ? (pagoCon - totalCarrito) : 0;
      const description = vuelto > 0 
        ? `Vuelto a entregar: ${formatCLPCurrency(vuelto)}` 
        : `Pago registrado con ${metodoPago === 'efectivo' ? 'Efectivo' : metodoPago}`;

      toast({ 
        title: 'Venta exitosa', 
        description,
        variant: 'success'
      });
      setCarrito([]);
      setModalPagoOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
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
                      const matched = productos.find(
                        p => p.sku && p.sku.trim().toLowerCase() === query
                      );
                      if (matched) {
                        e.preventDefault();
                        handleProductDetected(matched);
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
                    <ProductCardBento key={producto.id} producto={producto} onSelect={handleSeleccionarProducto} index={index} />
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

      <WeightModal producto={productoSeleccionado} open={modalPesajeOpen} onClose={() => setModalPesajeOpen(false)} onAgregar={handleAgregarAlCarrito} />
      <PaymentDrawer open={modalPagoOpen} onOpenChange={setModalPagoOpen} items={carrito} total={totalCarrito} clientes={clientes} onConfirm={handleProcesarVenta} procesando={procesando} />
      <BarcodeScannerModal open={modalScannerOpen} onClose={() => setModalScannerOpen(false)} productos={productos} onDetected={handleProductDetected} />
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

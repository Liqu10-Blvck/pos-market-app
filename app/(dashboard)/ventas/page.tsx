'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto, CarritoItem, ItemVenta, MetodoPago, Cliente } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { SesionService } from '@/lib/services/sesion.service';
import { ProductCardBento } from '@/components/pos-premium/product-card-bento';
import { WeightModalPremium } from '@/components/pos-premium/weight-modal-premium';
import { CartPremium } from '@/components/pos-premium/cart-premium';
import { PaymentDrawer } from '@/components/pos-premium/payment-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { formatCLPCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Search, Wifi, WifiOff, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function VentasPage() {
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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const unsubProductos = onSnapshot(
      query(collection(db, 'productos'), where('tenantId', '==', user?.tenantId || 'default-tenant')), 
      (snapshot) => {
        const productosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Producto[];
        const activos = productosData.filter((producto) => producto.activo !== false);
        setProductos(activos);
        setProductosFiltrados(activos);
      }
    );

    const unsubClientes = onSnapshot(
      query(collection(db, 'clientes'), where('tenantId', '==', user?.tenantId || 'default-tenant')), 
      (snapshot) => {
        const clientesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cliente[];
        setClientes(clientesData.filter((cliente) => cliente.activo !== false));
      }
    );

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
    if (searchQuery.trim() === '') {
      setProductosFiltrados(productos);
      return;
    }
    setProductosFiltrados(
      productos.filter((producto) =>
        producto.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [productos, searchQuery]);

  const verificarSesionActiva = async () => {
    try {
      const sesion = await SesionService.obtenerSesionActiva(
        user?.tenantId || 'default-tenant',
        user?.sucursalesIds?.[0] || 'default-sucursal'
      );
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

  const handleSeleccionarProducto = (producto: Producto) => {
    const stockEfectivo = producto.unidad === 'kg' ? producto.stock_actual : (producto.stock_cajas || producto.stock_actual);
    if (stockEfectivo <= 0) return;
    setProductoSeleccionado(producto);
    setModalPesajeOpen(true);
  };

  const handleAgregarAlCarrito = (itemToScan: ItemVenta) => {
    setCarrito(prev => {
      const existing = prev.find(i => 
        i.producto_id === itemToScan.producto_id && 
        i.precio_unitario === itemToScan.precio_unitario &&
        i.envase_id === itemToScan.envase_id &&
        i.calibre === itemToScan.calibre &&
        i.lote_id === itemToScan.lote_id
      );
      
      if (existing) {
        return prev.map(i => 
          i.temp_id === existing.temp_id 
            ? { 
                ...i, 
                peso_neto: (i.peso_neto || 0) + (itemToScan.peso_neto || 0),
                neto: i.neto + itemToScan.neto, 
                total_fruta: (i.total_fruta || 0) + (itemToScan.total_fruta || 0),
                total_envases: (i.total_envases || 0) + (itemToScan.total_envases || 0),
                total: i.total + itemToScan.total,
                envase_cantidad: (i.envase_cantidad || 0) + (itemToScan.envase_cantidad || 0)
              } 
            : i
        );
      }
      
      return [...prev, { ...itemToScan, temp_id: `${Date.now()}-${Math.random()}` }];
    });
  };

  const handleEliminarItem = (tempId: string) => {
    setCarrito(prev => prev.filter(item => item.temp_id !== tempId));
  };

  const handleAbrirModalPago = () => {
    if (carrito.length === 0 || !sesionActiva) return;
    setModalPagoOpen(true);
  };

  const handleProcesarVenta = async (
    metodoPago: MetodoPago, 
    clienteSeleccionado?: string, 
    requiereFactura?: boolean,
    clienteRut?: string
  ) => {
    if (!sesionActiva) return;
    setProcesando(true);
    try {
      const items: ItemVenta[] = carrito.map(({ temp_id, ...item }) => item);
      await VentasService.procesarVenta(
        items, 
        metodoPago, 
        sesionActiva, 
        user?.tenantId || 'default-tenant',
        user?.sucursalesIds?.[0] || 'default-sucursal',
        user?.id || 'unknown',
        clienteSeleccionado || undefined, 
        requiereFactura,
        clienteRut
      );
      toast({ 
        title: 'Venta exitosa', 
        description: requiereFactura ? 'La venta ha sido registrada para facturar.' : undefined 
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
    <div className="flex h-full w-full overflow-hidden selection:bg-primary/10">
        {/* Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="px-6 py-4 border-b border-border/40 bg-muted/5">
            <div className="flex items-center justify-between mb-4">
               <div>
                <h1 className="text-xl font-black flex items-center gap-2 text-foreground tracking-tight italic">
                  CATÁLOGO <span className="text-primary tracking-tighter">V2</span>
                  <Badge variant="outline" className="text-[10px] font-black py-0 h-4 border-primary/20 text-primary">{productosFiltrados.length}</Badge>
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

            <div className="relative max-w-xl group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Buscar productos o categorías..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 border-border/50 bg-background/50 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
              />
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
        <aside className="hidden w-80 2xl:w-96 flex-col lg:flex border-l border-border/50 relative bg-muted/[0.03] overflow-hidden h-full">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CartPremium items={carrito} onEliminarItem={handleEliminarItem} />
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

      <WeightModalPremium producto={productoSeleccionado} open={modalPesajeOpen} onClose={() => setModalPesajeOpen(false)} onAgregar={handleAgregarAlCarrito} />
      <PaymentDrawer open={modalPagoOpen} onOpenChange={setModalPagoOpen} items={carrito} total={totalCarrito} clientes={clientes} onConfirm={handleProcesarVenta} procesando={procesando} />
    </div>
  );
}

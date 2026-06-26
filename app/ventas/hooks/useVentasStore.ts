import { create } from 'zustand';
import { Producto, CarritoItem, ItemVenta, MetodoPago } from '../../../lib/types/pos';
import { VentasService } from '../../../lib/services/ventas.service';
import { SesionService } from '../../../lib/services/sesion.service';
import { formatCLPCurrency } from '../../../lib/utils';

interface VentasState {
  carrito: CarritoItem[];
  productoSeleccionado: Producto | null;
  modalPesajeOpen: boolean;
  modalPagoOpen: boolean;
  sesionActiva: string | null;
  procesando: boolean;
  searchQuery: string;
  isOnline: boolean;
  modalScannerOpen: boolean;

  // Setters
  setCarrito: (carrito: CarritoItem[]) => void;
  setProductoSeleccionado: (producto: Producto | null) => void;
  setModalPesajeOpen: (open: boolean) => void;
  setModalPagoOpen: (open: boolean) => void;
  setProcesando: (procesando: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  setIsOnline: (isOnline: boolean) => void;
  setModalScannerOpen: (open: boolean) => void;

  // Actions
  verificarSesionActiva: (toast: any) => Promise<void>;
  handleProductDetected: (producto: Producto, toast: any) => void;
  handleAgregarAlCarrito: (itemToScan: ItemVenta, toast: any) => void;
  handleEliminarItem: (tempId: string) => void;
  handleProcesarVenta: (
    metodoPago: MetodoPago, 
    clienteSeleccionado: string | undefined, 
    pagoCon: number | undefined,
    toast: any
  ) => Promise<boolean>;
}

export const useVentasStore = create<VentasState>((set, get) => ({
  carrito: [],
  productoSeleccionado: null,
  modalPesajeOpen: false,
  modalPagoOpen: false,
  sesionActiva: null,
  procesando: false,
  searchQuery: '',
  isOnline: true,
  modalScannerOpen: false,

  setCarrito: (carrito) => set({ carrito }),
  setProductoSeleccionado: (productoSeleccionado) => set({ productoSeleccionado }),
  setModalPesajeOpen: (modalPesajeOpen) => set({ modalPesajeOpen }),
  setModalPagoOpen: (modalPagoOpen) => set({ modalPagoOpen }),
  setProcesando: (procesando) => set({ procesando }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setModalScannerOpen: (modalScannerOpen) => set({ modalScannerOpen }),

  verificarSesionActiva: async (toast) => {
    try {
      const sesion = await SesionService.obtenerSesionActiva();
      if (sesion) {
        set({ sesionActiva: sesion.id });
      } else {
        toast({
          title: 'No hay sesión activa',
          description: 'Abre sesión para vender',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
    }
  },

  handleProductDetected: (producto, toast) => {
    if (producto.stock_actual <= 0) {
      toast({
        title: 'Sin stock',
        description: `El producto ${producto.nombre} no tiene stock disponible para la venta.`,
        variant: 'destructive',
      });
      return;
    }

    set({
      productoSeleccionado: producto,
      modalPesajeOpen: true,
    });
  },

  handleAgregarAlCarrito: (itemToScan, toast) => {
    set((state) => {
      const prev = state.carrito;
      const existing = prev.find(i => 
        i.nombre === itemToScan.nombre && 
        i.unidad === itemToScan.unidad && 
        i.precio_unitario === itemToScan.precio_unitario
      );
      
      if (existing) {
        const nextCarrito = prev.map(i => 
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
        return { carrito: nextCarrito };
      }
      
      return { 
        carrito: [...prev, { ...itemToScan, temp_id: `${Date.now()}-${Math.random()}` }] 
      };
    });
    
    toast({ title: 'Agregado', description: `${itemToScan.nombre} al carrito` });
  },

  handleEliminarItem: (tempId) => {
    set((state) => ({
      carrito: state.carrito.filter(item => item.temp_id !== tempId)
    }));
  },

  handleProcesarVenta: async (metodoPago, clienteSeleccionado, pagoCon, toast) => {
    const { sesionActiva, carrito } = get();
    if (!sesionActiva) return false;
    
    set({ procesando: true });
    try {
      const items: ItemVenta[] = carrito.map(({ temp_id, ...item }) => item);
      await VentasService.procesarVenta(items, metodoPago, sesionActiva, clienteSeleccionado || undefined);
      
      const totalCarrito = carrito.reduce((sum, item) => sum + item.total, 0);
      const vuelto = (pagoCon && pagoCon > totalCarrito) ? (pagoCon - totalCarrito) : 0;
      const description = vuelto > 0 
        ? `Vuelto a entregar: ${formatCLPCurrency(vuelto)}` 
        : `Pago registrado con ${metodoPago === 'efectivo' ? 'Efectivo' : metodoPago}`;

      toast({ 
        title: 'Venta exitosa', 
        description,
        variant: 'success',
      });
      
      set({ 
        carrito: [], 
        modalPagoOpen: false 
      });
      return true;
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Error desconocido al procesar venta.', 
        variant: 'destructive' 
      });
      return false;
    } finally {
      set({ procesando: false });
    }
  },
}));

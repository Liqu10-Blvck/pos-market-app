import { create } from 'zustand';
import { Producto, Cliente, SesionCaja } from '../types/pos';
import { ProductosService } from '../services/productos.service';
import { ClientesService } from '../services/clientes.service';

interface AppState {
  productos: Producto[];
  productosCargados: boolean;
  clientes: Cliente[];
  clientesCargados: boolean;
  cargandoGlobal: boolean;
  sesionActiva: SesionCaja | null;
  
  // Actions
  setCargandoGlobal: (loading: boolean) => void;
  setProductos: (productos: Producto[]) => void;
  setClientes: (clientes: Cliente[]) => void;
  setSesionActiva: (sesion: SesionCaja | null) => void;
  
  // Subscription listeners
  iniciarProductosListener: () => () => void;
  iniciarClientesListener: () => () => void;
}

// Keep track of active unsubscribes outside the store to prevent duplicate listeners
let activeProductosUnsubscribe: (() => void) | null = null;
let activeClientesUnsubscribe: (() => void) | null = null;
let productosRefCount = 0;
let clientesRefCount = 0;

export const useAppStore = create<AppState>((set, get) => ({
  productos: [],
  productosCargados: false,
  clientes: [],
  clientesCargados: false,
  cargandoGlobal: false,
  sesionActiva: null,

  setCargandoGlobal: (loading) => set({ cargandoGlobal: loading }),
  setProductos: (productos) => set({ productos, productosCargados: true }),
  setClientes: (clientes) => set({ clientes, clientesCargados: true }),
  setSesionActiva: (sesionActiva) => set({ sesionActiva }),

  iniciarProductosListener: () => {
    productosRefCount++;
    
    if (!activeProductosUnsubscribe) {
      activeProductosUnsubscribe = ProductosService.suscribirAProductos((productos) => {
        set({ productos, productosCargados: true });
      });
    }

    // Return cleanup function
    return () => {
      productosRefCount--;
      if (productosRefCount <= 0 && activeProductosUnsubscribe) {
        activeProductosUnsubscribe();
        activeProductosUnsubscribe = null;
        set({ productosCargados: false });
      }
    };
  },

  iniciarClientesListener: () => {
    clientesRefCount++;
    
    if (!activeClientesUnsubscribe) {
      activeClientesUnsubscribe = ClientesService.suscribirAClientes((clientes) => {
        set({ clientes, clientesCargados: true });
      });
    }

    // Return cleanup function
    return () => {
      clientesRefCount--;
      if (clientesRefCount <= 0 && activeClientesUnsubscribe) {
        activeClientesUnsubscribe();
        activeClientesUnsubscribe = null;
        set({ clientesCargados: false });
      }
    };
  }
}));

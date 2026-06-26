import { create } from 'zustand';
import { Venta, SesionCaja } from '../../../lib/types/pos';
import { collection, getDocs, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';
import { TicketGenerator } from '../../../lib/utils/ticket-generator';

interface HistorialState {
  ventas: Venta[];
  sesiones: SesionCaja[];
  cargando: boolean;
  activeTab: 'diario' | 'sesiones' | 'reposicion';
  fechaInicio: string;
  fechaFin: string;
  selectedDayKey: string | null;
  selectedVenta: Venta | null;
  umbralReposicion: number;
  busquedaReposicion: string;

  // Setters
  setActiveTab: (activeTab: 'diario' | 'sesiones' | 'reposicion') => void;
  setFechaInicio: (fechaInicio: string) => void;
  setFechaFin: (fechaFin: string) => void;
  setSelectedDayKey: (key: string | null) => void;
  setSelectedVenta: (venta: Venta | null) => void;
  setUmbralReposicion: (umbral: number) => void;
  setBusquedaReposicion: (search: string) => void;

  // Actions
  cargarDatos: () => Promise<void>;
  cargarVentasFiltradas: (ini: string, fin: string) => Promise<void>;
  handleFiltrarRango: () => Promise<void>;
  handleImprimirTicket: (venta: Venta) => void;
}

export const useHistorialStore = create<HistorialState>((set, get) => ({
  ventas: [],
  sesiones: [],
  cargando: true,
  activeTab: 'diario',
  fechaInicio: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  fechaFin: format(new Date(), 'yyyy-MM-dd'),
  selectedDayKey: null,
  selectedVenta: null,
  umbralReposicion: 5,
  busquedaReposicion: '',

  setActiveTab: (activeTab) => set({ activeTab }),
  setFechaInicio: (fechaInicio) => set({ fechaInicio }),
  setFechaFin: (fechaFin) => set({ fechaFin }),
  setSelectedDayKey: (selectedDayKey) => set({ selectedDayKey, selectedVenta: null }),
  setSelectedVenta: (selectedVenta) => set({ selectedVenta }),
  setUmbralReposicion: (umbralReposicion) => set({ umbralReposicion }),
  setBusquedaReposicion: (busquedaReposicion) => set({ busquedaReposicion }),

  cargarDatos: async () => {
    set({ cargando: true });
    try {
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
      set({ sesiones: sesionesData });

      // 2. Fetch sales in date range
      const { fechaInicio, fechaFin } = get();
      await get().cargarVentasFiltradas(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error al cargar datos contables e historial:', error);
    } finally {
      set({ cargando: false });
    }
  },

  cargarVentasFiltradas: async (ini, fin) => {
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

      set({ ventas: ventasData });

      // Automatically select the first day if available
      if (ventasData.length > 0) {
        const firstSaleDate = ventasData[0].fecha.toDate();
        const firstDayKey = format(firstSaleDate, 'yyyy-MM-dd');
        set({ selectedDayKey: firstDayKey });
      } else {
        set({ selectedDayKey: null });
      }
      set({ selectedVenta: null });
    } catch (err) {
      console.error("Error al cargar ventas en rango:", err);
    }
  },

  handleFiltrarRango: async () => {
    set({ cargando: true });
    const { fechaInicio, fechaFin } = get();
    await get().cargarVentasFiltradas(fechaInicio, fechaFin);
    set({ cargando: false });
  },

  handleImprimirTicket: (venta) => {
    const ticket = TicketGenerator.generar(venta, 'POS MARKET');
    TicketGenerator.imprimir(ticket);
  },
}));

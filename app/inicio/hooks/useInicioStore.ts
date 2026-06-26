import { create } from 'zustand';
import { SesionService } from '../../../lib/services/sesion.service';
import { VentasService } from '../../../lib/services/ventas.service';
import { MetasService } from '../../../lib/services/metas.service';
import { formatCLPCurrency } from '../../../lib/utils';
import { SesionCaja } from '../../../lib/types/pos';

interface InicioState {
  resumenSesion: any;
  progresoMetas: any;
  metaDialog: boolean;
  nuevaMetaDiaria: string;
  cargando: boolean;
  guardandoMeta: boolean;

  setMetaDialog: (open: boolean) => void;
  setNuevaMetaDiaria: (val: string) => void;
  
  cargarDatos: (setSesionActiva: (sesion: SesionCaja | null) => void) => Promise<void>;
  handleGuardarMeta: (userId: string | undefined, toast: any) => Promise<boolean>;
}

export const useInicioStore = create<InicioState>((set, get) => ({
  resumenSesion: null,
  progresoMetas: null,
  metaDialog: false,
  nuevaMetaDiaria: '',
  cargando: true,
  guardandoMeta: false,

  setMetaDialog: (metaDialog) => set({ metaDialog }),
  setNuevaMetaDiaria: (nuevaMetaDiaria) => set({ nuevaMetaDiaria }),

  cargarDatos: async (setSesionActiva) => {
    set({ cargando: true });
    try {
      const sesion = await SesionService.obtenerSesionActiva();
      setSesionActiva(sesion);
      if (sesion) {
        const resumen = await VentasService.obtenerResumenSesion(sesion.id);
        set({ resumenSesion: resumen });
      } else {
        set({ resumenSesion: null });
      }
      
      const metas = await MetasService.obtenerProgresoMetas();
      set({ 
        progresoMetas: metas,
        nuevaMetaDiaria: metas.metaDiaria.toString()
      });
    } catch (error) {
      console.error('Error al cargar datos del inicio:', error);
    } finally {
      set({ cargando: false });
    }
  },

  handleGuardarMeta: async (userId, toast) => {
    const { nuevaMetaDiaria } = get();
    const monto = parseInt(nuevaMetaDiaria);
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Por favor, ingresa un monto válido mayor a 0',
        variant: 'destructive',
      });
      return false;
    }

    set({ guardandoMeta: true });
    try {
      await MetasService.guardarMetaDiaria(monto, userId);
      toast({
        title: 'Meta actualizada',
        description: `La meta diaria de ventas se ha configurado en ${formatCLPCurrency(monto)}.`
      });
      set({ metaDialog: false });
      
      // Reload metas
      const metas = await MetasService.obtenerProgresoMetas();
      set({ progresoMetas: metas });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la meta.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardandoMeta: false });
    }
  }
}));

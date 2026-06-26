import { create } from 'zustand';
import { Cliente, Venta } from '../../../lib/types/pos';
import { ClientesService } from '../../../lib/services/clientes.service';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '../../../lib/utils';

interface ClientesFormData {
  nombre: string;
  telefono: string;
  saldo_deuda: string;
  direccion: string;
  nombre_negocio: string;
  rubro_negocio: string;
  limite_credito: string;
}

interface ClientesState {
  searchQuery: string;
  modalOpen: boolean;
  editando: Cliente | null;
  guardando: boolean;
  formData: ClientesFormData;
  
  // Abonos State
  abonoModalOpen: boolean;
  abonoCliente: Cliente | null;
  abonoMonto: string;
  abonoMetodo: 'efectivo' | 'transferencia';

  // Detalle & IA State
  detalleModalOpen: boolean;
  detalleCliente: Cliente | null;
  detalleVentas: Venta[];
  cargandoVentas: boolean;
  recomendacionIA: string;
  generandoRecomendacion: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setModalOpen: (open: boolean) => void;
  setFormData: (fields: Partial<ClientesFormData>) => void;
  handleAbrirModal: (cliente?: Cliente) => void;
  handleGuardar: (toast: any) => Promise<boolean>;

  // Abonos Actions
  setAbonoModalOpen: (open: boolean) => void;
  setAbonoMonto: (monto: string) => void;
  setAbonoMetodo: (metodo: 'efectivo' | 'transferencia') => void;
  handleAbrirAbono: (cliente: Cliente) => void;
  handleGuardarAbono: (toast: any) => Promise<boolean>;

  // Detalle & IA Actions
  setDetalleModalOpen: (open: boolean) => void;
  handleAbrirDetalle: (cliente: Cliente, toast: any) => Promise<void>;
  generarOfertaIA: (toast: any) => Promise<void>;
}

const initialFormData = (): ClientesFormData => ({
  nombre: '',
  telefono: '',
  saldo_deuda: '0',
  direccion: '',
  nombre_negocio: '',
  rubro_negocio: '',
  limite_credito: '0',
});

export const useClientesStore = create<ClientesState>((set, get) => ({
  searchQuery: '',
  modalOpen: false,
  editando: null,
  guardando: false,
  formData: initialFormData(),

  // Abonos Initial State
  abonoModalOpen: false,
  abonoCliente: null,
  abonoMonto: '0',
  abonoMetodo: 'efectivo',

  // Detalle & IA Initial State
  detalleModalOpen: false,
  detalleCliente: null,
  detalleVentas: [],
  cargandoVentas: false,
  recomendacionIA: '',
  generandoRecomendacion: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setModalOpen: (modalOpen) => set({ modalOpen }),
  setFormData: (fields) => set((state) => ({ formData: { ...state.formData, ...fields } })),

  setAbonoModalOpen: (abonoModalOpen) => set({ abonoModalOpen }),
  setAbonoMonto: (abonoMonto) => set({ abonoMonto }),
  setAbonoMetodo: (abonoMetodo) => set({ abonoMetodo }),

  setDetalleModalOpen: (detalleModalOpen) => set({ detalleModalOpen }),

  handleAbrirModal: (cliente) => {
    if (cliente) {
      set({
        editando: cliente,
        formData: {
          nombre: cliente.nombre,
          telefono: cliente.telefono || '',
          saldo_deuda: formatCLPCurrency(cliente.saldo_deuda),
          direccion: cliente.direccion || '',
          nombre_negocio: cliente.nombre_negocio || '',
          rubro_negocio: cliente.rubro_negocio || '',
          limite_credito: cliente.limite_credito ? formatCLPCurrency(cliente.limite_credito) : '0',
        },
        modalOpen: true,
      });
    } else {
      set({
        editando: null,
        formData: initialFormData(),
        modalOpen: true,
      });
    }
  },

  handleAbrirAbono: (cliente) => {
    set({
      abonoCliente: cliente,
      abonoMonto: formatCLPCurrency(cliente.saldo_deuda),
      abonoMetodo: 'efectivo',
      abonoModalOpen: true,
    });
  },

  handleGuardar: async (toast) => {
    const { formData, editando } = get();
    if (!formData.nombre) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa el nombre del cliente',
        variant: 'destructive',
      });
      return false;
    }

    set({ guardando: true });
    try {
      const parsedSaldo = parseChileanMoneyInput(formData.saldo_deuda);
      const parsedLimite = parseChileanMoneyInput(formData.limite_credito);
      const clienteData = {
        nombre: formData.nombre,
        telefono: formData.telefono || undefined,
        saldo_deuda: parsedSaldo,
        direccion: formData.direccion || undefined,
        nombre_negocio: formData.nombre_negocio || undefined,
        rubro_negocio: formData.rubro_negocio || undefined,
        limite_credito: parsedLimite || undefined,
        activo: true,
      };

      if (editando) {
        await ClientesService.actualizarCliente(editando.id, clienteData);
        toast({ title: 'Cliente actualizado' });
      } else {
        await ClientesService.crearCliente(clienteData);
        toast({ title: 'Cliente registrado' });
      }

      set({ modalOpen: false });
      return true;
    } catch (error: any) {
      console.error('Error al guardar cliente:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error desconocido al guardar.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardando: false });
    }
  },

  handleGuardarAbono: async (toast) => {
    const { abonoCliente, abonoMonto, abonoMetodo } = get();
    if (!abonoCliente) return false;

    const monto = parseChileanMoneyInput(abonoMonto);
    if (monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto a abonar debe ser mayor que cero.',
        variant: 'destructive',
      });
      return false;
    }

    if (monto > abonoCliente.saldo_deuda) {
      toast({
        title: 'Monto excede deuda',
        description: `El abono no puede ser mayor que la deuda actual (${formatCLPCurrency(abonoCliente.saldo_deuda)}).`,
        variant: 'destructive',
      });
      return false;
    }

    set({ guardando: true });
    try {
      await ClientesService.registrarAbono(abonoCliente.id, monto, abonoMetodo);
      toast({
        title: 'Abono registrado',
        description: `Se abonaron ${formatCLPCurrency(monto)} a la cuenta de ${abonoCliente.nombre}.`,
      });
      set({ abonoModalOpen: false });
      return true;
    } catch (error: any) {
      console.error('Error al registrar abono:', error);
      toast({
        title: 'Error al registrar abono',
        description: error.message || 'Error desconocido al registrar el abono.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardando: false });
    }
  },

  handleAbrirDetalle: async (cliente, toast) => {
    set({
      detalleCliente: cliente,
      detalleVentas: [],
      cargandoVentas: true,
      recomendacionIA: '',
      detalleModalOpen: true
    });

    try {
      const { VentasService } = await import('../../../lib/services/ventas.service');
      const ventas = await VentasService.obtenerVentasPorCliente(cliente.id);
      set({ detalleVentas: ventas });
    } catch (error: any) {
      console.error('Error al cargar ventas del cliente:', error);
      toast({
        title: 'Error al cargar historial',
        description: 'No se pudo obtener el historial de compras del cliente.',
        variant: 'destructive'
      });
    } finally {
      set({ cargandoVentas: false });
    }
  },

  generarOfertaIA: async (toast) => {
    const { detalleCliente, detalleVentas } = get();
    if (!detalleCliente) return;

    set({ generandoRecomendacion: true, recomendacionIA: '' });
    try {
      const token = await import('firebase/auth').then(m => m.getAuth().currentUser?.getIdToken());
      const res = await fetch('/api/clientes-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cliente: detalleCliente, compras: detalleVentas })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con el servidor.');

      set({ recomendacionIA: data.recommendation });
    } catch (error: any) {
      console.error('Error al generar oferta IA:', error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo generar la recomendación en este momento.',
        variant: 'destructive'
      });
    } finally {
      set({ generandoRecomendacion: false });
    }
  }
}));

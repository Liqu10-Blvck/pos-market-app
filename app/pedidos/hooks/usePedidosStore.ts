import { create } from 'zustand';
import { PedidosService } from '@/lib/services/pedidos.service';
import { Pedido, EstadoPedido, EstadoPago, ItemPedido } from '@/lib/types/pedido';
import { MetodoPago, Producto } from '@/lib/types/pos';
import { parseChileanMoneyInput } from '@/lib/utils';

interface PedidosState {
  pedidos: Pedido[];
  cargando: boolean;
  searchQuery: string;
  filtroEstado: EstadoPedido | 'todos';
  filtroPago: EstadoPago | 'todos';
  
  // Detalle de Pedido
  selectedPedido: Pedido | null;
  detailModalOpen: boolean;

  // Formulario Creación de Pedido
  createModalOpen: boolean;
  clienteId: string;
  clienteNombre: string;
  direccionEntrega: string;
  notas: string;
  formItems: Omit<ItemPedido, 'total'>[];
  selProdId: string;
  selProdQty: string;
  selProdPrice: string;
  selProdEsCaja: boolean;
  guardandoPedido: boolean;

  // Setters básicos
  setSearchQuery: (query: string) => void;
  setFiltroEstado: (estado: EstadoPedido | 'todos') => void;
  setFiltroPago: (pago: EstadoPago | 'todos') => void;
  setSelectedPedido: (pedido: Pedido | null) => void;
  setDetailModalOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setClienteId: (id: string) => void;
  setClienteNombre: (nombre: string) => void;
  setDireccionEntrega: (direccion: string) => void;
  setNotas: (notas: string) => void;
  setSelProdId: (id: string) => void;
  setSelProdQty: (qty: string) => void;
  setSelProdPrice: (price: string) => void;
  setSelProdEsCaja: (esCaja: boolean) => void;

  // Operaciones
  iniciarPedidosListener: () => () => void;
  resetForm: () => void;
  addItemToPedido: (productos: Producto[], toast: any) => void;
  removeItemFromPedido: (productId: string) => void;
  toggleProductInPedido: (product: Producto) => void;
  updateItemQty: (productId: string, cantidad: number) => void;
  updateItemFormat: (productId: string, esCaja: boolean, precioUnitario: number, unidad: string) => void;
  updateItemPrice: (productId: string, precioUnitario: number) => void;
  handleCrearPedido: (toast: any) => Promise<boolean>;
  handleActualizarEstado: (id: string, estado: EstadoPedido, toast: any) => Promise<void>;
  handleCompletarPagoDirecto: (id: string, metodo: MetodoPago, toast: any) => Promise<void>;
  handleEntregarYCobrar: (pedido: Pedido, metodoPago: MetodoPago, sesionId: string, toast: any) => Promise<boolean>;
  handleEliminarPedido: (id: string, toast: any) => Promise<void>;
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  pedidos: [],
  cargando: true,
  searchQuery: '',
  filtroEstado: 'todos',
  filtroPago: 'todos',

  selectedPedido: null,
  detailModalOpen: false,

  createModalOpen: false,
  clienteId: '',
  clienteNombre: 'Cliente General',
  direccionEntrega: '',
  notas: '',
  formItems: [],
  selProdId: '',
  selProdQty: '',
  selProdPrice: '',
  selProdEsCaja: false,
  guardandoPedido: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFiltroEstado: (filtroEstado) => set({ filtroEstado }),
  setFiltroPago: (filtroPago) => set({ filtroPago }),
  setSelectedPedido: (selectedPedido) => set({ selectedPedido }),
  setDetailModalOpen: (detailModalOpen) => set({ detailModalOpen }),
  setCreateModalOpen: (createModalOpen) => set({ createModalOpen }),
  setClienteId: (clienteId) => set({ clienteId }),
  setClienteNombre: (clienteNombre) => set({ clienteNombre }),
  setDireccionEntrega: (direccionEntrega) => set({ direccionEntrega }),
  setNotas: (notas) => set({ notas }),
  setSelProdId: (selProdId) => set({ selProdId }),
  setSelProdQty: (selProdQty) => set({ selProdQty }),
  setSelProdPrice: (selProdPrice) => set({ selProdPrice }),
  setSelProdEsCaja: (selProdEsCaja) => set({ selProdEsCaja }),

  resetForm: () => set({
    clienteId: '',
    clienteNombre: 'Cliente General',
    direccionEntrega: '',
    notas: '',
    formItems: [],
    selProdId: '',
    selProdQty: '',
    selProdPrice: '',
    selProdEsCaja: false,
    guardandoPedido: false
  }),

  iniciarPedidosListener: () => {
    set({ cargando: true });
    return PedidosService.suscribirAPedidos((list) => {
      set({ pedidos: list, cargando: false });
      // Mantener actualizado el pedido seleccionado si el modal de detalles está abierto
      const currentSelected = get().selectedPedido;
      if (currentSelected) {
        const updated = list.find((p) => p.id === currentSelected.id);
        if (updated) {
          set({ selectedPedido: updated });
        }
      }
    });
  },

  addItemToPedido: (productos, toast) => {
    const { selProdId, selProdQty, selProdPrice, selProdEsCaja, formItems } = get();
    if (!selProdId || !selProdQty) {
      toast({
        title: 'Faltan campos',
        description: 'Debes seleccionar un producto y especificar la cantidad.',
        variant: 'default'
      });
      return;
    }

    const product = productos.find((p) => p.id === selProdId);
    if (!product) return;

    const qty = parseFloat(selProdQty);
    
    // Si se vende por caja, el precio base es precio_caja si existe, de lo contrario unitario * cantidad_por_caja
    let basePrice = product.precio;
    if (selProdEsCaja) {
      basePrice = product.precio_caja || (product.precio * (product.cantidad_por_caja || 1));
    }
    
    const price = selProdPrice ? Math.round(parseFloat(selProdPrice)) : basePrice;

    if (qty <= 0 || isNaN(qty)) {
      toast({
        title: 'Cantidad inválida',
        description: 'La cantidad debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    const exists = formItems.some((item) => item.producto_id === selProdId);
    if (exists) {
      toast({
        title: 'Producto repetido',
        description: 'Este producto ya está en el pedido. Elimínalo primero para corregir.',
        variant: 'default'
      });
      return;
    }

    const newItem: Omit<ItemPedido, 'total'> = {
      producto_id: selProdId,
      nombre: selProdEsCaja ? `${product.nombre} (${product.tipo_empaque || 'Caja'})` : product.nombre,
      precio_unitario: price,
      unidad: selProdEsCaja ? 'unid' : product.unidad,
      cantidad: qty,
      es_caja: selProdEsCaja,
      cantidad_por_caja: product.cantidad_por_caja,
      tipo_empaque: product.tipo_empaque
    };

    set({
      formItems: [...formItems, newItem],
      selProdId: '',
      selProdQty: '',
      selProdPrice: '',
      selProdEsCaja: false
    });
  },

  removeItemFromPedido: (productId) => {
    set((state) => ({
      formItems: state.formItems.filter((item) => item.producto_id !== productId)
    }));
  },

  toggleProductInPedido: (product) => {
    const { formItems } = get();
    const exists = formItems.some((item) => item.producto_id === product.id);
    if (exists) {
      set({
        formItems: formItems.filter((item) => item.producto_id !== product.id)
      });
    } else {
      const newItem: Omit<ItemPedido, 'total'> = {
        producto_id: product.id,
        nombre: product.nombre,
        precio_unitario: product.precio,
        unidad: product.unidad,
        cantidad: 1,
        es_caja: false,
        cantidad_por_caja: product.cantidad_por_caja,
        tipo_empaque: product.tipo_empaque
      };
      set({
        formItems: [...formItems, newItem]
      });
    }
  },

  updateItemQty: (productId, cantidad) => {
    const { formItems } = get();
    set({
      formItems: formItems.map((item) =>
        item.producto_id === productId ? { ...item, cantidad } : item
      )
    });
  },

  updateItemFormat: (productId, esCaja, precioUnitario, unidad) => {
    const { formItems } = get();
    set({
      formItems: formItems.map((item) =>
        item.producto_id === productId
          ? { ...item, es_caja: esCaja, precio_unitario: precioUnitario, unidad: unidad as any }
          : item
      )
    });
  },

  updateItemPrice: (productId, precioUnitario) => {
    const { formItems } = get();
    set({
      formItems: formItems.map((item) =>
        item.producto_id === productId ? { ...item, precio_unitario: precioUnitario } : item
      )
    });
  },

  handleCrearPedido: async (toast) => {
    const { clienteId, clienteNombre, direccionEntrega, notas, formItems } = get();
    
    if (formItems.length === 0) {
      toast({
        title: 'Pedido vacío',
        description: 'Debes añadir al menos un producto al pedido.',
        variant: 'destructive'
      });
      return false;
    }

    set({ guardandoPedido: true });
    try {
      const itemsConTotal: ItemPedido[] = formItems.map((item) => ({
        ...item,
        total: Math.round(item.cantidad * item.precio_unitario)
      }));

      const total = itemsConTotal.reduce((sum, item) => sum + item.total, 0);

      await PedidosService.crearPedido({
        cliente_id: clienteId || undefined,
        cliente_nombre: clienteNombre || 'Cliente General',
        items: itemsConTotal,
        total,
        estado: 'pendiente',
        estado_pago: 'pendiente',
        direccion_entrega: direccionEntrega.trim() || undefined,
        notas: notas.trim() || undefined
      });

      toast({
        title: 'Pedido creado',
        description: 'El pedido se ha registrado correctamente en el sistema.',
        variant: 'success'
      });

      get().resetForm();
      set({ createModalOpen: false });
      return true;
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al registrar pedido',
        description: err.message || 'No se pudo guardar el pedido.',
        variant: 'destructive'
      });
      set({ guardandoPedido: false });
      return false;
    }
  },

  handleActualizarEstado: async (id, estado, toast) => {
    try {
      await PedidosService.actualizarEstadoPedido(id, estado);
      toast({
        title: 'Estado actualizado',
        description: `El estado del pedido ahora es "${estado}".`,
        variant: 'success'
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo actualizar el estado.',
        variant: 'destructive'
      });
    }
  },

  handleCompletarPagoDirecto: async (id, metodo, toast) => {
    try {
      await PedidosService.actualizarEstadoPago(id, 'pagado', metodo);
      toast({
        title: 'Pago registrado',
        description: 'Se ha registrado el pago del pedido.',
        variant: 'success'
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo registrar el pago.',
        variant: 'destructive'
      });
    }
  },

  handleEntregarYCobrar: async (pedido, metodoPago, sesionId, toast) => {
    if (!sesionId) {
      toast({
        title: 'Caja cerrada',
        description: 'Debes abrir una caja en la página de Inicio para registrar la venta.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      await PedidosService.completarCobroPedido(pedido, metodoPago, sesionId);
      toast({
        title: 'Pedido Completado y Cobrado',
        description: 'El pedido se ha registrado como venta POS. Stock y contabilidad actualizados.',
        variant: 'success'
      });
      set({ detailModalOpen: false, selectedPedido: null });
      return true;
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al procesar entrega',
        description: err.message || 'No se pudo completar el cobro del pedido.',
        variant: 'destructive'
      });
      return false;
    }
  },

  handleEliminarPedido: async (id, toast) => {
    try {
      await PedidosService.eliminarPedido(id);
      toast({
        title: 'Pedido eliminado',
        description: 'El pedido ha sido removido del sistema.'
      });
      set({ detailModalOpen: false, selectedPedido: null });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo eliminar el pedido.',
        variant: 'destructive'
      });
    }
  }
}));

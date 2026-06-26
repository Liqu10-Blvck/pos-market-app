import { create } from 'zustand';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { format } from 'date-fns';
import { uploadImage } from '@/lib/firebase/storage';
import { ContabilidadService } from '@/lib/services/contabilidad.service';
import { GastosProgramadosService, GastoProgramado } from '@/lib/services/gastos-programados.service';
import { MetasService, MetaFinanciera } from '@/lib/services/metas.service';
import { DistribucionService, LogDistribucion } from '@/lib/services/distribucion.service';
import { AIService } from '@/lib/services/ai.service';
import { CuentaContable, AsientoContable, FacturaCompra, TipoDocumentoCompra, MovimientoContable, LibroMayorData, ContabilidadKPIs } from '@/lib/types/contabilidad';
import { Producto, ConsultaIALog, Venta, User } from '@/lib/types/pos';
import { parseChileanMoneyInput } from '@/lib/utils';
import { LocalImage } from '@/app/admin/hooks/useAdminStore';

type ToastFn = (options: { title?: string; description?: string; variant?: 'default' | 'destructive' | 'success' }) => void;

export interface RowProductoFactura {
  producto_id: string;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
  cantidad_por_caja?: number;
}

interface ContabilidadState {
  activeTab: string;
  cargando: boolean;
  cuentas: CuentaContable[];
  asientos: AsientoContable[];
  facturas: FacturaCompra[];
  productos: Producto[];
  velocidadesVenta: Record<string, number>;

  // Ledger
  selectedCuentaCodigo: string;
  ledgerData: LibroMayorData | null;

  // Expenses Tab Form
  gastoGlosa: string;
  gastoMonto: string;
  gastoMetodo: 'efectivo' | 'transferencia';
  gastosProgramados: GastoProgramado[];
  metasFinancieras: MetaFinanciera[];
  historialDistribucion: LogDistribucion[];
  fondosAsignados: { caja: number; banco: number };
  tipoGastoRegistro: 'directo' | 'programado';
  progConcepto: string;
  progMonto: string;
  progFecha: string;

  // Savings Goal Form
  metaAhorroNombre: string;
  metaAhorroMonto: string;
  metaAhorroFecha: string;

  // Distribute Funds Dialog
  distribucionOpen: boolean;
  distribucionMonto: string;
  distribucionOrigen: 'caja' | 'banco';
  distribucionDestinoTipo: 'gasto' | 'meta_financiera';
  distribucionDestinoId: string;
  distribucionDestinoNombre: string;
  ejecutandoDistribucion: boolean;

  // Purchase Invoice Modal & Detalle
  facturaOpen: boolean;
  numFactura: string;
  provRut: string;
  provNombre: string;
  facturaFecha: string;
  facturaMetodo: 'efectivo' | 'transferencia' | 'credito';
  tipoDocumento: TipoDocumentoCompra;
  imagenFactura: LocalImage | null;
  facturaProductos: RowProductoFactura[];
  selProdId: string;
  selProdQty: string;
  selProdCost: string;
  guardandoFactura: boolean;

  selectedFactura: FacturaCompra | null;
  facturaDetalleOpen: boolean;
  subiendoImagenDetalle: boolean;

  // Capital Contribution Form
  capitalOpen: boolean;
  capitalMonto: string;
  capitalDestino: 'caja' | 'banco' | 'mixto';
  capitalMontoCaja: string;
  capitalMontoBanco: string;
  capitalTipo: 'capital' | 'utilidades';
  capitalGlosa: string;
  guardandoCapital: boolean;

  // AI assistant chat log
  chatLogs: ConsultaIALog[];
  aiRespuesta: string | null;
  aiCargando: boolean;
  aiContexto: string;

  // Cash flow range selection
  flujoFechaInicio: string;
  flujoFechaFin: string;
  cargandoFlujo: boolean;
  flujoVentas: Venta[];

  // Basic Setters
  setActiveTab: (activeTab: string) => void;
  setCargando: (cargando: boolean) => void;
  setSelectedCuentaCodigo: (selectedCuentaCodigo: string) => void;
  setGastoGlosa: (gastoGlosa: string) => void;
  setGastoMonto: (gastoMonto: string) => void;
  setGastoMetodo: (gastoMetodo: 'efectivo' | 'transferencia') => void;
  setTipoGastoRegistro: (tipoGastoRegistro: 'directo' | 'programado') => void;
  setProgConcepto: (progConcepto: string) => void;
  setProgMonto: (progMonto: string) => void;
  setProgFecha: (progFecha: string) => void;
  setMetaAhorroNombre: (metaAhorroNombre: string) => void;
  setMetaAhorroMonto: (metaAhorroMonto: string) => void;
  setMetaAhorroFecha: (metaAhorroFecha: string) => void;

  setDistribucionOpen: (distribucionOpen: boolean) => void;
  setDistribucionMonto: (distribucionMonto: string) => void;
  setDistribucionOrigen: (distribucionOrigen: 'caja' | 'banco') => void;
  setDistribucionDestinoTipo: (distribucionDestinoTipo: 'gasto' | 'meta_financiera') => void;
  setDistribucionDestinoId: (distribucionDestinoId: string) => void;
  setDistribucionDestinoNombre: (distribucionDestinoNombre: string) => void;

  setFacturaOpen: (facturaOpen: boolean) => void;
  setNumFactura: (numFactura: string) => void;
  setProvRut: (provRut: string) => void;
  setProvNombre: (provNombre: string) => void;
  setFacturaFecha: (facturaFecha: string) => void;
  setFacturaMetodo: (facturaMetodo: 'efectivo' | 'transferencia' | 'credito') => void;
  setTipoDocumento: (tipoDocumento: TipoDocumentoCompra) => void;
  setImagenFactura: (imagenFactura: LocalImage | null) => void;
  setFacturaProductos: (facturaProductos: RowProductoFactura[]) => void;
  setSelProdId: (selProdId: string) => void;
  setSelProdQty: (selProdQty: string) => void;
  setSelProdCost: (selProdCost: string) => void;

  setSelectedFactura: (selectedFactura: FacturaCompra | null) => void;
  setFacturaDetalleOpen: (facturaDetalleOpen: boolean) => void;
  setSubiendoImagenDetalle: (subiendoImagenDetalle: boolean) => void;

  setCapitalOpen: (capitalOpen: boolean) => void;
  setCapitalMonto: (capitalMonto: string) => void;
  setCapitalDestino: (capitalDestino: 'caja' | 'banco' | 'mixto') => void;
  setCapitalMontoCaja: (capitalMontoCaja: string) => void;
  setCapitalMontoBanco: (capitalMontoBanco: string) => void;
  setCapitalTipo: (capitalTipo: 'capital' | 'utilidades') => void;
  setCapitalGlosa: (capitalGlosa: string) => void;

  setAiContexto: (aiContexto: string) => void;
  setAiRespuesta: (aiRespuesta: string | null) => void;
  setFlujoFechaInicio: (flujoFechaInicio: string) => void;
  setFlujoFechaFin: (flujoFechaFin: string) => void;

  // Load functions
  cargarDatosContables: (toast: ToastFn) => Promise<void>;
  cargarLibroMayor: (codigo: string) => Promise<void>;
  cargarFlujoVentas: (toast: ToastFn) => Promise<void>;
  cargarHistorialIA: () => Promise<void>;

  // Submits
  handleGastoSubmit: (e: React.FormEvent, toast: ToastFn) => Promise<void>;
  handleProgramarGastoSubmit: (e: React.FormEvent, toast: ToastFn) => Promise<void>;
  handleMetaAhorroSubmit: (e: React.FormEvent, toast: ToastFn) => Promise<void>;
  handleDistribuirFondosSubmit: (e: React.FormEvent, contabilidadKPIs: ContabilidadKPIs, user: User | null, toast: ToastFn) => Promise<void>;
  handlePagarGastoProgramado: (id: string, metodo: 'efectivo' | 'transferencia', toast: ToastFn) => Promise<void>;
  handleEliminarGastoProgramado: (id: string, toast: ToastFn) => Promise<void>;
  handleEliminarMeta: (id: string, toast: ToastFn) => Promise<void>;
  handleCapitalSubmit: (e: React.FormEvent, toast: ToastFn) => Promise<void>;
  handleAddProductToFactura: (toast: ToastFn) => void;
  handleRemoveProductFromFactura: (id: string) => void;
  handleFacturaSubmit: (e: React.FormEvent, sumNeto: number, sumIva: number, sumTotal: number, toast: ToastFn) => Promise<void>;
  handleEnviarMensajeIA: (e: React.FormEvent, kpis: ContabilidadKPIs, asientos: AsientoContable[], toast: ToastFn) => Promise<void>;
  handleSubirImagenDetalle: (file: File, toast: ToastFn) => Promise<void>;
}

export const useContabilidadStore = create<ContabilidadState>((set, get) => ({
  activeTab: 'resumen',
  cargando: true,
  cuentas: [],
  asientos: [],
  facturas: [],
  productos: [],
  velocidadesVenta: {},

  selectedCuentaCodigo: '1.1.01',
  ledgerData: null,

  gastoGlosa: '',
  gastoMonto: '',
  gastoMetodo: 'efectivo',
  gastosProgramados: [],
  metasFinancieras: [],
  historialDistribucion: [],
  fondosAsignados: { caja: 0, banco: 0 },
  tipoGastoRegistro: 'directo',
  progConcepto: '',
  progMonto: '',
  progFecha: format(new Date(), 'yyyy-MM-dd'),

  metaAhorroNombre: '',
  metaAhorroMonto: '',
  metaAhorroFecha: '',

  distribucionOpen: false,
  distribucionMonto: '',
  distribucionOrigen: 'caja',
  distribucionDestinoTipo: 'gasto',
  distribucionDestinoId: '',
  distribucionDestinoNombre: '',
  ejecutandoDistribucion: false,

  facturaOpen: false,
  numFactura: '',
  provRut: '',
  provNombre: '',
  facturaFecha: format(new Date(), 'yyyy-MM-dd'),
  facturaMetodo: 'efectivo',
  tipoDocumento: 'factura',
  imagenFactura: null,
  facturaProductos: [],
  selProdId: '',
  selProdQty: '',
  selProdCost: '',
  guardandoFactura: false,

  selectedFactura: null,
  facturaDetalleOpen: false,
  subiendoImagenDetalle: false,

  capitalOpen: false,
  capitalMonto: '',
  capitalDestino: 'caja',
  capitalMontoCaja: '',
  capitalMontoBanco: '',
  capitalTipo: 'capital',
  capitalGlosa: 'Aporte de Capital Inicial',
  guardandoCapital: false,

  chatLogs: [],
  aiRespuesta: null,
  aiCargando: false,
  aiContexto: '',

  flujoFechaInicio: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  flujoFechaFin: format(new Date(), 'yyyy-MM-dd'),
  cargandoFlujo: false,
  flujoVentas: [],

  // Setters
  setActiveTab: (activeTab) => set({ activeTab }),
  setCargando: (cargando) => set({ cargando }),
  setSelectedCuentaCodigo: (selectedCuentaCodigo) => set({ selectedCuentaCodigo }),
  setGastoGlosa: (gastoGlosa) => set({ gastoGlosa }),
  setGastoMonto: (gastoMonto) => set({ gastoMonto }),
  setGastoMetodo: (gastoMetodo) => set({ gastoMetodo }),
  setTipoGastoRegistro: (tipoGastoRegistro) => set({ tipoGastoRegistro }),
  setProgConcepto: (progConcepto) => set({ progConcepto }),
  setProgMonto: (progMonto) => set({ progMonto }),
  setProgFecha: (progFecha) => set({ progFecha }),
  setMetaAhorroNombre: (metaAhorroNombre) => set({ metaAhorroNombre }),
  setMetaAhorroMonto: (metaAhorroMonto) => set({ metaAhorroMonto }),
  setMetaAhorroFecha: (metaAhorroFecha) => set({ metaAhorroFecha }),

  setDistribucionOpen: (distribucionOpen) => set({ distribucionOpen }),
  setDistribucionMonto: (distribucionMonto) => set({ distribucionMonto }),
  setDistribucionOrigen: (distribucionOrigen) => set({ distribucionOrigen }),
  setDistribucionDestinoTipo: (distribucionDestinoTipo) => set({ distribucionDestinoTipo }),
  setDistribucionDestinoId: (distribucionDestinoId) => set({ distribucionDestinoId }),
  setDistribucionDestinoNombre: (distribucionDestinoNombre) => set({ distribucionDestinoNombre }),

  setFacturaOpen: (facturaOpen) => set({ facturaOpen }),
  setNumFactura: (numFactura) => set({ numFactura }),
  setProvRut: (provRut) => set({ provRut }),
  setProvNombre: (provNombre) => set({ provNombre }),
  setFacturaFecha: (facturaFecha) => set({ facturaFecha }),
  setFacturaMetodo: (facturaMetodo) => set({ facturaMetodo }),
  setTipoDocumento: (tipoDocumento) => set({ tipoDocumento }),
  setImagenFactura: (imagenFactura) => set({ imagenFactura }),
  setFacturaProductos: (facturaProductos) => set({ facturaProductos }),
  setSelProdId: (selProdId) => set({ selProdId }),
  setSelProdQty: (selProdQty) => set({ selProdQty }),
  setSelProdCost: (selProdCost) => set({ selProdCost }),

  setSelectedFactura: (selectedFactura) => set({ selectedFactura }),
  setFacturaDetalleOpen: (facturaDetalleOpen) => set({ facturaDetalleOpen }),
  setSubiendoImagenDetalle: (subiendoImagenDetalle) => set({ subiendoImagenDetalle }),

  setCapitalOpen: (capitalOpen) => set({ capitalOpen }),
  setCapitalMonto: (capitalMonto) => set({ capitalMonto }),
  setCapitalDestino: (capitalDestino) => set({ capitalDestino }),
  setCapitalMontoCaja: (capitalMontoCaja) => set({ capitalMontoCaja }),
  setCapitalMontoBanco: (capitalMontoBanco) => set({ capitalMontoBanco }),
  setCapitalTipo: (capitalTipo) => set({ capitalTipo }),
  setCapitalGlosa: (capitalGlosa) => set({ capitalGlosa }),

  setAiContexto: (aiContexto) => set({ aiContexto }),
  setAiRespuesta: (aiRespuesta) => set({ aiRespuesta }),
  setFlujoFechaInicio: (flujoFechaInicio) => set({ flujoFechaInicio }),
  setFlujoFechaFin: (flujoFechaFin) => set({ flujoFechaFin }),

  // Load functions
  cargarDatosContables: async (toast) => {
    try {
      set({ cargando: true });

      const cuentasData = await ContabilidadService.obtenerCuentas();
      const asientosData = await ContabilidadService.obtenerLibroDiario();
      const facturasData = await ContabilidadService.obtenerFacturasCompra();

      const prodSnap = await getDocs(collection(db, 'productos'));
      const prodData = prodSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Producto))
        .filter((p) => p.activo !== false && p.es_interes !== true);

      const velocities = await ContabilidadService.obtenerVelocidadDeVentas(30);
      const gp = await GastosProgramadosService.obtenerGastosProgramados();
      const mf = await MetasService.obtenerMetasFinancieras();
      const fa = await DistribucionService.obtenerFondosAsignadosTotales();
      const hd = await DistribucionService.obtenerHistorial();

      const { selectedCuentaCodigo } = get();
      let mayor = null;
      if (selectedCuentaCodigo) {
        mayor = await ContabilidadService.obtenerLibroMayor(selectedCuentaCodigo);
      }

      set({
        cuentas: cuentasData,
        asientos: asientosData,
        facturas: facturasData,
        productos: prodData,
        velocidadesVenta: velocities,
        gastosProgramados: gp,
        metasFinancieras: mf,
        fondosAsignados: fa,
        historialDistribucion: hd,
        ledgerData: mayor,
        cargando: false
      });
    } catch (err) {
      console.error('Error al cargar datos contables:', err);
      toast({
        title: 'Error de base de datos',
        description: 'No se pudieron cargar los registros contables.',
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  cargarLibroMayor: async (codigo) => {
    try {
      const mayor = await ContabilidadService.obtenerLibroMayor(codigo);
      set({ ledgerData: mayor });
    } catch (err) {
      console.error('Error al cargar libro mayor:', err);
    }
  },

  cargarFlujoVentas: async (toast) => {
    const { flujoFechaInicio, flujoFechaFin } = get();
    try {
      set({ cargandoFlujo: true });
      const inicio = new Date(flujoFechaInicio + 'T00:00:00');
      const fin = new Date(flujoFechaFin + 'T23:59:59');
      const ventasQuery = query(
        collection(db, 'ventas'),
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      );
      const ventasSnapshot = await getDocs(ventasQuery);
      const ventas = ventasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venta[];
      set({ flujoVentas: ventas });
    } catch (err) {
      console.error('Error al cargar ventas para flujo:', err);
    } finally {
      set({ cargandoFlujo: false });
    }
  },

  cargarHistorialIA: async () => {
    try {
      const history = await AIService.obtenerHistorial('contabilidad', undefined, 15);
      set({ chatLogs: history });
    } catch (err) {
      console.error('Error al cargar historial contable IA:', err);
    }
  },

  handleGastoSubmit: async (e, toast) => {
    e.preventDefault();
    const { gastoGlosa, gastoMonto, gastoMetodo } = get();
    if (!gastoGlosa.trim() || !gastoMonto) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor rellena la glosa y el monto del gasto.',
        variant: 'destructive'
      });
      return;
    }

    const monto = Math.round(parseChileanMoneyInput(gastoMonto));
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto ingresado debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    try {
      set({ cargando: true });
      await ContabilidadService.registrarGastoDirecto({
        glosa: gastoGlosa.trim(),
        monto,
        metodoPago: gastoMetodo
      });

      toast({
        title: 'Gasto registrado',
        description: `Se registró "${gastoGlosa}" por $${monto.toLocaleString('es-CL')} con éxito.`,
        variant: 'success'
      });

      set({ gastoGlosa: '', gastoMonto: '' });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el gasto contable.';
      toast({
        title: 'Error de registro',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleProgramarGastoSubmit: async (e, toast) => {
    e.preventDefault();
    const { progConcepto, progMonto, progFecha } = get();
    if (!progConcepto.trim() || !progMonto || !progFecha) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor rellena todos los campos.',
        variant: 'destructive'
      });
      return;
    }

    const monto = Math.round(parseChileanMoneyInput(progMonto));
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    try {
      set({ cargando: true });
      await GastosProgramadosService.crearGastoProgramado(
        progConcepto.trim(),
        monto,
        new Date(progFecha + 'T12:00:00')
      );

      toast({
        title: 'Gasto programado',
        description: `Se programó "${progConcepto}" por $${monto.toLocaleString('es-CL')}.`
      });

      set({ progConcepto: '', progMonto: '' });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo programar el gasto.';
      toast({
        title: 'Error de registro',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleMetaAhorroSubmit: async (e, toast) => {
    e.preventDefault();
    const { metaAhorroNombre, metaAhorroMonto, metaAhorroFecha } = get();
    if (!metaAhorroNombre.trim() || !metaAhorroMonto) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor rellena el nombre y el monto objetivo.',
        variant: 'destructive'
      });
      return;
    }

    const monto = Math.round(parseChileanMoneyInput(metaAhorroMonto));
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    try {
      set({ cargando: true });
      const limite = metaAhorroFecha ? new Date(metaAhorroFecha + 'T12:00:00') : null;
      await MetasService.crearMetaFinanciera(metaAhorroNombre.trim(), monto, limite);

      toast({
        title: 'Meta de Ahorro creada',
        description: `Se creó la meta "${metaAhorroNombre}" con objetivo de $${monto.toLocaleString('es-CL')}.`
      });

      set({ metaAhorroNombre: '', metaAhorroMonto: '', metaAhorroFecha: '' });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo registrar la meta.';
      toast({
        title: 'Error al crear meta',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleDistribuirFondosSubmit: async (e, contabilidadKPIs, user, toast) => {
    e.preventDefault();
    const {
      distribucionMonto,
      distribucionOrigen,
      distribucionDestinoTipo,
      distribucionDestinoId,
      distribucionDestinoNombre,
      fondosAsignados
    } = get();

    if (!distribucionMonto || !distribucionDestinoId) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor ingresa un monto y selecciona un destino.',
        variant: 'destructive'
      });
      return;
    }

    const monto = Math.round(parseChileanMoneyInput(distribucionMonto));
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    const saldoOrigenReal = distribucionOrigen === 'caja' ? contabilidadKPIs.caja : contabilidadKPIs.banco;
    const asignadoOrigen = distribucionOrigen === 'caja' ? fondosAsignados.caja : fondosAsignados.banco;
    const disponibleReal = saldoOrigenReal - asignadoOrigen;

    if (monto > disponibleReal) {
      toast({
        title: 'Fondos insuficientes',
        description: `El saldo disponible sin asignar en ${distribucionOrigen === 'caja' ? 'Caja' : 'Banco'} es $${disponibleReal.toLocaleString('es-CL')}.`,
        variant: 'destructive'
      });
      return;
    }

    set({ ejecutandoDistribucion: true });
    try {
      await DistribucionService.distribuirFondos({
        monto,
        origen: distribucionOrigen,
        destinoTipo: distribucionDestinoTipo,
        destinoId: distribucionDestinoId,
        destinoNombre: distribucionDestinoNombre,
        descripcion: `Asignación virtual de $${monto.toLocaleString('es-CL')} desde ${distribucionOrigen === 'caja' ? 'Caja' : 'Banco'} a "${distribucionDestinoNombre}"`,
        usuarioUid: user?.id || 'admin'
      });

      toast({
        title: 'Fondos distribuidos',
        description: `Se asignaron $${monto.toLocaleString('es-CL')} a "${distribucionDestinoNombre}" con éxito.`
      });

      set({ distribucionOpen: false, distribucionMonto: '', ejecutandoDistribucion: false });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo realizar la distribución virtual.';
      toast({
        title: 'Error de distribución',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ ejecutandoDistribucion: false });
    }
  },

  handlePagarGastoProgramado: async (id, metodo, toast) => {
    try {
      set({ cargando: true });
      await GastosProgramadosService.pagarGastoProgramado(id, metodo);
      toast({
        title: 'Gasto pagado',
        description: 'Se registró el pago en la contabilidad y se cerró la deuda programada.',
        variant: 'success'
      });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo procesar el pago del gasto.';
      toast({
        title: 'Error al pagar',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleEliminarGastoProgramado: async (id, toast) => {
    try {
      set({ cargando: true });
      await GastosProgramadosService.eliminarGastoProgramado(id);
      toast({
        title: 'Gasto eliminado',
        description: 'Se eliminó el gasto programado.'
      });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo eliminar el registro.';
      toast({
        title: 'Error al eliminar',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleEliminarMeta: async (id, toast) => {
    try {
      set({ cargando: true });
      await MetasService.eliminarMetaFinanciera(id);
      toast({
        title: 'Meta eliminada',
        description: 'Se eliminó la meta de ahorro.'
      });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo eliminar la meta.';
      toast({
        title: 'Error al eliminar',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ cargando: false });
    }
  },

  handleCapitalSubmit: async (e, toast) => {
    e.preventDefault();
    const {
      capitalDestino,
      capitalMonto,
      capitalMontoCaja,
      capitalMontoBanco,
      capitalTipo,
      capitalGlosa
    } = get();

    let totalMonto = 0;
    let montoCaja = 0;
    let montoBanco = 0;

    if (capitalDestino !== 'mixto') {
      totalMonto = Math.round(parseChileanMoneyInput(capitalMonto));
      if (capitalDestino === 'caja') {
        montoCaja = totalMonto;
      } else {
        montoBanco = totalMonto;
      }
    } else {
      montoCaja = Math.round(parseChileanMoneyInput(capitalMontoCaja));
      montoBanco = Math.round(parseChileanMoneyInput(capitalMontoBanco));
      totalMonto = montoCaja + montoBanco;
    }

    if (isNaN(totalMonto) || totalMonto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto aportado debe ser mayor a 0.',
        variant: 'destructive'
      });
      return;
    }

    try {
      set({ guardandoCapital: true });

      const movimientos: MovimientoContable[] = [];

      if (montoCaja > 0) {
        movimientos.push({
          cuenta_codigo: '1.1.01',
          cuenta_nombre: 'Caja',
          debe: montoCaja,
          haber: 0
        });
      }
      if (montoBanco > 0) {
        movimientos.push({
          cuenta_codigo: '1.1.02',
          cuenta_nombre: 'Banco',
          debe: montoBanco,
          haber: 0
        });
      }

      const creditCuentaCodigo = capitalTipo === 'capital' ? '3.1.01' : '3.1.02';
      const creditCuentaNombre = capitalTipo === 'capital' ? 'Capital Inicial' : 'Utilidades Acumuladas';

      movimientos.push({
        cuenta_codigo: creditCuentaCodigo,
        cuenta_nombre: creditCuentaNombre,
        debe: 0,
        haber: totalMonto
      });

      await ContabilidadService.registrarAsientoManual(
        capitalGlosa.trim(),
        'manual',
        movimientos
      );

      toast({
        title: capitalTipo === 'capital' ? 'Capital registrado' : 'Utilidades registradas',
        description: `Se registró el aporte por $${totalMonto.toLocaleString('es-CL')} con éxito.`,
        variant: 'success'
      });

      set({
        capitalMonto: '',
        capitalMontoCaja: '',
        capitalMontoBanco: '',
        capitalTipo: 'capital',
        capitalGlosa: 'Aporte de Capital Inicial',
        capitalOpen: false,
        guardandoCapital: false
      });
      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el aporte.';
      toast({
        title: 'Error al registrar',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ guardandoCapital: false });
    }
  },

  handleAddProductToFactura: (toast) => {
    const { selProdId, selProdQty, selProdCost, productos, facturaProductos } = get();
    if (!selProdId || !selProdQty || !selProdCost) {
      toast({
        title: 'Producto incompleto',
        description: 'Ingresa el producto, la cantidad y su costo unitario.',
        variant: 'default'
      });
      return;
    }

    const product = productos.find((p) => p.id === selProdId);
    if (!product) return;

    const qty = Number(selProdQty);
    const cost = Math.round(Number(selProdCost));

    if (qty <= 0 || cost <= 0) {
      toast({
        title: 'Valores erróneos',
        description: 'Cantidad y costo deben ser mayores a 0.',
        variant: 'default'
      });
      return;
    }

    const exists = facturaProductos.find((p) => p.producto_id === selProdId);
    if (exists) {
      toast({
        title: 'Producto repetido',
        description: 'Ya agregaste este producto. Elimínalo primero de la lista para corregir.',
        variant: 'default'
      });
      return;
    }

    const newItem: RowProductoFactura = {
      producto_id: selProdId,
      nombre: product.nombre,
      cantidad: qty,
      costo_unitario: cost,
      cantidad_por_caja: product.cantidad_por_caja || undefined
    };

    set({
      facturaProductos: [...facturaProductos, newItem],
      selProdId: '',
      selProdQty: '',
      selProdCost: ''
    });
  },

  handleRemoveProductFromFactura: (id) => {
    set((state) => ({
      facturaProductos: state.facturaProductos.filter((p) => p.producto_id !== id)
    }));
  },

  handleFacturaSubmit: async (e, sumNeto, sumIva, sumTotal, toast) => {
    e.preventDefault();
    const {
      numFactura,
      provRut,
      provNombre,
      facturaFecha,
      facturaMetodo,
      tipoDocumento,
      facturaProductos,
      imagenFactura
    } = get();

    if (!numFactura.trim() || !provRut.trim() || !provNombre.trim()) {
      toast({
        title: 'Faltan datos del proveedor',
        description: 'Ingresa RUT, Nombre del proveedor and N° de Documento.',
        variant: 'destructive'
      });
      return;
    }

    if (facturaProductos.length === 0) {
      toast({
        title: 'Sin productos',
        description: 'Debes añadir al menos un producto al documento.',
        variant: 'destructive'
      });
      return;
    }

    try {
      set({ guardandoFactura: true, cargando: true });

      let finalInvoiceUrl = '';
      if (imagenFactura && imagenFactura.file) {
        const storagePath = `facturas/compra_${Date.now()}.jpg`;
        finalInvoiceUrl = await uploadImage(storagePath, imagenFactura.file);
      }

      await ContabilidadService.registrarFacturaCompra({
        tipoDocumento,
        numeroDocumento: numFactura.trim(),
        numeroFactura: numFactura.trim(),
        proveedorRut: provRut.trim(),
        proveedorNombre: provNombre.trim(),
        fecha: new Date(facturaFecha + 'T12:00:00'),
        neto: sumNeto,
        iva: sumIva,
        total: sumTotal,
        metodoPago: facturaMetodo,
        productos: facturaProductos,
        imagenFacturaUrl: finalInvoiceUrl || undefined
      });

      toast({
        title: 'Documento registrado con éxito',
        description: `Se cargó el comprobante N° ${numFactura} y se actualizó el stock e inventario contable.`,
        variant: 'success'
      });

      set({
        numFactura: '',
        provRut: '',
        provNombre: '',
        facturaFecha: format(new Date(), 'yyyy-MM-dd'),
        facturaProductos: [],
        tipoDocumento: 'factura',
        imagenFactura: null,
        facturaOpen: false,
        guardandoFactura: false
      });

      await get().cargarDatosContables(toast);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo guardar la factura de compra.';
      toast({
        title: 'Error de transacción',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ guardandoFactura: false, cargando: false });
    }
  },

  handleEnviarMensajeIA: async (e, kpis, asientos, toast) => {
    e.preventDefault();
    const { aiContexto, chatLogs } = get();
    const inputMsg = aiContexto.trim();
    if (!inputMsg) return;

    set({ aiCargando: true, aiRespuesta: null });

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/contabilidad', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          kpis,
          asientos,
          pregunta: inputMsg,
          historial: chatLogs.map((log) => ({ pregunta: log.pregunta, respuesta: log.respuesta }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con el asistente de IA.');

      set({ aiRespuesta: data.diagnostico });

      await AIService.registrarConsulta({
        tipo_asistente: 'contabilidad',
        pregunta: inputMsg,
        respuesta: data.diagnostico,
        productos_vinculados: []
      });

      set({ aiContexto: '' });
      await get().cargarHistorialIA();

      toast({
        title: 'Análisis contable listo',
        description: 'Gemini ha procesado tu consulta financiera.'
      });
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo obtener la respuesta del asistente.';
      toast({
        title: 'Error de IA',
        description: errorMessage,
        variant: 'destructive'
      });
      set({ aiCargando: false });
    }
  },

  handleSubirImagenDetalle: async (file, toast) => {
    const { selectedFactura } = get();
    if (!selectedFactura) return;

    try {
      set({ subiendoImagenDetalle: true });
      const storagePath = `facturas/compra_${selectedFactura.id}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadImage(storagePath, file);

      // Update in Firestore
      const docRef = doc(db, 'compras', selectedFactura.id);
      await updateDoc(docRef, { imagen_factura_url: uploadedUrl });

      set((state) => {
        const updatedFacturas = state.facturas.map((f) => {
          if (f.id === selectedFactura.id) {
            return { ...f, imagen_factura_url: uploadedUrl };
          }
          return f;
        });
        const updatedSelected = state.selectedFactura
          ? { ...state.selectedFactura, imagen_factura_url: uploadedUrl }
          : null;

        return {
          facturas: updatedFacturas,
          selectedFactura: updatedSelected,
          subiendoImagenDetalle: false
        };
      });

      toast({
        title: 'Imagen guardada',
        description: 'El comprobante ha sido adjuntado con éxito.',
        variant: 'default'
      });
    } catch (err) {
      console.error('Error al subir imagen de comprobante:', err);
      toast({
        title: 'Error de carga',
        description: 'No se pudo subir la imagen del comprobante.',
        variant: 'destructive'
      });
      set({ subiendoImagenDetalle: false });
    }
  }
}));

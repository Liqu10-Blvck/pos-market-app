'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppNav } from '@/components/layout/app-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCLPCurrency, compressImage, parseChileanMoneyInput } from '@/lib/utils';
import { 
  BookOpen, Calendar, DollarSign, PlusCircle, ArrowUpRight, ArrowDownRight, 
  Percent, FileText, Landmark, RefreshCw, ShoppingCart, User, Tag, 
  Trash2, Plus, AlertCircle, FileSpreadsheet, Sparkles, Loader2,
  Activity, TrendingDown, Target, Eye, Camera, ArrowDown, Info, Send,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { ContabilidadService } from '@/lib/services/contabilidad.service';
import { GastosProgramadosService } from '@/lib/services/gastos-programados.service';
import { MetasService } from '@/lib/services/metas.service';
import { DistribucionService } from '@/lib/services/distribucion.service';
import { CuentaContable, AsientoContable, FacturaCompra, TipoDocumentoCompra, MovimientoContable } from '@/lib/types/contabilidad';
import { Producto, ConsultaIALog } from '@/lib/types/pos';
import { AIService } from '@/lib/services/ai.service';
import { uploadImage } from '@/lib/firebase/storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

interface RowProductoFactura {
  producto_id: string;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
  cantidad_por_caja?: number;
}

const calcPct = (actual: number, objetivo: number) => {
  if (!objetivo) return 0;
  return Math.min(100, Math.round((actual / objetivo) * 100));
};



function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [cargando, setCargando] = useState(true);
  const { toast } = useToast();

  // Accounting Data States
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Selected Ledger State
  const [selectedCuentaCodigo, setSelectedCuentaCodigo] = useState<string>('1.1.01'); // Caja default
  const [ledgerData, setLedgerData] = useState<{
    cuenta: CuentaContable;
    movimientos: any[];
    saldoFinal: number;
  } | null>(null);

  // Manual Expense State
  const [gastoGlosa, setGastoGlosa] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoMetodo, setGastoMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');

  // Gastos Programados, Metas y Distribucion
  const { user } = useAuth();
  const [gastosProgramados, setGastosProgramados] = useState<any[]>([]);
  const [metasFinancieras, setMetasFinancieras] = useState<any[]>([]);
  const [historialDistribucion, setHistorialDistribucion] = useState<any[]>([]);
  const [fondosAsignados, setFondosAsignados] = useState({ caja: 0, banco: 0 });
  const [tipoGastoRegistro, setTipoGastoRegistro] = useState<'directo' | 'programado'>('directo');

  // Program Expense Form
  const [progConcepto, setProgConcepto] = useState('');
  const [progMonto, setProgMonto] = useState('');
  const [progFecha, setProgFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Savings Goal Form
  const [metaAhorroNombre, setMetaAhorroNombre] = useState('');
  const [metaAhorroMonto, setMetaAhorroMonto] = useState('');
  const [metaAhorroFecha, setMetaAhorroFecha] = useState('');

  // Distribution Modal State
  const [distribucionOpen, setDistribucionOpen] = useState(false);
  const [distribucionMonto, setDistribucionMonto] = useState('');
  const [distribucionOrigen, setDistribucionOrigen] = useState<'caja' | 'banco'>('caja');
  const [distribucionDestinoTipo, setDistribucionDestinoTipo] = useState<'gasto' | 'meta_financiera'>('gasto');
  const [distribucionDestinoId, setDistribucionDestinoId] = useState('');
  const [distribucionDestinoNombre, setDistribucionDestinoNombre] = useState('');
  const [ejecutandoDistribucion, setEjecutandoDistribucion] = useState(false);

  // Purchase Invoice Dialog State
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [numFactura, setNumFactura] = useState('');
  const [provRut, setProvRut] = useState('');
  const [provNombre, setProvNombre] = useState('');
  const [facturaFecha, setFacturaFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [facturaMetodo, setFacturaMetodo] = useState<'efectivo' | 'transferencia' | 'credito'>('efectivo');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCompra>('factura');
  
  // LocalImage state for invoice uploader
  interface LocalImage {
    file: File | null;
    url: string;
  }
  const [imagenFactura, setImagenFactura] = useState<LocalImage | null>(null);
  const fileInputFacturaRef = useRef<HTMLInputElement>(null);

  const handleTriggerFacturaCamera = () => {
    fileInputFacturaRef.current?.click();
  };

  const handleFileFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawUrl = reader.result as string;
      try {
        const compressedUrl = await compressImage(rawUrl, 1024, 0.75);
        setImagenFactura({ file, url: compressedUrl });
      } catch (err) {
        console.warn('Error al comprimir imagen de factura:', err);
        setImagenFactura({ file, url: rawUrl });
      }
    };
    reader.readAsDataURL(file);

    if (fileInputFacturaRef.current) {
      fileInputFacturaRef.current.value = '';
    }
  };

  const handleRemoveFacturaImage = () => {
    setImagenFactura(null);
  };
  
  // Capital / Initial Money State
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [capitalMonto, setCapitalMonto] = useState('');
  const [capitalDestino, setCapitalDestino] = useState<'caja' | 'banco' | 'mixto'>('caja');
  const [capitalMontoCaja, setCapitalMontoCaja] = useState('');
  const [capitalMontoBanco, setCapitalMontoBanco] = useState('');
  const [capitalTipo, setCapitalTipo] = useState<'capital' | 'utilidades'>('capital');
  const [capitalGlosa, setCapitalGlosa] = useState('Aporte de Capital Inicial');
  const [guardandoCapital, setGuardandoCapital] = useState(false);
  
  // Invoice items state
  const [facturaProductos, setFacturaProductos] = useState<RowProductoFactura[]>([]);
  const [selProdId, setSelProdId] = useState('');
  const [selProdQty, setSelProdQty] = useState('');
  const [selProdCost, setSelProdCost] = useState('');

  // Expandable journal rows state
  const [expandedAsientoId, setExpandedAsientoId] = useState<string | null>(null);

  // Chat/AI states
  const [chatLogs, setChatLogs] = useState<ConsultaIALog[]>([]);
  const [velocidadesVenta, setVelocidadesVenta] = useState<{ [productoId: string]: number }>({});
  const [selectedFactura, setSelectedFactura] = useState<FacturaCompra | null>(null);
  const [facturaDetalleOpen, setFacturaDetalleOpen] = useState(false);

  // Grouped purchases states & memo
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const facturasAgrupadasPorDia = useMemo(() => {
    const grupos: { [key: string]: { fechaKey: string; fechaDisplay: Date; facturas: FacturaCompra[]; total: number } } = {};
    
    facturas.forEach(f => {
      const dateObj = f.fecha.toDate();
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!grupos[key]) {
        grupos[key] = {
          fechaKey: key,
          fechaDisplay: dateObj,
          facturas: [],
          total: 0
        };
      }
      grupos[key].facturas.push(f);
      grupos[key].total += f.total;
    });

    // Sort days descending
    return Object.values(grupos).sort((a, b) => b.fechaDisplay.getTime() - a.fechaDisplay.getTime());
  }, [facturas]);

  // Subir imagen desde el modal de detalle
  const [subiendoImagenDetalle, setSubiendoImagenDetalle] = useState(false);
  const fileInputDetalleRef = useRef<HTMLInputElement>(null);

  const handleAgregarImagenDetalle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedFactura) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      setSubiendoImagenDetalle(true);
      const storagePath = `facturas/compra_${selectedFactura.id}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadImage(storagePath, file);

      // Update in Firestore
      const docRef = doc(db, 'compras', selectedFactura.id);
      await updateDoc(docRef, { imagen_factura_url: uploadedUrl });

      // Update locally in selectedFactura state
      setSelectedFactura(prev => {
        if (!prev) return null;
        return {
          ...prev,
          imagen_factura_url: uploadedUrl
        };
      });

      // Update in facturas list state
      setFacturas(prev => prev.map(f => {
        if (f.id === selectedFactura.id) {
          return { ...f, imagen_factura_url: uploadedUrl };
        }
        return f;
      }));

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
    } finally {
      setSubiendoImagenDetalle(false);
    }
  };

  // Product flow date range states
  const [flujoFechaInicio, setFlujoFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [flujoFechaFin, setFlujoFechaFin] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [flujoVentas, setFlujoVentas] = useState<any[]>([]);
  const [cargandoFlujo, setCargandoFlujo] = useState(false);

  // AI financial assistant states
  const [aiPregunta, setAiPregunta] = useState('');
  const [aiRespuesta, setAiRespuesta] = useState<string | null>(null);
  const [aiCargando, setAiCargando] = useState(false);

  const cargarHistorialIA = async () => {
    try {
      const history = await AIService.obtenerHistorial('contabilidad', undefined, 10);
      setChatLogs(history);
    } catch (err) {
      console.error('Error al cargar historial contable IA:', err);
    }
  };

  const handleGenerarInformeFinanciero = async () => {
    if (!aiPregunta.trim()) return;
    setAiCargando(true);
    try {
      const res = await fetch('/api/contabilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: contabilidadKPIs,
          asientos: asientos,
          pregunta: aiPregunta,
          historial: chatLogs.map(log => ({ pregunta: log.pregunta, respuesta: log.respuesta }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con el asistente financiero.');

      setAiRespuesta(data.diagnostico);

      // Persist the query in Firestore
      await AIService.registrarConsulta({
        tipo_asistente: 'contabilidad',
        pregunta: aiPregunta,
        respuesta: data.diagnostico,
        productos_vinculados: []
      });

      // Reload chat logs
      await cargarHistorialIA();
      setAiPregunta('');

      toast({
        title: 'Informe contable generado',
        description: 'El diagnóstico financiero con IA está listo.'
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de Asistente IA',
        description: error.message || 'No se pudo obtener el informe contable.',
        variant: 'destructive'
      });
    } finally {
      setAiCargando(false);
    }
  };

  // Basic markdown client-side renderer for AI reports
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const blocks = text.split('\n');
    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-base font-black mt-5 mb-2 text-indigo-600 dark:text-indigo-400 tracking-tight">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-lg font-black mt-6 mb-3 text-foreground border-b border-border/60 pb-1.5 tracking-tight">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-xl font-black mt-8 mb-4 text-foreground tracking-tight">
            {trimmed.replace('# ', '')}
          </h2>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        const parts = content.split('**');
        return (
          <li key={idx} className="ml-5 list-disc text-sm my-1 text-muted-foreground leading-relaxed">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-semibold text-foreground">{part}</strong> : part)}
          </li>
        );
      }

      const parts = trimmed.split('**');
      return (
        <p key={idx} className="text-sm my-2 text-muted-foreground leading-relaxed">
          {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-foreground">{part}</strong> : part)}
        </p>
      );
    });
  };

  const cargarFlujoVentas = async () => {
    try {
      setCargandoFlujo(true);
      const start = new Date(flujoFechaInicio + 'T00:00:00');
      const end = new Date(flujoFechaFin + 'T23:59:59');
      const q = query(
        collection(db, 'ventas'),
        where('fecha', '>=', Timestamp.fromDate(start)),
        where('fecha', '<=', Timestamp.fromDate(end))
      );
      const snap = await getDocs(q);
      const ventasData = snap.docs.map(doc => doc.data());
      setFlujoVentas(ventasData);
    } catch (err) {
      console.error('Error al cargar ventas para flujo:', err);
    } finally {
      setCargandoFlujo(false);
    }
  };

  useEffect(() => {
    cargarDatosContables();
  }, []);

  useEffect(() => {
    if (selectedCuentaCodigo) {
      cargarLibroMayor(selectedCuentaCodigo);
    }
  }, [selectedCuentaCodigo, asientos]);

  useEffect(() => {
    if (activeTab === 'flujo') {
      cargarFlujoVentas();
    }
  }, [activeTab, flujoFechaInicio, flujoFechaFin]);

  useEffect(() => {
    if (activeTab === 'ai-assistant') {
      cargarHistorialIA();
    }
  }, [activeTab]);

  const cargarDatosContables = async () => {
    try {
      setCargando(true);

      // Load Chart of Accounts
      const cuentasData = await ContabilidadService.obtenerCuentas();
      setCuentas(cuentasData);

      // Load Journal entries
      const asientosData = await ContabilidadService.obtenerLibroDiario();
      setAsientos(asientosData);

      // Load Purchase Invoices
      const facturasData = await ContabilidadService.obtenerFacturasCompra();
      setFacturas(facturasData);

      // Load catalog products
      const prodSnap = await getDocs(collection(db, 'productos'));
      const prodData = prodSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Producto))
        .filter(p => p.activo !== false && p.es_interes !== true);
      setProductos(prodData);

      // Load sales velocities
      const velocities = await ContabilidadService.obtenerVelocidadDeVentas(30);
      setVelocidadesVenta(velocities);

      // Load AI history
      await cargarHistorialIA();

      // Load Scheduled Expenses
      const gp = await GastosProgramadosService.obtenerGastosProgramados();
      setGastosProgramados(gp);

      // Load Financial Goals
      const mf = await MetasService.obtenerMetasFinancieras();
      setMetasFinancieras(mf);

      // Load Assigned Funds
      const fa = await DistribucionService.obtenerFondosAsignadosTotales();
      setFondosAsignados(fa);

      // Load Distribution History
      const hd = await DistribucionService.obtenerHistorial();
      setHistorialDistribucion(hd);

    } catch (err) {
      console.error('Error al cargar datos contables:', err);
      toast({
        title: 'Error de base de datos',
        description: 'No se pudieron cargar los registros contables.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarLibroMayor = async (codigo: string) => {
    try {
      const mayor = await ContabilidadService.obtenerLibroMayor(codigo);
      setLedgerData(mayor);
    } catch (err) {
      console.error('Error al cargar libro mayor:', err);
    }
  };

  // Product flow calculation
  const productFlowData = useMemo(() => {
    const start = new Date(flujoFechaInicio + 'T00:00:00').getTime();
    const end = new Date(flujoFechaFin + 'T23:59:59').getTime();
    
    const flow: { [productoId: string]: { entradas: number; salidas: number } } = {};
    
    // Seed
    productos.forEach(p => {
      flow[p.id] = { entradas: 0, salidas: 0 };
    });

    // Accumulate purchases
    facturas.forEach(f => {
      const time = f.fecha.toDate().getTime();
      if (time >= start && time <= end && f.productos) {
        f.productos.forEach(p => {
          if (flow[p.producto_id]) {
            flow[p.producto_id].entradas += p.cantidad;
          }
        });
      }
    });

    // Accumulate sales
    flujoVentas.forEach(v => {
      if (v.items && Array.isArray(v.items)) {
        v.items.forEach((item: any) => {
          const pid = item.producto_id;
          if (flow[pid]) {
            const qty = item.cantidad || item.neto || 0;
            const mult = item.es_caja && item.cantidad_por_caja ? item.cantidad_por_caja : 1;
            flow[pid].salidas += qty * mult;
          }
        });
      }
    });

    return flow;
  }, [productos, facturas, flujoVentas, flujoFechaInicio, flujoFechaFin]);

  // Profit and Loss calculations
  const contabilidadKPIs = useMemo(() => {
    // Compile account balances
    const balances: { [codigo: string]: number } = {};
    
    // Seed initial balances to 0
    ContabilidadService.PLAN_CUENTAS.forEach(c => {
      balances[c.codigo] = 0;
    });

    asientos.forEach(asiento => {
      asiento.movimientos.forEach(mov => {
        const codigo = mov.cuenta_codigo;
        const cuenta = ContabilidadService.PLAN_CUENTAS.find(c => c.codigo === codigo);
        if (!cuenta) return;

        if (cuenta.tipo === 'activo' || cuenta.tipo === 'egreso') {
          balances[codigo] = (balances[codigo] || 0) + mov.debe - mov.haber;
        } else {
          balances[codigo] = (balances[codigo] || 0) - mov.debe + mov.haber;
        }
      });
    });

    const caja = balances['1.1.01'] || 0;
    const banco = balances['1.1.02'] || 0;
    const mercaderias = balances['1.1.03'] || 0;
    const clientes = balances['1.1.04'] || 0;
    const ivaCredito = balances['1.1.05'] || 0;

    const ivaDebito = balances['2.1.01'] || 0;
    const proveedores = balances['2.1.02'] || 0;
    const capitalInicial = balances['3.1.01'] || 0;
    const utilidadesAcumuladas = balances['3.1.02'] || 0;

    const ventas = balances['4.1.01'] || 0;
    const costoVentas = balances['5.1.01'] || 0;
    const gastosGenerales = balances['5.1.02'] || 0;

    const activosTotales = caja + banco + mercaderias + clientes + ivaCredito;
    const pasivosTotales = ivaDebito + proveedores;

    const utilidadBruta = ventas - costoVentas;
    const utilidadNeta = utilidadBruta - gastosGenerales;

    // IVA analysis
    const ivaNeto = ivaDebito - ivaCredito;

    return {
      caja,
      banco,
      mercaderias,
      clientes,
      ivaCredito,
      ivaDebito,
      proveedores,
      capitalInicial,
      utilidadesAcumuladas,
      ventas,
      costoVentas,
      gastosGenerales,
      activosTotales,
      pasivosTotales,
      utilidadBruta,
      utilidadNeta,
      ivaNeto
    };
  }, [asientos]);

  // Handle manual expense submit
  const handleGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setCargando(true);
      await ContabilidadService.registrarGastoDirecto({
        glosa: gastoGlosa.trim(),
        monto,
        metodoPago: gastoMetodo
      });

      toast({
        title: 'Gasto registrado',
        description: `Se registró "${gastoGlosa}" por ${formatCLPCurrency(monto)} con éxito.`,
        variant: 'success'
      });

      setGastoGlosa('');
      setGastoMonto('');
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de registro',
        description: err.message || 'No se pudo guardar el gasto contable.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  // Handle Programmed Expense Submit
  const handleProgramarGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setCargando(true);
      await GastosProgramadosService.crearGastoProgramado(
        progConcepto.trim(),
        monto,
        new Date(progFecha + 'T12:00:00')
      );

      toast({
        title: 'Gasto programado',
        description: `Se programó "${progConcepto}" por ${formatCLPCurrency(monto)}.`
      });

      setProgConcepto('');
      setProgMonto('');
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de registro',
        description: err.message || 'No se pudo programar el gasto.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  // Handle Savings Goal Submit
  const handleMetaAhorroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setCargando(true);
      const limite = metaAhorroFecha ? new Date(metaAhorroFecha + 'T12:00:00') : null;
      await MetasService.crearMetaFinanciera(metaAhorroNombre.trim(), monto, limite);

      toast({
        title: 'Meta de Ahorro creada',
        description: `Se creó la meta "${metaAhorroNombre}" con objetivo de ${formatCLPCurrency(monto)}.`
      });

      setMetaAhorroNombre('');
      setMetaAhorroMonto('');
      setMetaAhorroFecha('');
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al crear meta',
        description: err.message || 'No se pudo registrar la meta.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  // Handle Distribute Funds Submit
  const handleDistribuirFondosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Validar fondos reales disponibles usando los KPIs de contabilidad ya calculados
    const saldoOrigenReal = distribucionOrigen === 'caja' ? contabilidadKPIs.caja : contabilidadKPIs.banco;
    const asignadoOrigen = distribucionOrigen === 'caja' ? fondosAsignados.caja : fondosAsignados.banco;
    const disponibleReal = saldoOrigenReal - asignadoOrigen;

    if (monto > disponibleReal) {
      toast({
        title: 'Fondos insuficientes',
        description: `El saldo disponible sin asignar en ${distribucionOrigen === 'caja' ? 'Caja' : 'Banco'} es ${formatCLPCurrency(disponibleReal)}.`,
        variant: 'destructive'
      });
      return;
    }

    setEjecutandoDistribucion(true);
    try {
      await DistribucionService.distribuirFondos({
        monto,
        origen: distribucionOrigen,
        destinoTipo: distribucionDestinoTipo,
        destinoId: distribucionDestinoId,
        destinoNombre: distribucionDestinoNombre,
        descripcion: `Asignación virtual de ${formatCLPCurrency(monto)} desde ${distribucionOrigen === 'caja' ? 'Caja' : 'Banco'} a "${distribucionDestinoNombre}"`,
        usuarioUid: user?.id || 'admin'
      });

      toast({
        title: 'Fondos distribuidos',
        description: `Se asignaron ${formatCLPCurrency(monto)} a "${distribucionDestinoNombre}" con éxito.`
      });

      setDistribucionOpen(false);
      setDistribucionMonto('');
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de distribución',
        description: err.message || 'No se pudo realizar la distribución virtual.',
        variant: 'destructive'
      });
    } finally {
      setEjecutandoDistribucion(false);
    }
  };

  // Handle Pay Scheduled Expense
  const handlePagarGastoProgramado = async (id: string, metodo: 'efectivo' | 'transferencia') => {
    try {
      setCargando(true);
      await GastosProgramadosService.pagarGastoProgramado(id, metodo);
      toast({
        title: 'Gasto pagado',
        description: 'Se registró el pago en la contabilidad y se cerró la deuda programada.',
        variant: 'success'
      });
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al pagar',
        description: err.message || 'No se pudo procesar el pago del gasto.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  // Handle Delete Scheduled Expense
  const handleEliminarGastoProgramado = async (id: string) => {
    try {
      setCargando(true);
      await GastosProgramadosService.eliminarGastoProgramado(id);
      toast({
        title: 'Gasto eliminado',
        description: 'Se eliminó el gasto programado.'
      });
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al eliminar',
        description: err.message || 'No se pudo eliminar el registro.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  // Handle capital contribution submit
  const handleCapitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      setGuardandoCapital(true);
      
      const movimientos: MovimientoContable[] = [];
      
      // Debits (Assets increases)
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
      
      // Credit (Equity increase)
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
        description: `Se registró el aporte por ${formatCLPCurrency(totalMonto)} con éxito.`,
        variant: 'success'
      });

      setCapitalMonto('');
      setCapitalMontoCaja('');
      setCapitalMontoBanco('');
      setCapitalTipo('capital');
      setCapitalGlosa('Aporte de Capital Inicial');
      setCapitalOpen(false);
      await cargarDatosContables();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error al registrar',
        description: err.message || 'No se pudo guardar el aporte.',
        variant: 'destructive'
      });
    } finally {
      setGuardandoCapital(false);
    }
  };

  // Add product to invoice list
  const handleAddProductToFactura = () => {
    if (!selProdId || !selProdQty || !selProdCost) {
      toast({
        title: 'Producto incompleto',
        description: 'Ingresa el producto, la cantidad y su costo unitario.',
        variant: 'default'
      });
      return;
    }

    const product = productos.find(p => p.id === selProdId);
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

    // Check if product already added
    const exists = facturaProductos.find(p => p.producto_id === selProdId);
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

    setFacturaProductos(prev => [...prev, newItem]);
    
    // Reset inputs
    setSelProdId('');
    setSelProdQty('');
    setSelProdCost('');
  };

  const handleRemoveProductFromFactura = (id: string) => {
    setFacturaProductos(prev => prev.filter(p => p.producto_id !== id));
  };

  // Autofill cost from product catalog
  useEffect(() => {
    if (selProdId) {
      const p = productos.find(prod => prod.id === selProdId);
      if (p && p.costo_actual) {
        setSelProdCost(p.costo_actual.toString());
      } else {
        setSelProdCost('');
      }
    }
  }, [selProdId, productos]);

  // Calculate invoice sums
  const sumNetoFactura = useMemo(() => {
    return facturaProductos.reduce((sum, p) => sum + (p.cantidad * p.costo_unitario), 0);
  }, [facturaProductos]);

  const sumIvaFactura = useMemo(() => {
    if (tipoDocumento === 'factura') {
      return Math.round(sumNetoFactura * 0.19);
    }
    return 0;
  }, [sumNetoFactura, tipoDocumento]);

  const sumTotalFactura = useMemo(() => {
    if (tipoDocumento === 'factura') {
      return sumNetoFactura + sumIvaFactura;
    }
    return sumNetoFactura;
  }, [sumNetoFactura, sumIvaFactura, tipoDocumento]);

  // Submit invoice
  const handleFacturaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numFactura.trim() || !provRut.trim() || !provNombre.trim()) {
      toast({
        title: 'Faltan datos del proveedor',
        description: 'Ingresa RUT, Nombre del proveedor y N° de Documento.',
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
      setCargando(true);

      let finalInvoiceUrl = '';
      if (imagenFactura && imagenFactura.file) {
        const storagePath = `facturas/compra_${Date.now()}.jpg`;
        finalInvoiceUrl = await uploadImage(storagePath, imagenFactura.file);
      }

      await ContabilidadService.registrarFacturaCompra({
        tipoDocumento: tipoDocumento,
        numeroDocumento: numFactura.trim(),
        numeroFactura: numFactura.trim(),
        proveedorRut: provRut.trim(),
        proveedorNombre: provNombre.trim(),
        fecha: new Date(facturaFecha + 'T12:00:00'),
        neto: sumNetoFactura,
        iva: sumIvaFactura,
        total: sumTotalFactura,
        metodoPago: facturaMetodo,
        productos: facturaProductos,
        imagenFacturaUrl: finalInvoiceUrl || undefined
      });

      toast({
        title: 'Documento registrado con éxito',
        description: `Se cargó el comprobante N° ${numFactura} y se actualizó el stock e inventario contable.`,
        variant: 'success'
      });

      // Reset form
      setNumFactura('');
      setProvRut('');
      setProvNombre('');
      setFacturaFecha(format(new Date(), 'yyyy-MM-dd'));
      setFacturaProductos([]);
      setTipoDocumento('factura');
      setImagenFactura(null);
      setFacturaOpen(false);

      await cargarDatosContables();

    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de transacción',
        description: err.message || 'No se pudo guardar la factura de compra.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  if (cargando && cuentas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm font-semibold">Cargando libro contable general...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      {/* Header */}
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6 lg:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight uppercase">
              <BookOpen className="h-8 w-8 text-primary" />
              Contabilidad General
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-70 mt-1">
              Partida doble, Libro Diario, Libro Mayor, Liquidación de IVA Crédito/Débito e ingreso de Facturas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatosContables}
            className="rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-center h-10 px-4"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar Libros
          </Button>
        </div>
      </section>

      {/* Main KPI cards */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Utilidad Neta (Ingresos - Gastos)</p>
                <p className={`text-2xl font-black mt-1.5 ${contabilidadKPIs.utilidadNeta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCLPCurrency(contabilidadKPIs.utilidadNeta)}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">Ventas Netas: {formatCLPCurrency(contabilidadKPIs.ventas)}</span>
              </div>
              <div className={`p-2 rounded-xl ${contabilidadKPIs.utilidadNeta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {contabilidadKPIs.utilidadNeta >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Activos Totales (Debe)</p>
                <p className="text-2xl font-black mt-1.5 text-foreground">
                  {formatCLPCurrency(contabilidadKPIs.activosTotales)}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">Caja: {formatCLPCurrency(contabilidadKPIs.caja)} | Mercadería: {formatCLPCurrency(contabilidadKPIs.mercaderias)}</span>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Landmark className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Estado de IVA Neto</p>
                <p className={`text-2xl font-black mt-1.5 ${contabilidadKPIs.ivaNeto >= 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatCLPCurrency(Math.abs(contabilidadKPIs.ivaNeto))}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {contabilidadKPIs.ivaNeto >= 0 ? 'IVA por Pagar (Débito > Crédito)' : 'Remanente de IVA (Crédito > Débito)'}
                </span>
              </div>
              <div className={`p-2 rounded-xl ${contabilidadKPIs.ivaNeto >= 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Percent className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Deuda Clientes (Al Fiado)</p>
                <p className="text-2xl font-black mt-1.5 text-foreground">
                  {formatCLPCurrency(contabilidadKPIs.clientes)}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">Cuentas por cobrar en caja</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <User className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab content block */}
        <div className="w-full h-full">
          {/* Scrollable tabs on mobile, flex on desktop */}
          <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar border-b border-border/50 mb-6 flex gap-6">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === 'resumen'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Balance &amp; Resultados
            </button>
            <button
              onClick={() => setActiveTab('diario')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === 'diario'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Libro Diario
            </button>
            <button
              onClick={() => setActiveTab('mayor')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === 'mayor'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Libro Mayor
            </button>
            <button
              onClick={() => setActiveTab('facturas')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'facturas'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Compras
              {facturas.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] font-bold bg-muted/60 text-muted-foreground">
                  {facturas.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('flujo')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === 'flujo'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Flujo de Productos
            </button>
            <button
              onClick={() => setActiveTab('gastos')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === 'gastos'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Registrar Egresos
            </button>
            <button
              onClick={() => setActiveTab('ai-assistant')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'ai-assistant'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Asistente IA
            </button>
          </div>

          {/* TAB 1: BALANCE & RESULTADOS */}
          {activeTab === 'resumen' && (
            <div className="mt-0 outline-none space-y-6">
            {contabilidadKPIs.capitalInicial === 0 && contabilidadKPIs.utilidadesAcumuladas === 0 && (
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    Declarar Capital Inicial / Fondos de Operación
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Tu local no tiene registrado dinero disponible para operar. Registra el capital inicial o las utilidades acumuladas (ej: aporte en Caja o Banco) para iniciar compras de mercaderías y egresos sin saldos negativos.
                  </p>
                </div>
                <Button 
                  onClick={() => setCapitalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shrink-0 transition-transform duration-150 active:scale-95 shadow-md"
                >
                  Declarar Dinero Disponible
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Profit and Loss Card */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Estado de Resultados (P&L Simplificado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-border/5">
                      <span className="text-muted-foreground font-semibold">Ingresos Netos por Ventas (4.1.01):</span>
                      <span className="font-extrabold text-foreground">{formatCLPCurrency(contabilidadKPIs.ventas)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/5">
                      <span className="text-muted-foreground font-semibold">(-) Costo de Ventas Mayorista (5.1.01):</span>
                      <span className="font-extrabold text-red-500">({formatCLPCurrency(contabilidadKPIs.costoVentas)})</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b-2 font-black text-base bg-muted/10 px-3 rounded-lg">
                      <span>Utilidad Bruta:</span>
                      <span className="text-primary">{formatCLPCurrency(contabilidadKPIs.utilidadBruta)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/5 pt-2">
                      <span className="text-muted-foreground font-semibold">(-) Gastos Operativos y Generales (5.1.02):</span>
                      <span className="font-extrabold text-red-500">({formatCLPCurrency(contabilidadKPIs.gastosGenerales)})</span>
                    </div>
                    <div className={`flex justify-between items-center py-3 border-t-2 font-black text-lg px-3 rounded-lg mt-3 ${
                      contabilidadKPIs.utilidadNeta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      <span>Utilidad/Pérdida Neta:</span>
                      <span>{formatCLPCurrency(contabilidadKPIs.utilidadNeta)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Sheet Card */}
              <Card className="border border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Balance de Comprobación de Activo y Pasivo
                  </CardTitle>
                  <Button
                    onClick={() => setCapitalOpen(true)}
                    className="rounded-xl font-bold flex items-center gap-1.5 h-8 text-[10px] px-3 bg-indigo-600 hover:bg-indigo-700 text-white transition-transform duration-150 active:scale-95"
                  >
                    <Plus className="h-3 w-3" />
                    Declarar Fondos
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    
                    {/* Assets (Debe) */}
                    <div className="space-y-2">
                      <h4 className="font-black text-muted-foreground uppercase tracking-wider border-b pb-1.5 mb-2">Activos (Debe)</h4>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>1.1.01 Caja</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.caja)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>1.1.02 Banco</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.banco)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>1.1.03 Mercaderías</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.mercaderias)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>1.1.04 Clientes</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.clientes)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>1.1.05 IVA Crédito</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.ivaCredito)}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm border-t pt-2 mt-2">
                        <span>Total Activos:</span>
                        <span>{formatCLPCurrency(contabilidadKPIs.activosTotales)}</span>
                      </div>
                    </div>

                    {/* Liabilities & Equity (Haber) */}
                    <div className="space-y-2">
                      <h4 className="font-black text-muted-foreground uppercase tracking-wider border-b pb-1.5 mb-2">Pasivos + Patrimonio (Haber)</h4>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>2.1.01 IVA Débito</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.ivaDebito)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>2.1.02 Proveedores</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.proveedores)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>3.1.01 Capital Inicial</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.capitalInicial)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5">
                        <span>3.1.02 Utilidades Acumuladas</span>
                        <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.utilidadesAcumuladas)}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-border/5 text-muted-foreground italic">
                        <span>Resultado del Ejercicio</span>
                        <span className="font-bold text-foreground font-sans not-italic">{formatCLPCurrency(contabilidadKPIs.utilidadNeta)}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm border-t pt-2 mt-2">
                        <span>Total Pasivos + Patrimonio:</span>
                        <span>{formatCLPCurrency(contabilidadKPIs.pasivosTotales + contabilidadKPIs.capitalInicial + contabilidadKPIs.utilidadesAcumuladas + contabilidadKPIs.utilidadNeta)}</span>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

            </div>
            </div>
          )}

          {/* TAB 2: LIBRO DIARIO */}
          {activeTab === 'diario' && (
            <div className="mt-0 outline-none">
              <Card className="border border-border/50">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-extrabold uppercase tracking-wider">Libro Diario (General Journal)</CardTitle>
                <p className="text-xs text-muted-foreground">Listado cronológico de asientos y movimientos contables.</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="w-[10%] text-center pl-6">N° Asiento</TableHead>
                      <TableHead className="w-[15%]">Fecha</TableHead>
                      <TableHead className="w-[15%]">Tipo</TableHead>
                      <TableHead className="w-[45%]">Glosa / Concepto</TableHead>
                      <TableHead className="w-[15%] text-right pr-6">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asientos.map((asiento) => {
                      const isExpanded = expandedAsientoId === asiento.id;
                      const totalMonto = asiento.movimientos
                        .filter(m => m.debe > 0)
                        .reduce((sum, m) => sum + m.debe, 0);

                      return (
                        <>
                          <TableRow 
                            key={asiento.id} 
                            className="hover:bg-muted/5 transition-colors cursor-pointer"
                            onClick={() => setExpandedAsientoId(isExpanded ? null : asiento.id)}
                          >
                            <TableCell className="text-center font-mono font-bold pl-6 text-primary">
                              #{asiento.numero_asiento}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-muted-foreground">
                              {format(asiento.fecha.toDate(), 'dd MMM yyyy HH:mm', { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge className="font-bold text-[9px] uppercase tracking-wider" variant="outline">
                                {asiento.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-sm text-foreground">
                              {asiento.glosa}
                              <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                                Monto total: {formatCLPCurrency(totalMonto)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 rounded-lg text-xs font-bold text-primary"
                              >
                                {isExpanded ? 'Ocultar' : 'Ver Detalle'}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                              <TableCell colSpan={5} className="p-4 pl-12 pr-6">
                                <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Asiento contable #{asiento.numero_asiento}</span>
                                    {asiento.referencia_id && (
                                      <span className="text-[10px] font-mono text-muted-foreground/60">ID ref: {asiento.referencia_id}</span>
                                    )}
                                  </div>
                                  <div className="overflow-x-auto w-full">
                                    <Table className="min-w-[550px]">
                                    <TableHeader>
                                      <TableRow className="bg-muted/20 border-b-2">
                                        <TableHead className="w-[15%] text-xs font-bold">Código</TableHead>
                                        <TableHead className="w-[45%] text-xs font-bold">Cuenta Contable</TableHead>
                                        <TableHead className="w-[20%] text-right text-xs font-bold text-emerald-500">Debe</TableHead>
                                        <TableHead className="w-[20%] text-right text-xs font-bold text-red-500">Haber</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {asiento.movimientos.map((mov, mIdx) => (
                                        <TableRow key={mIdx} className="hover:bg-transparent border-b border-border/5">
                                          <TableCell className="font-mono text-xs text-muted-foreground">{mov.cuenta_codigo}</TableCell>
                                          <TableCell className="font-bold text-xs">
                                            {mov.cuenta_nombre}
                                            {mov.haber > 0 && <span className="text-muted-foreground font-normal ml-3 italic">(al haber)</span>}
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-xs text-emerald-500">
                                            {mov.debe > 0 ? formatCLPCurrency(mov.debe) : '-'}
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-xs text-red-500">
                                            {mov.haber > 0 ? formatCLPCurrency(mov.haber) : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {/* Total sum row */}
                                      <TableRow className="bg-muted/30 border-t-2 font-black">
                                        <TableCell colSpan={2} className="text-right text-xs uppercase text-muted-foreground">Totales Asiento:</TableCell>
                                        <TableCell className="text-right text-xs text-emerald-600">{formatCLPCurrency(totalMonto)}</TableCell>
                                        <TableCell className="text-right text-xs text-red-600">{formatCLPCurrency(totalMonto)}</TableCell>
                                      </TableRow>
                                    </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}

                    {asientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No hay asientos contables registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* TAB 3: LIBRO MAYOR */}
          {activeTab === 'mayor' && (
            <div className="mt-0 outline-none space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="sel_cuenta_mayor" className="text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0">
                  Seleccionar Cuenta:
                </Label>
                <select
                  id="sel_cuenta_mayor"
                  value={selectedCuentaCodigo}
                  onChange={(e) => setSelectedCuentaCodigo(e.target.value)}
                  className="bg-card border border-border text-foreground px-3 py-2 rounded-xl text-[16px] md:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-10 w-full sm:w-64"
                >
                  {cuentas.map(c => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} - {c.nombre} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>

              {ledgerData && (
                <Badge className="font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl self-start sm:self-center">
                  Saldo Final: {formatCLPCurrency(ledgerData.saldoFinal)}
                </Badge>
              )}
            </div>

            {ledgerData ? (
              <Card className="border border-border/50">
                <CardHeader className="py-4">
                  <CardTitle className="text-base font-extrabold uppercase tracking-wider">
                    Libro Mayor: {ledgerData.cuenta.codigo} - {ledgerData.cuenta.nombre}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {ledgerData.cuenta.descripcion || 'Movimientos individuales y balance acumulado.'}
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-[15%] pl-6">Fecha</TableHead>
                        <TableHead className="w-[10%] text-center">Asiento Ref</TableHead>
                        <TableHead className="w-[45%]">Descripción / Glosa</TableHead>
                        <TableHead className="w-[15%] text-right text-emerald-500">Debe</TableHead>
                        <TableHead className="w-[15%] text-right text-red-500">Haber</TableHead>
                        <TableHead className="w-[15%] text-right pr-6">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.movimientos.map((mov, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/5 transition-colors text-xs">
                          <TableCell className="pl-6 font-semibold text-muted-foreground">
                            {format(mov.fecha.toDate(), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-primary">
                            #{mov.asiento_numero}
                          </TableCell>
                          <TableCell className="font-bold text-foreground">
                            {mov.glosa}
                          </TableCell>
                          <TableCell className="text-right text-emerald-500 font-bold">
                            {mov.debe > 0 ? formatCLPCurrency(mov.debe) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-500 font-bold">
                            {mov.haber > 0 ? formatCLPCurrency(mov.haber) : '-'}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-black">
                            {formatCLPCurrency(mov.saldo)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {ledgerData.movimientos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            No se registran movimientos para esta cuenta contable.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Selecciona una cuenta del menú superior para ver su Libro Mayor.
              </div>
            )}
            </div>
          )}

          {/* TAB 4: COMPRAS CON FACTURA */}
          {activeTab === 'facturas' && (
            <div className="mt-0 outline-none space-y-4">
              <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Registro de Facturas Recibidas</h3>
              
              {/* Dialog modal for purchase invoice registration */}
              <Dialog open={facturaOpen} onOpenChange={setFacturaOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl font-bold flex items-center gap-1.5 h-10 px-4 bg-primary text-white hover:bg-primary/95">
                    <PlusCircle className="h-4 w-4" />
                    Registrar Factura
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[700px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-black uppercase tracking-wide">Registrar Factura de Compra mayorista</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Ingresa los datos de la factura. El sistema sumará stock automáticamente y generará el asiento contable de compra.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleFacturaSubmit} className="space-y-6">
                    {/* Document & Vendor Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="compra_tipo_doc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Comprobante</Label>
                        <select
                          id="compra_tipo_doc"
                          value={tipoDocumento}
                          onChange={(e) => setTipoDocumento(e.target.value as any)}
                          className="w-full bg-card border border-border text-foreground px-3 py-1 rounded-xl text-[16px] md:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-9"
                        >
                          <option value="boleta">Boleta / Recibo Informal</option>
                          <option value="factura">Factura (Con IVA 19%)</option>
                          <option value="recibo">Recibo / Ticket</option>
                          <option value="guia">Guía de Despacho</option>
                          <option value="otro">Otro Documento</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="num_factura" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">N° Folio / Documento</Label>
                        <Input
                          id="num_factura"
                          placeholder="Ej: 99480"
                          value={numFactura}
                          onChange={(e) => setNumFactura(e.target.value)}
                          className="h-9 text-[16px] md:text-xs font-semibold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prov_rut" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RUT Proveedor</Label>
                        <Input
                          id="prov_rut"
                          placeholder="Ej: 76.120.340-K"
                          value={provRut}
                          onChange={(e) => setProvRut(e.target.value)}
                          className="h-9 text-[16px] md:text-xs font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="prov_nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre Proveedor</Label>
                        <Input
                          id="prov_nombre"
                          placeholder="Ej: Distribuidora Alvi"
                          value={provNombre}
                          onChange={(e) => setProvNombre(e.target.value)}
                          className="h-9 text-[16px] md:text-xs font-semibold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fact_fecha" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Documento</Label>
                        <Input
                          id="fact_fecha"
                          type="date"
                          value={facturaFecha}
                          onChange={(e) => setFacturaFecha(e.target.value)}
                          className="h-9 text-[16px] md:text-xs font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="fact_metodo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medio de Pago</Label>
                        <select
                          id="fact_metodo"
                          value={facturaMetodo}
                          onChange={(e) => setFacturaMetodo(e.target.value as any)}
                          className="w-full bg-card border border-border text-foreground px-3 py-1 rounded-xl text-[16px] md:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-9"
                        >
                          <option value="efectivo">Efectivo (Caja)</option>
                          <option value="transferencia">Transferencia / Tarjeta (Banco)</option>
                          <option value="credito">Crédito (A pagar a Proveedores)</option>
                        </select>
                      </div>

                      {/* Image Upload field */}
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Foto Comprobante (Opcional)</Label>
                        {imagenFactura ? (
                          <div className="relative w-full h-9 rounded-xl overflow-hidden bg-black border border-border flex items-center justify-between px-3">
                            <span className="text-[10px] text-white truncate max-w-[70%] font-semibold">{imagenFactura.file?.name || 'Comprobante cargado'}</span>
                            <button
                              type="button"
                              onClick={handleRemoveFacturaImage}
                              className="text-red-500 hover:text-red-600 font-bold text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={handleTriggerFacturaCamera}
                            className="w-full h-9 border border-dashed border-border/80 rounded-xl flex items-center justify-center text-muted-foreground gap-1.5 bg-background cursor-pointer hover:bg-muted/5 transition-all px-3"
                          >
                            <Camera className="h-4 w-4 text-indigo-500" />
                            <span className="text-[10px] font-bold opacity-75">Tomar o cargar foto</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputFacturaRef}
                          onChange={handleFileFacturaChange}
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Invoice Products Section */}
                    <div className="rounded-2xl border p-4 bg-muted/10 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-primary" />
                        Cargar Productos de la Factura
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="fact_add_prod" className="text-xs text-muted-foreground font-semibold">Producto</Label>
                          <select
                            id="fact_add_prod"
                            value={selProdId}
                            onChange={(e) => setSelProdId(e.target.value)}
                            className="w-full bg-card border border-border text-foreground px-3 py-1 rounded-xl text-[16px] md:text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-9"
                          >
                            <option value="">-- Seleccionar --</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="fact_add_qty" className="text-xs text-muted-foreground font-semibold">Cantidad</Label>
                          <Input
                            id="fact_add_qty"
                            type="number"
                            step="any"
                            placeholder="Cant/Kgs"
                            value={selProdQty}
                            onChange={(e) => setSelProdQty(e.target.value)}
                            className="h-9 text-[16px] md:text-xs font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="fact_add_cost" className="text-xs text-muted-foreground font-semibold">Costo Unit. Neto</Label>
                          <Input
                            id="fact_add_cost"
                            type="number"
                            placeholder="$ Neto"
                            value={selProdCost}
                            onChange={(e) => setSelProdCost(e.target.value)}
                            className="h-9 text-[16px] md:text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddProductToFactura}
                        className="rounded-xl text-xs font-bold h-9 px-4 bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1 w-full justify-center border border-border/40"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        Agregar Fila de Producto
                      </Button>

                      {/* Added products table */}
                      {facturaProductos.length > 0 && (
                        <div className="rounded-xl border bg-card overflow-hidden mt-3">
                          <div className="overflow-x-auto w-full max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                            <Table className="min-w-[500px]">
                              <TableHeader>
                                <TableRow className="bg-muted/20 text-[10px]">
                                  <TableHead className="py-2 pl-4">Producto</TableHead>
                                  <TableHead className="py-2 text-center">Cantidad</TableHead>
                                  <TableHead className="py-2 text-right">Costo Unit Neto</TableHead>
                                  <TableHead className="py-2 text-right">Total Neto</TableHead>
                                  <TableHead className="py-2 text-center pr-4">Eliminar</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="text-[11px]">
                                {facturaProductos.map((item, index) => (
                                  <TableRow key={index} className="border-b border-border/5">
                                    <TableCell className="font-bold py-1.5 pl-4 whitespace-nowrap">{item.nombre}</TableCell>
                                    <TableCell className="text-center py-1.5 font-bold">{item.cantidad}</TableCell>
                                    <TableCell className="text-right py-1.5 font-mono">{formatCLPCurrency(item.costo_unitario)}</TableCell>
                                    <TableCell className="text-right py-1.5 font-mono font-extrabold">{formatCLPCurrency(item.cantidad * item.costo_unitario)}</TableCell>
                                    <TableCell className="text-center py-1.5 pr-4">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveProductFromFactura(item.producto_id)}
                                        className="h-6 w-6 text-red-500 hover:bg-red-500/10 rounded-md"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cost Summaries */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-muted/20 p-3 rounded-2xl border border-border/10 text-center text-xs">
                      <div className="text-center">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Neto Factura</span>
                        <span className="font-black text-xs sm:text-sm block mt-1">{formatCLPCurrency(sumNetoFactura)}</span>
                      </div>
                      <div className="text-center border-x border-border/10">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">IVA (19% Neto)</span>
                        <span className="font-black text-xs sm:text-sm block mt-1">{formatCLPCurrency(sumIvaFactura)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Total Factura</span>
                        <span className="font-black text-xs sm:text-base text-primary block mt-1">{formatCLPCurrency(sumTotalFactura)}</span>
                      </div>
                    </div>

                    {/* Submit Invoice Buttons */}
                    <div className="flex justify-end gap-3 pt-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFacturaOpen(false)}
                        className="rounded-xl text-xs font-bold h-11 px-5"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl text-xs font-bold h-11 px-6 bg-primary text-white hover:bg-primary/95"
                      >
                        Confirmar y Registrar Factura
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {facturasAgrupadasPorDia.length === 0 ? (
              <Card className="border border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <CardTitle className="text-base text-muted-foreground">No hay compras registradas</CardTitle>
                <p className="text-xs text-muted-foreground/70 max-w-sm mt-1">
                  Registra una factura o boleta de compra para comenzar.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {facturasAgrupadasPorDia.map((dia) => {
                  const isExpanded = !!expandedDays[dia.fechaKey];
                  
                  // Flatten products bought on this day with metadata
                  const itemsComprados = dia.facturas.flatMap(f => {
                    const isFacturado = f.tipo_documento === 'factura';
                    return (f.productos || []).map(p => ({
                      ...p,
                      factura: f,
                      isFacturado
                    }));
                  });

                  return (
                    <Card key={dia.fechaKey} className="border border-border/50 overflow-hidden">
                      {/* Accordion Trigger Header */}
                      <div 
                        onClick={() => {
                          setExpandedDays(prev => ({
                            ...prev,
                            [dia.fechaKey]: !prev[dia.fechaKey]
                          }));
                        }}
                        className="flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/20 cursor-pointer select-none transition-colors border-b border-border/10"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                            {format(dia.fechaDisplay, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {dia.facturas.length} {dia.facturas.length === 1 ? 'comprobante' : 'comprobantes'} • {itemsComprados.length} {itemsComprados.length === 1 ? 'producto comprado' : 'productos comprados'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Total Comprado</span>
                            <span className="text-sm font-black text-primary block mt-0.5">
                              {formatCLPCurrency(dia.total)}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-muted/60 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="overflow-x-auto w-full">
                          <Table className="min-w-[950px]">
                            <TableHeader>
                              <TableRow className="bg-muted/5 text-[10px]">
                                <TableHead className="pl-6 py-2">Producto</TableHead>
                                <TableHead className="py-2">Documento / Folio</TableHead>
                                <TableHead className="py-2">Proveedor</TableHead>
                                <TableHead className="text-center py-2">Cant.</TableHead>
                                <TableHead className="text-right py-2">Costo Unit.</TableHead>
                                <TableHead className="text-right py-2">Total</TableHead>
                                <TableHead className="text-center py-2">Estado</TableHead>
                                <TableHead className="text-right pr-6 py-2">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs">
                              {itemsComprados.map((item, index) => (
                                <TableRow key={`${item.factura.id}-${index}`} className="hover:bg-muted/5 transition-colors border-b last:border-0 border-border/30">
                                  <TableCell className="font-bold pl-6 py-3">
                                    {item.nombre}
                                  </TableCell>
                                  <TableCell className="py-3 font-semibold">
                                    <span className="block text-[9px] uppercase tracking-wider opacity-60 font-sans">{item.factura.tipo_documento || 'factura'}</span>
                                    N° {item.factura.numero_documento || item.factura.numero_factura}
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <span className="font-bold block">{item.factura.proveedor_nombre}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">RUT: {item.factura.proveedor_rut}</span>
                                  </TableCell>
                                  <TableCell className="text-center font-bold py-3">
                                    {item.cantidad}
                                  </TableCell>
                                  <TableCell className="text-right font-medium font-mono py-3">
                                    {formatCLPCurrency(item.costo_unitario)}
                                  </TableCell>
                                  <TableCell className="text-right font-black font-mono py-3">
                                    {formatCLPCurrency(item.cantidad * item.costo_unitario)}
                                  </TableCell>
                                  <TableCell className="text-center py-3">
                                    {item.isFacturado ? (
                                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider">
                                        Facturado
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-bold text-[9px] uppercase tracking-wider animate-pulse">
                                        No Facturado
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 py-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFactura(item.factura);
                                        setFacturaDetalleOpen(true);
                                      }}
                                      className="h-8 rounded-lg text-xs font-bold text-primary flex items-center gap-1 ml-auto"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Doc. Origen
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            </div>
          )}

          {/* TAB 5: REGISTRAR GASTOS / EGRESOS */}
          {activeTab === 'gastos' && (
            <div className="mt-0 outline-none space-y-6">
            
            {/* Resumen de Fondos y Distribución */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-border/50 bg-card p-5 space-y-2">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Fondos en Caja (Efectivo)</h4>
                <div className="text-2xl font-black text-foreground">{formatCLPCurrency(contabilidadKPIs.caja)}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                  <span>Asignado: {formatCLPCurrency(fondosAsignados.caja)}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Disponible: {formatCLPCurrency(Math.max(0, contabilidadKPIs.caja - fondosAsignados.caja))}</span>
                </div>
              </Card>

              <Card className="border border-border/50 bg-card p-5 space-y-2">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Fondos en Banco (Digital)</h4>
                <div className="text-2xl font-black text-foreground">{formatCLPCurrency(contabilidadKPIs.banco)}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                  <span>Asignado: {formatCLPCurrency(fondosAsignados.banco)}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Disponible: {formatCLPCurrency(Math.max(0, contabilidadKPIs.banco - fondosAsignados.banco))}</span>
                </div>
              </Card>

              <Card className="border border-border/50 bg-card p-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Presupuesto Asignado</h4>
                  <div className="text-2xl font-black text-primary mt-2">
                    {formatCLPCurrency(fondosAsignados.caja + fondosAsignados.banco)}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setDistribucionOrigen('caja');
                    setDistribucionDestinoTipo('gasto');
                    setDistribucionDestinoId('');
                    setDistribucionDestinoNombre('');
                    setDistribucionMonto('');
                    setDistribucionOpen(true);
                  }}
                  className="w-full rounded-xl text-xs font-bold h-9 mt-4 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Distribuir Fondos
                </Button>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Columna Izquierda: Formularios y Metas de Ahorro */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Formulario de Gastos */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex gap-2 bg-muted/50 p-1 rounded-xl w-full">
                      <button
                        onClick={() => setTipoGastoRegistro('directo')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tipoGastoRegistro === 'directo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Gasto Directo
                      </button>
                      <button
                        onClick={() => setTipoGastoRegistro('programado')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tipoGastoRegistro === 'programado' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Programar Gasto
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5">
                    {tipoGastoRegistro === 'directo' ? (
                      <form onSubmit={handleGastoSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="gasto_glosa" className="text-[10px] font-black uppercase text-muted-foreground">Concepto / Glosa</Label>
                          <Input
                            id="gasto_glosa"
                            placeholder="Ej: Pago de luz eléctrica"
                            value={gastoGlosa}
                            onChange={(e) => setGastoGlosa(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="gasto_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto ($)</Label>
                            <Input
                              id="gasto_monto"
                              inputMode="numeric"
                              placeholder="Ej: $35.000"
                              value={gastoMonto}
                              onChange={(e) => setGastoMonto(e.target.value.replace(/[^\d.]/g, ''))}
                              onBlur={() => { const v = parseChileanMoneyInput(gastoMonto); setGastoMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                              className="h-9 text-xs rounded-xl"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="gasto_metodo" className="text-[10px] font-black uppercase text-muted-foreground">Medio de Pago</Label>
                            <select
                              id="gasto_metodo"
                              value={gastoMetodo}
                              onChange={(e) => setGastoMetodo(e.target.value as any)}
                              className="w-full bg-card border border-border text-foreground px-3 py-2 rounded-xl text-xs font-bold h-9 focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="efectivo">Caja (Efectivo)</option>
                              <option value="transferencia">Banco (Transf.)</option>
                            </select>
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-9 rounded-xl text-xs font-bold mt-2">
                          Registrar Gasto Real
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleProgramarGastoSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="prog_concepto" className="text-[10px] font-black uppercase text-muted-foreground">Concepto a Programar</Label>
                          <Input
                            id="prog_concepto"
                            placeholder="Ej: Arriendo del local comercial"
                            value={progConcepto}
                            onChange={(e) => setProgConcepto(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="prog_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto estimado ($)</Label>
                            <Input
                              id="prog_monto"
                              inputMode="numeric"
                              placeholder="Ej: $250.000"
                              value={progMonto}
                              onChange={(e) => setProgMonto(e.target.value.replace(/[^\d.]/g, ''))}
                              onBlur={() => { const v = parseChileanMoneyInput(progMonto); setProgMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                              className="h-9 text-xs rounded-xl"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="prog_fecha" className="text-[10px] font-black uppercase text-muted-foreground">Fecha Vencimiento</Label>
                            <Input
                              id="prog_fecha"
                              type="date"
                              value={progFecha}
                              onChange={(e) => setProgFecha(e.target.value)}
                              className="h-9 text-xs rounded-xl"
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" variant="secondary" className="w-full h-9 rounded-xl text-xs font-bold mt-2">
                          Programar Gasto
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Metas Financieras (Ahorro) */}
                <Card className="border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-indigo-500" />
                      Metas de Ahorro / Reinversión
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lista de Metas */}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {metasFinancieras.map((meta) => {
                        const pct = calcPct(meta.monto_asignado, meta.monto_objetivo);
                        return (
                          <div key={meta.id} className="text-xs border border-border/40 p-3 rounded-xl space-y-1.5 bg-muted/5">
                            <div className="flex justify-between font-bold">
                              <span className="truncate pr-2">{meta.nombre}</span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatCLPCurrency(meta.monto_asignado)} / {formatCLPCurrency(meta.monto_objetivo)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground leading-none">
                              <span>Progreso: {pct}%</span>
                              {meta.completada && (
                                <Badge className="h-3 text-[7px] bg-emerald-500 text-white font-bold leading-none py-0 px-1 rounded-sm">COMPLETADA</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {metasFinancieras.length === 0 && (
                        <p className="text-center text-[11px] text-muted-foreground py-4">No hay metas de ahorro registradas.</p>
                      )}
                    </div>

                    {/* Formulario Nueva Meta */}
                    <form onSubmit={handleMetaAhorroSubmit} className="border-t border-border/40 pt-4 space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="meta_nombre" className="text-[10px] font-black uppercase text-muted-foreground">Nueva Meta de Ahorro</Label>
                        <Input
                          id="meta_nombre"
                          placeholder="Ej: Vitrina nueva o Camión de reparto"
                          value={metaAhorroNombre}
                          onChange={(e) => setMetaAhorroNombre(e.target.value)}
                          className="h-8 text-xs rounded-xl"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            inputMode="numeric"
                            placeholder="Ej: $500.000"
                            value={metaAhorroMonto}
                            onChange={(e) => setMetaAhorroMonto(e.target.value.replace(/[^\d.]/g, ''))}
                            onBlur={() => { const v = parseChileanMoneyInput(metaAhorroMonto); setMetaAhorroMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                            className="h-8 text-xs rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <Input
                            type="date"
                            placeholder="Fecha límite"
                            value={metaAhorroFecha}
                            onChange={(e) => setMetaAhorroFecha(e.target.value)}
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>
                      </div>
                      <Button type="submit" variant="outline" className="w-full h-8 text-[11px] font-bold rounded-xl">
                        <Plus className="h-3 w-3 mr-1" />
                        Crear Meta de Ahorro
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Columna Derecha: Listado de Gastos Programados */}
              <div className="lg:col-span-8">
                <Card className="border border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        Gastos Mensuales Estipulados (Vencimientos)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[650px]">
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="pl-6 text-[10px] font-bold uppercase">Concepto</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-right">Monto Estimado</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-center">Vencimiento</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-center">Estado / Asignación</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-right pr-6">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gastosProgramados.map((gasto) => {
                            const dateObj = gasto.fecha_vencimiento.toDate();
                            const formattedDate = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
                            
                            // Calcular días restantes
                            const ahoraMillis = new Date().setHours(0, 0, 0, 0);
                            const vencMillis = dateObj.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((vencMillis - ahoraMillis) / (1000 * 60 * 60 * 24));
                            
                            // Progreso de asignación
                            const pct = calcPct(gasto.monto_asignado, gasto.monto);

                            return (
                              <TableRow key={gasto.id} className="hover:bg-muted/5 transition-colors text-xs">
                                <TableCell className="font-bold pl-6">{gasto.concepto}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCLPCurrency(gasto.monto)}</TableCell>
                                <TableCell className="text-center font-medium">
                                  <div>{formattedDate}</div>
                                  {!gasto.pagado && (
                                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${diffDays < 0 ? 'text-red-500 bg-red-500/10 animate-pulse' : diffDays <= 3 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                                      {diffDays < 0 ? `Atrasado x ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Vence hoy' : `Faltan ${diffDays}d`}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="align-middle">
                                  {gasto.pagado ? (
                                    <div className="flex flex-col items-center">
                                      <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase py-0.5">PAGADO</Badge>
                                      <span className="text-[8px] text-muted-foreground mt-0.5 capitalize">con {gasto.metodo_pago}</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1 w-28 mx-auto">
                                      <div className="flex justify-between text-[9px] font-medium leading-none">
                                        <span>Asignado: {pct}%</span>
                                        <span>{formatCLPCurrency(gasto.monto_asignado)}</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  {!gasto.pagado ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Botón Distribuir directo */}
                                      <Button
                                        onClick={() => {
                                          setDistribucionDestinoTipo('gasto');
                                          setDistribucionDestinoId(gasto.id);
                                          setDistribucionDestinoNombre(gasto.concepto);
                                          setDistribucionOrigen('caja');
                                          setDistribucionMonto(formatCLPCurrency(gasto.monto - gasto.monto_asignado));
                                          setDistribucionOpen(true);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold rounded-lg px-2"
                                      >
                                        Asignar
                                      </Button>
                                      
                                      {/* Pagar */}
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            className="h-7 text-[10px] font-bold rounded-lg px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                          >
                                            Pagar
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xs">
                                          <DialogHeader>
                                            <DialogTitle className="text-sm font-bold uppercase">Confirmar Pago de Gasto</DialogTitle>
                                            <DialogDescription className="text-xs">
                                              ¿Cómo deseas registrar el pago contable para "{gasto.concepto}"?
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button
                                              onClick={() => handlePagarGastoProgramado(gasto.id, 'efectivo')}
                                              className="h-10 text-xs rounded-xl flex items-center justify-center gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20"
                                            >
                                              <DollarSign className="h-4 w-4" />
                                              Caja (Efectivo)
                                            </Button>
                                            <Button
                                              onClick={() => handlePagarGastoProgramado(gasto.id, 'transferencia')}
                                              className="h-10 text-xs rounded-xl flex items-center justify-center gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20"
                                            >
                                              <Send className="h-4 w-4" />
                                              Banco (Transf.)
                                            </Button>
                                          </div>
                                        </DialogContent>
                                      </Dialog>

                                      <Button
                                        onClick={() => handleEliminarGastoProgramado(gasto.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic font-medium pr-2">Listo</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {gastosProgramados.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                                No hay gastos programados o mensuales registrados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>

            {/* Modal de Distribución de Fondos */}
            <Dialog open={distribucionOpen} onOpenChange={setDistribucionOpen}>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black">Distribuir Fondos (Virtual)</DialogTitle>
                  <DialogDescription className="text-xs">
                    Asigna fondos de forma virtual desde Caja o Banco a un gasto programado o meta de ahorro para asegurar su cumplimiento.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDistribuirFondosSubmit} className="space-y-4 py-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Origen del Dinero</Label>
                    <select
                      value={distribucionOrigen}
                      onChange={(e) => setDistribucionOrigen(e.target.value as any)}
                      className="w-full bg-card border border-border text-foreground px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-10"
                    >
                      <option value="caja">Caja (Disponible sin asignar: {formatCLPCurrency(Math.max(0, contabilidadKPIs.caja - fondosAsignados.caja))})</option>
                      <option value="banco">Banco (Disponible sin asignar: {formatCLPCurrency(Math.max(0, contabilidadKPIs.banco - fondosAsignados.banco))})</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo de Destino</Label>
                      <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl h-10 items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setDistribucionDestinoTipo('gasto');
                            setDistribucionDestinoId('');
                            setDistribucionDestinoNombre('');
                          }}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all h-8 ${distribucionDestinoTipo === 'gasto' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                          Gastos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDistribucionDestinoTipo('meta_financiera');
                            setDistribucionDestinoId('');
                            setDistribucionDestinoNombre('');
                          }}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all h-8 ${distribucionDestinoTipo === 'meta_financiera' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                          Ahorros
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dist_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto a Asignar</Label>
                      <Input
                        id="dist_monto"
                        inputMode="numeric"
                        placeholder="Ej: $50.000"
                        value={distribucionMonto}
                        onChange={(e) => setDistribucionMonto(e.target.value.replace(/[^\d.]/g, ''))}
                        onBlur={() => { const v = parseChileanMoneyInput(distribucionMonto); setDistribucionMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                        className="h-10 text-xs rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Seleccionar Destino</Label>
                    <select
                      value={distribucionDestinoId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        setDistribucionDestinoId(targetId);
                        
                        if (distribucionDestinoTipo === 'gasto') {
                          const item = gastosProgramados.find(g => g.id === targetId);
                          if (item) setDistribucionDestinoNombre(item.concepto);
                        } else {
                          const item = metasFinancieras.find(m => m.id === targetId);
                          if (item) setDistribucionDestinoNombre(item.nombre);
                        }
                      }}
                      className="w-full bg-card border border-border text-foreground px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-10"
                      required
                    >
                      <option value="">Selecciona una opción...</option>
                      {distribucionDestinoTipo === 'gasto' ? (
                        gastosProgramados.filter(g => !g.pagado).map(g => (
                          <option key={g.id} value={g.id}>
                            {g.concepto} (Falta: {formatCLPCurrency(g.monto - g.monto_asignado)})
                          </option>
                        ))
                      ) : (
                        metasFinancieras.filter(m => !m.completada).map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} (Falta: {formatCLPCurrency(m.monto_objetivo - m.monto_asignado)})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDistribucionOpen(false)}
                      disabled={ejecutandoDistribucion}
                      className="rounded-xl h-10 text-xs font-bold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={ejecutandoDistribucion}
                      className="rounded-xl h-10 text-xs font-bold"
                    >
                      {ejecutandoDistribucion ? 'Asignando...' : 'Confirmar Asignación'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            </div>
          )}

          {/* TAB 5: FLUJO DE PRODUCTOS */}
          {activeTab === 'flujo' && (
            <div className="mt-0 outline-none space-y-4">
              <Card className="border border-border/50">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                      <Activity className="h-5 w-5 text-indigo-500" />
                      Flujo de Entrada y Salida de Inventario
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Compara el ingreso (compras) versus salidas (ventas) en el rango seleccionado.</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto self-start sm:self-center">
                    <Input
                      type="date"
                      value={flujoFechaInicio}
                      onChange={(e) => setFlujoFechaInicio(e.target.value)}
                      className="h-9 text-[16px] md:text-xs rounded-xl w-full sm:w-36 font-semibold"
                    />
                    <span className="text-xs font-bold text-muted-foreground">a</span>
                    <Input
                      type="date"
                      value={flujoFechaFin}
                      onChange={(e) => setFlujoFechaFin(e.target.value)}
                      className="h-9 text-[16px] md:text-xs rounded-xl w-full sm:w-36 font-semibold"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {cargandoFlujo ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-bold">Calculando movimientos de productos...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[750px]">
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="pl-6">Producto</TableHead>
                        <TableHead className="text-right">Entradas (Compras)</TableHead>
                        <TableHead className="text-right">Salidas (Ventas)</TableHead>
                        <TableHead className="text-right">Flujo Neto</TableHead>
                        <TableHead className="text-right">Stock de Catálogo</TableHead>
                        <TableHead className="text-center pr-6">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((prod) => {
                        const flow = productFlowData[prod.id] || { entradas: 0, salidas: 0 };
                        const netFlow = flow.entradas - flow.salidas;
                        const stock = prod.stock_actual;

                        return (
                          <TableRow key={prod.id} className="hover:bg-muted/5 transition-colors text-xs">
                            <TableCell className="font-bold pl-6">{prod.nombre}</TableCell>
                            <TableCell className="text-right text-emerald-500 font-semibold">
                              +{prod.unidad === 'kg' ? flow.entradas.toFixed(2) : Math.round(flow.entradas)} {prod.unidad}
                            </TableCell>
                            <TableCell className="text-right text-red-500 font-semibold">
                              -{prod.unidad === 'kg' ? flow.salidas.toFixed(2) : Math.round(flow.salidas)} {prod.unidad}
                            </TableCell>
                            <TableCell className={`text-right font-black ${netFlow > 0 ? 'text-emerald-500' : netFlow < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {netFlow > 0 ? '+' : ''}{prod.unidad === 'kg' ? netFlow.toFixed(2) : Math.round(netFlow)} {prod.unidad}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              {prod.unidad === 'kg' ? stock.toFixed(2) : Math.round(stock)} {prod.unidad}
                            </TableCell>
                            <TableCell className="text-center pr-6">
                              {stock < 5 ? (
                                <Badge className="bg-red-500 hover:bg-red-600 font-bold text-[8px] uppercase tracking-wider text-white">Crítico</Badge>
                              ) : stock < 15 ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 font-bold text-[8px] uppercase tracking-wider text-white">Bajo</Badge>
                              ) : (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold text-[8px] uppercase tracking-wider text-white">Saludable</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {productos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            No hay productos catalogados para mostrar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {/* TAB 6: AI ACCOUNTING ASSISTANT */}
          {activeTab === 'ai-assistant' && (
            <div className="mt-0 outline-none">
              <Card className="border border-border/50 max-w-3xl mx-auto rounded-[2rem] overflow-hidden shadow-lg bg-card/60 backdrop-blur-md flex flex-col h-[75vh]">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-5 py-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Asistente Contable & Financiero con IA</CardTitle>
                    <p className="text-[10px] uppercase font-black text-muted-foreground opacity-75">Diagnóstico y Consejos en base a tu Partida Doble</p>
                  </div>
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-5 space-y-4 overflow-y-auto">
                <div className="space-y-4">
                  {/* Chat logs */}
                  {chatLogs.map((log) => (
                    <div key={log.id} className="space-y-3">
                      {/* User message */}
                      <div className="flex justify-end">
                        <div className="bg-indigo-600 text-white rounded-2xl px-4 py-2.5 text-xs font-semibold max-w-[85%] shadow-sm">
                          <p className="font-bold text-[9px] uppercase tracking-wider opacity-75 mb-0.5">Tú</p>
                          {log.pregunta}
                        </div>
                      </div>

                      {/* Assistant reply */}
                      <div className="flex justify-start">
                        <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                          <p className="font-black text-[9px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Asistente Contable
                          </p>
                          {renderMarkdown(log.respuesta)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Temporary screen response if any */}
                  {aiRespuesta && !chatLogs.some(log => log.respuesta === aiRespuesta) && (
                    <div className="space-y-3">
                      <div className="flex justify-start">
                        <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                          <p className="font-black text-[9px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Asistente Contable
                          </p>
                          {renderMarkdown(aiRespuesta)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generating placeholder */}
                  {aiCargando && (
                    <div className="flex justify-start">
                      <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <span className="font-semibold text-xs">El asistente está analizando tus registros financieros...</span>
                      </div>
                    </div>
                  )}

                  {chatLogs.length === 0 && !aiRespuesta && !aiCargando && (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <Sparkles className="h-10 w-10 mx-auto opacity-30 text-indigo-500" />
                      <p className="font-bold text-sm">¿Cómo puedo ayudarte con tu contabilidad hoy?</p>
                      <p className="text-xs opacity-75 max-w-sm mx-auto">Selecciona una sugerencia de abajo o escribe una consulta libre sobre tus transacciones.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <CardContent className="p-4 border-t bg-muted/10 shrink-0 space-y-4">
                {/* Suggestions */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiPregunta('Realiza un diagnóstico de salud financiera general del negocio y da 3 consejos inmediatos para aumentar ganancias y reducir costos.')}
                      className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <Activity className="h-3.5 w-3.5 text-indigo-500" />
                      Salud General
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPregunta('Analiza mi saldo acumulado de IVA Crédito Fiscal contra IVA Débito Fiscal. Explica cuánto debo pagar, si tengo remanente y qué estrategias tributarias legales puedo aplicar.')}
                      className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <Percent className="h-3.5 w-3.5 text-emerald-500" />
                      IVA Impuestos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPregunta('¿Cómo se comparan mis Gastos Generales (Egresos fijos) contra mis Ventas Netas y utilidad neta? Dame ideas de control.')}
                      className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      Reducir Gastos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPregunta('¿Qué punto de equilibrio de ventas diarias necesito cubrir para solventar los costos de mercaderías (Costo de Ventas) y gastos fijos? Proyecta una meta.')}
                      className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
                    >
                      <Target className="h-3.5 w-3.5 text-purple-500" />
                      Punto Equilibrio
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <textarea
                    id="ai_pregunta_input"
                    rows={1}
                    placeholder="Pregúntale al Asistente contable..."
                    value={aiPregunta}
                    onChange={(e) => setAiPregunta(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerarInformeFinanciero();
                      }
                    }}
                    className="flex-1 p-3 rounded-xl border border-border/60 text-[16px] md:text-xs bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold leading-relaxed resize-none text-foreground"
                  />
                  <Button
                    onClick={handleGenerarInformeFinanciero}
                    disabled={aiCargando || !aiPregunta.trim() || asientos.length === 0}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 shrink-0"
                  >
                    Enviar
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>

      {/* DETALLE DE FACTURA / COMPRA DIALOG */}
      <Dialog open={facturaDetalleOpen} onOpenChange={setFacturaDetalleOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[800px] p-0 bg-white dark:bg-card border border-border/85 text-foreground rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {selectedFactura && (
            <>
              {/* Header */}
              <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40 bg-muted/20 dark:bg-muted/10 text-left">
                <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  Detalle del Comprobante: N° {selectedFactura.numero_documento || selectedFactura.numero_factura}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Tipo: <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40 font-bold uppercase text-[10px] tracking-wide">{selectedFactura.tipo_documento || 'Factura'}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 opacity-60" />
                    {format(selectedFactura.fecha.toDate(), 'dd/MM/yyyy')}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">Proveedor</span>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs text-foreground font-extrabold truncate">{selectedFactura.proveedor_nombre}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">RUT Proveedor</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs text-foreground font-semibold truncate">{selectedFactura.proveedor_rut || 'S/R'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">Método de Pago</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                        selectedFactura.metodo_pago === 'efectivo'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : selectedFactura.metodo_pago === 'transferencia'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      }`}>
                        {selectedFactura.metodo_pago}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">Total Compra</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs sm:text-sm md:text-base">
                      {formatCLPCurrency(selectedFactura.total)}
                    </span>
                  </div>
                </div>

                {/* Receipt Image */}
                {selectedFactura.imagen_factura_url ? (
                  <div className="space-y-2">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Foto del Comprobante Adjunto</span>
                    <div className="relative w-full h-36 sm:h-48 md:h-56 rounded-2xl overflow-hidden bg-muted/20 border border-border flex items-center justify-center group transition-all duration-300 hover:border-primary/20 shadow-lg">
                      <img src={selectedFactura.imagen_factura_url} alt="Comprobante de compra" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                        <span className="text-[10px] text-white/80 font-bold bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md hidden sm:inline-block">Vista Previa del Documento</span>
                        <a
                          href={selectedFactura.imagen_factura_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-lg transition-transform duration-200 hover:scale-105 flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Pantalla Completa
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 hover:bg-muted/20 transition-all">
                    <Camera className="h-8 w-8 text-indigo-500/80" />
                    <div className="flex flex-col gap-1 items-center">
                      <span className="font-bold text-foreground">Sin imagen o archivo de comprobante adjunto</span>
                      <p className="text-[10px] opacity-75">Sube una foto de la boleta o factura para respaldar esta compra.</p>
                    </div>
                    
                    <Button 
                      type="button"
                      disabled={subiendoImagenDetalle}
                      onClick={() => fileInputDetalleRef.current?.click()}
                      className="mt-2 rounded-xl text-[10px] font-bold h-8 px-4 bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5"
                    >
                      {subiendoImagenDetalle ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Adjuntar Comprobante
                        </>
                      )}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputDetalleRef}
                      onChange={handleAgregarImagenDetalle}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}

                {/* Items and Stock Duration Table */}
                <div className="space-y-2">
                  <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Detalle de Artículos y Rendimiento de Stock</span>
                  
                  <div className="rounded-2xl border border-border overflow-hidden bg-card">
                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                      <Table className="min-w-[650px]">
                        <TableHeader>
                          <TableRow className="border-b border-border bg-muted/20 dark:bg-muted/10">
                            <TableHead className="py-3 pl-4 text-muted-foreground font-black uppercase text-[9px] tracking-wider">Producto</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Cantidad Compra</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Costo Unit</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Stock Actual</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Ventas Diarias (Promedio)</TableHead>
                            <TableHead className="py-3 text-right pr-4 text-muted-foreground font-black uppercase text-[9px] tracking-wider">Duración Estimada</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedFactura.productos && selectedFactura.productos.map((item, idx) => {
                            const catalogProd = productos.find(p => p.id === item.producto_id);
                            const stockActual = catalogProd ? catalogProd.stock_actual : 0;
                            const velVenta = velocidadesVenta[item.producto_id] || 0;
                            const unidad = catalogProd ? catalogProd.unidad : 'unidades';
                            
                            // Boxes and kilograms details
                            const cantCaja = item.cantidad_por_caja || catalogProd?.cantidad_por_caja;
                            const empaqueLabel = catalogProd?.tipo_empaque || 'Caja';

                            let diasStock = 'Sin ventas';
                            let badgeStyle = 'bg-muted text-muted-foreground border-border/50';
                            let esCritico = false;
                            
                            if (velVenta > 0) {
                              const dias = stockActual / velVenta;
                              diasStock = `${Math.round(dias)} días`;
                              if (dias < 7) {
                                esCritico = true;
                                badgeStyle = 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400 dark:border-red-500/20 animate-pulse';
                              } else if (dias < 15) {
                                badgeStyle = 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
                              } else {
                                badgeStyle = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400';
                              }
                            }

                            return (
                              <TableRow key={idx} className="border-b border-border/50 hover:bg-muted/10 text-xs text-foreground">
                                <TableCell className="font-extrabold py-3.5 pl-4 whitespace-nowrap">{item.nombre}</TableCell>
                                <TableCell className="text-right py-3.5 font-bold">
                                  <div className="flex flex-col items-end">
                                    <span>{unidad === 'kg' ? item.cantidad : Math.round(item.cantidad)} {unidad}</span>
                                    {cantCaja && cantCaja > 1 && (
                                      <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                        {((item.cantidad / cantCaja) % 1 === 0 ? (item.cantidad / cantCaja) : (item.cantidad / cantCaja).toFixed(1))} {empaqueLabel}(s) de {unidad === 'kg' ? (cantCaja % 1 === 0 ? cantCaja : cantCaja.toFixed(2)) : Math.round(cantCaja)} {unidad}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-3.5 font-mono">{formatCLPCurrency(item.costo_unitario)}</TableCell>
                                <TableCell className="text-right py-3.5 font-mono font-bold">{unidad === 'kg' ? stockActual.toFixed(2) : Math.round(stockActual)}</TableCell>
                                <TableCell className="text-right py-3.5 text-muted-foreground">{velVenta > 0 ? `${unidad === 'kg' ? velVenta.toFixed(2) : Math.round(velVenta)}/día` : '-'}</TableCell>
                                <TableCell className="text-right py-3.5 pr-4">
                                  <div className="flex justify-end">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide border ${badgeStyle}`}>
                                      {esCritico && <AlertCircle className="h-3 w-3" />}
                                      {diasStock}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(!selectedFactura.productos || selectedFactura.productos.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs font-semibold">
                                No se encontraron productos registrados en este comprobante.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-end shrink-0 bg-muted/20 dark:bg-muted/10">
                <Button
                  onClick={() => setFacturaDetalleOpen(false)}
                  className="rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs px-4 h-9 border border-border/50 transition-all duration-200"
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DECLARAR CAPITAL INICIAL DIALOG */}
      <Dialog open={capitalOpen} onOpenChange={setCapitalOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[500px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-500" />
              Declarar Fondos / Operación
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {capitalTipo === 'capital' 
                ? 'Ingresa el monto de dinero disponible para iniciar operaciones. Se creará un asiento contable que cargará el dinero en tus cuentas de activo y acreditará Capital Inicial.'
                : 'Ingresa el monto de utilidades acumuladas que deseas declarar como fondos para operar. Se cargará el dinero en tus cuentas de activo y acreditará Utilidades Acumuladas.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCapitalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="capital_tipo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Fondos</Label>
              <select
                id="capital_tipo"
                value={capitalTipo}
                onChange={(e) => {
                  const val = e.target.value as 'capital' | 'utilidades';
                  setCapitalTipo(val);
                  if (val === 'capital') {
                    setCapitalGlosa('Aporte de Capital Inicial');
                  } else {
                    setCapitalGlosa('Registro de Utilidades Acumuladas');
                  }
                }}
                className="w-full bg-card border border-border text-foreground px-3 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="capital">Aporte de Capital Inicial (Cuenta 3.1.01)</option>
                <option value="utilidades">Utilidades Acumuladas / Históricas (Cuenta 3.1.02)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capital_glosa" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Concepto / Glosa</Label>
              <Input
                id="capital_glosa"
                value={capitalGlosa}
                onChange={(e) => setCapitalGlosa(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capital_destino" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Destino del Dinero</Label>
              <select
                id="capital_destino"
                value={capitalDestino}
                onChange={(e) => setCapitalDestino(e.target.value as any)}
                className="w-full bg-card border border-border text-foreground px-3 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="caja">Todo en Caja (Efectivo local)</option>
                <option value="banco">Todo en Banco (Cuenta bancaria / Digital)</option>
                <option value="mixto">Dividido (Mixto)</option>
              </select>
            </div>

            {capitalDestino !== 'mixto' ? (
              <div className="space-y-1.5">
                <Label htmlFor="capital_monto" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto Total ($)</Label>
                <Input
                  id="capital_monto"
                  inputMode="numeric"
                  placeholder="Ej: $1.500.000"
                  value={capitalMonto}
                  onChange={(e) => setCapitalMonto(e.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={() => { const v = parseChileanMoneyInput(capitalMonto); setCapitalMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                  className="h-9 text-xs"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="capital_monto_caja" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto en Caja ($)</Label>
                  <Input
                    id="capital_monto_caja"
                    inputMode="numeric"
                    placeholder="Ej: $500.000"
                    value={capitalMontoCaja}
                    onChange={(e) => setCapitalMontoCaja(e.target.value.replace(/[^\d.]/g, ''))}
                    onBlur={() => { const v = parseChileanMoneyInput(capitalMontoCaja); setCapitalMontoCaja(v > 0 ? formatCLPCurrency(v) : ''); }}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capital_monto_banco" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto en Banco ($)</Label>
                  <Input
                    id="capital_monto_banco"
                    inputMode="numeric"
                    placeholder="Ej: $1.000.000"
                    value={capitalMontoBanco}
                    onChange={(e) => setCapitalMontoBanco(e.target.value.replace(/[^\d.]/g, ''))}
                    onBlur={() => { const v = parseChileanMoneyInput(capitalMontoBanco); setCapitalMontoBanco(v > 0 ? formatCLPCurrency(v) : ''); }}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCapitalOpen(false)}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardandoCapital}
                className="rounded-xl text-xs font-bold h-10 px-5 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {guardandoCapital ? 'Registrando...' : capitalTipo === 'capital' ? 'Registrar Capital' : 'Registrar Utilidades'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ContabilidadPage />
    </ProtectedRoute>
  );
}

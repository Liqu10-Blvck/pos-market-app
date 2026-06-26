import { create } from 'zustand';
import { collection, doc, writeBatch, Timestamp, getDocs, query, orderBy, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Producto, ConsultaIALog, RegistroPrecioMayorista } from '@/lib/types/pos';
import { CostosService } from '@/lib/services/costos.service';
import { AIService } from '@/lib/services/ai.service';
import { formatCLPCurrency } from '@/lib/utils';

interface CostosState {
  activeTab: 'precios' | 'vencimientos' | 'mayoristas';
  filtroBusqueda: string;
  nuevosCostos: Record<string, string>;
  margenesDeseados: Record<string, string>;
  guardandoProductoId: string | null;
  guardandoTodo: boolean;
  aplicandoTodo: boolean;
  aiContexto: string;
  marketingProductId: string;
  aiRespuesta: string | null;
  aiCargando: boolean;
  aiRespuestaVencidos: string | null;
  aiCargandoVencidos: boolean;
  chatLogs: ConsultaIALog[];

  // Mayoristas State
  mayoristasMatchedProducts: Array<{
    id: string;
    nombre: string;
    calidad?: string;
    costo_local: number;
    costo_catalogo?: number;
    precio_venta_local: number;
    es_interes: boolean;
    precio_referencia: number;
    precio_referencia_full?: number;
    unidad_comercializacion?: string;
    unidad?: 'kg' | 'unid';
    tipo_empaque?: string;
    cantidad_por_caja?: number;
    noExisteEnCatalogo?: boolean;
  }>;
  mayoristasAiRecomendaciones: string | null;
  mayoristasAiCargando: boolean;
  mayoristasCargando: boolean;
  mayoristasHistorial: RegistroPrecioMayorista[];

  // Basic Actions
  setActiveTab: (tab: 'precios' | 'vencimientos' | 'mayoristas') => void;
  setFiltroBusqueda: (search: string) => void;
  setNuevoCosto: (productId: string, val: string) => void;
  setMargenDeseado: (productId: string, val: string) => void;
  setAiContexto: (val: string) => void;
  setMarketingProductId: (val: string) => void;
  setAiRespuesta: (val: string | null) => void;
  setAiRespuestaVencidos: (val: string | null) => void;
  inicializarInputs: (productos: Producto[]) => void;
  cargarHistorialIA: (productId: string) => Promise<void>;

  // Operations
  handleGuardarProducto: (p: Producto, toast: any) => Promise<void>;
  handleGuardarTodo: (productos: Producto[], esDiferente: (p: Producto) => boolean, toast: any) => Promise<void>;
  handleAplicarSugerido: (p: Producto, sugerido: number, toast: any) => Promise<void>;
  handleAplicarTodoSugerido: (
    productos: Producto[],
    calcularPrecioSugerido: (pid: string, costo?: number) => number,
    toast: any
  ) => Promise<void>;
  handleGenerarMarketingIA: (productos: Producto[], overridePregunta: string | undefined, toast: any) => Promise<void>;
  handleGenerarLiquidacionVencimientos: (
    productosConVencimiento: Producto[],
    obtenerDiasParaVencer: (fechaCaducidad: string) => number,
    toast: any
  ) => Promise<void>;

  // Mayoristas Operations
  procesarArchivoMayoristas: (csvText: string, catalogProducts: Producto[]) => void;
  updateMatchedProductCost: (productId: string, newCost: number) => void;
  registrarPreciosMayoristas: (toast: any) => Promise<void>;
  toggleProductoInteres: (productId: string, currentVal: boolean, toast: any) => Promise<void>;
  generarRecomendacionesPreciosIA: (toast: any) => Promise<void>;
  cargarHistorialPreciosMayoristas: () => Promise<void>;
  setMayoristasMatchedProducts: (products: any[]) => void;
}

export const useCostosStore = create<CostosState>((set, get) => ({
  activeTab: 'precios',
  filtroBusqueda: '',
  nuevosCostos: {},
  margenesDeseados: {},
  guardandoProductoId: null,
  guardandoTodo: false,
  aplicandoTodo: false,
  aiContexto: '',
  marketingProductId: 'todos',
  aiRespuesta: null,
  aiCargando: false,
  aiRespuestaVencidos: null,
  aiCargandoVencidos: false,
  chatLogs: [],

  // Mayoristas initial state
  mayoristasMatchedProducts: [],
  mayoristasAiRecomendaciones: null,
  mayoristasAiCargando: false,
  mayoristasCargando: false,
  mayoristasHistorial: [],

  setMayoristasMatchedProducts: (mayoristasMatchedProducts) => set({ mayoristasMatchedProducts }),

  setActiveTab: (activeTab) => set({ activeTab }),
  setFiltroBusqueda: (filtroBusqueda) => set({ filtroBusqueda }),
  setNuevoCosto: (productId, val) => 
    set((state) => ({ nuevosCostos: { ...state.nuevosCostos, [productId]: val } })),
  setMargenDeseado: (productId, val) => 
    set((state) => ({ margenesDeseados: { ...state.margenesDeseados, [productId]: val } })),
  setAiContexto: (aiContexto) => set({ aiContexto }),
  setMarketingProductId: (marketingProductId) => set({ marketingProductId }),
  setAiRespuesta: (aiRespuesta) => set({ aiRespuesta }),
  setAiRespuestaVencidos: (aiRespuestaVencidos) => set({ aiRespuestaVencidos }),

  inicializarInputs: (productos) => {
    const { nuevosCostos, margenesDeseados } = get();
    const initialCostos: Record<string, string> = { ...nuevosCostos };
    const initialMargenes: Record<string, string> = { ...margenesDeseados };
    let hasChanges = false;

    productos.forEach((p) => {
      if (initialCostos[p.id] === undefined) {
        initialCostos[p.id] = p.costo_actual ? p.costo_actual.toString() : '';
        hasChanges = true;
      }
      if (initialMargenes[p.id] === undefined) {
        initialMargenes[p.id] = p.margen_deseado ? p.margen_deseado.toString() : '30';
        hasChanges = true;
      }
    });

    if (hasChanges) {
      set({ nuevosCostos: initialCostos, margenesDeseados: initialMargenes });
    }
  },

  cargarHistorialIA: async (productId) => {
    try {
      const prodId = productId === 'todos' ? undefined : productId;
      const history = await AIService.obtenerHistorial('marketing', prodId, 10);
      set({ chatLogs: history });
    } catch (err) {
      console.error('Error al cargar historial de marketing IA:', err);
    }
  },

  handleGuardarProducto: async (p, toast) => {
    const { nuevosCostos, margenesDeseados } = get();
    const costoStr = nuevosCostos[p.id];
    const margenStr = margenesDeseados[p.id] || '30';

    if (!costoStr || isNaN(parseFloat(costoStr)) || parseFloat(costoStr) < 0) {
      toast({
        title: 'Costo inválido',
        description: `El costo para ${p.nombre} debe ser un número mayor o igual a 0.`,
        variant: 'destructive',
      });
      return;
    }

    const costoVal = parseFloat(costoStr);
    const margenVal = parseFloat(margenStr) || 0;

    set({ guardandoProductoId: p.id });
    try {
      await CostosService.registrarCostoDiario(p.id, p.nombre, costoVal, margenVal);
      toast({
        title: 'Guardado',
        description: `Costo y margen para ${p.nombre} actualizados con éxito.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      set({ guardandoProductoId: null });
    }
  },

  handleGuardarTodo: async (productos, esDiferente, toast) => {
    const { nuevosCostos, margenesDeseados } = get();
    const modificados = productos.filter(esDiferente);
    if (modificados.length === 0) {
      toast({
        title: 'Sin cambios',
        description: 'No hay costos ni márgenes modificados para guardar.',
      });
      return;
    }

    set({ guardandoTodo: true });
    try {
      const batch = writeBatch(db);
      
      for (const p of modificados) {
        const costoVal = parseFloat(nuevosCostos[p.id]) || 0;
        const margenVal = parseFloat(margenesDeseados[p.id]) || 0;

        // Log daily cost
        const costoRef = doc(collection(db, 'costos_diarios'));
        batch.set(costoRef, {
          producto_id: p.id,
          nombre: p.nombre,
          costo: costoVal,
          fecha: Timestamp.now(),
          createdAt: Timestamp.now()
        });

        // Also register in registro_precios_mayoristas to log cost variation
        const mayoristaLogRef = doc(collection(db, 'registro_precios_mayoristas'));
        batch.set(mayoristaLogRef, {
          fecha: Timestamp.now(),
          producto_id: p.id,
          nombre: p.nombre,
          costo_local: costoVal,
          precio_venta_local: p.precio || 0,
          precio_referencia: costoVal
        });

        // Update product
        const productoRef = doc(db, 'productos', p.id);
        batch.update(productoRef, {
          costo_actual: costoVal,
          margen_deseado: margenVal,
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
      toast({
        title: 'Éxito',
        description: `Se guardaron los costos y márgenes de ${modificados.length} productos.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los costos.',
        variant: 'destructive',
      });
    } finally {
      set({ guardandoTodo: false });
    }
  },

  handleAplicarSugerido: async (p, sugerido, toast) => {
    if (sugerido <= 0) {
      toast({
        title: 'Precio sugerido inválido',
        description: 'Asegúrate de ingresar un costo primero.',
        variant: 'destructive',
      });
      return;
    }

    const { margenesDeseados } = get();
    const margenVal = parseFloat(margenesDeseados[p.id]) || 0;

    try {
      await CostosService.actualizarPrecioVenta(p.id, sugerido, margenVal);
      toast({
        title: 'Precio aplicado',
        description: `Nuevo precio de venta para ${p.nombre} establecido en ${formatCLPCurrency(sugerido)}.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo aplicar el precio de venta.',
        variant: 'destructive',
      });
    }
  },

  handleAplicarTodoSugerido: async (productos, calcularPrecioSugerido, toast) => {
    const { margenesDeseados } = get();
    const productosConSugerencia = productos.filter((p) => {
      const sugerido = calcularPrecioSugerido(p.id, p.costo_actual);
      return sugerido > 0 && sugerido !== p.precio;
    });

    if (productosConSugerencia.length === 0) {
      toast({
        title: 'Precios ya al día',
        description: 'Todos los precios actuales coinciden con los precios sugeridos.',
      });
      return;
    }

    set({ aplicandoTodo: true });
    try {
      const batch = writeBatch(db);

      productosConSugerencia.forEach((p) => {
        const sugerido = calcularPrecioSugerido(p.id, p.costo_actual);
        const margenVal = parseFloat(margenesDeseados[p.id]) || 30;
        const productoRef = doc(db, 'productos', p.id);
        
        batch.update(productoRef, {
          precio: sugerido,
          margen_deseado: margenVal,
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      toast({
        title: 'Éxito',
        description: `Se actualizaron los precios de venta para ${productosConSugerencia.length} productos.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudieron aplicar los precios sugeridos.',
        variant: 'destructive',
      });
    } finally {
      set({ aplicandoTodo: false });
    }
  },

  handleGenerarMarketingIA: async (productos, overridePregunta, toast) => {
    const { marketingProductId, aiContexto, chatLogs, nuevosCostos, margenesDeseados } = get();
    set({ aiCargando: true, aiRespuesta: null });

    const preguntaFinal = (overridePregunta || aiContexto || '').trim();

    let filteredProductos = productos;
    if (marketingProductId !== 'todos') {
      filteredProductos = productos.filter((p) => p.id === marketingProductId);
    }

    const payloadProductos = filteredProductos.map((p) => ({
      nombre: p.nombre,
      stock_actual: p.stock_actual,
      unidad: p.unidad,
      precio: p.precio,
      costo_actual: nuevosCostos[p.id] ? parseFloat(nuevosCostos[p.id]) : (p.costo_actual || 0),
      margen_deseado: margenesDeseados[p.id] ? parseFloat(margenesDeseados[p.id]) : (p.margen_deseado || 30)
    }));

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productos: payloadProductos,
          contexto: preguntaFinal,
          productoEspecifico: marketingProductId !== 'todos',
          historial: chatLogs.map((log) => ({ pregunta: log.pregunta, respuesta: log.respuesta }))
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      set({ aiRespuesta: data.sugerencias });

      // Persist the query in Firestore
      await AIService.registrarConsulta({
        tipo_asistente: 'marketing',
        pregunta: preguntaFinal || (marketingProductId !== 'todos' ? `Análisis de marketing para ${productos.find((p) => p.id === marketingProductId)?.nombre}` : 'Análisis general de catálogo'),
        respuesta: data.sugerencias,
        productos_vinculados: marketingProductId !== 'todos' ? [marketingProductId] : []
      });

      // Clear input
      set({ aiContexto: '' });

      // Reload chat logs
      await get().cargarHistorialIA(marketingProductId);

      toast({
        title: 'Recomendaciones listas',
        description: 'Gemini ha terminado de analizar tu negocio.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo obtener sugerencia de Gemini.',
        variant: 'destructive',
      });
    } finally {
      set({ aiCargando: false });
    }
  },

  handleGenerarLiquidacionVencimientos: async (productosConVencimiento, obtenerDiasParaVencer, toast) => {
    const vencidosONear = productosConVencimiento.filter((p) => {
      const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
      return dias <= 30;
    });

    if (vencidosONear.length === 0) {
      toast({
        title: 'Todo al día',
        description: 'No tienes productos vencidos o próximos a vencer en los próximos 30 días.',
      });
      return;
    }

    set({ aiCargandoVencidos: true, aiRespuestaVencidos: null });

    const promptContext = `
A continuación tienes la lista de productos de abarrotes de mi negocio que se encuentran ya VENCIDOS o PRÓXIMOS A VENCER (en menos de 30 días), con sus niveles de inventario en stock, costos y precios actuales.

Por favor, como asesor de marketing experto de POS, recomiéndame:
1. Ideas de combos o packs promocionales atractivos (cross-selling) para liquidar estos abarrotes rápidamente hoy mismo.
2. Descuentos porcentuales específicos recomendados en base a su cercanía de vencimiento y margen de ganancia.
3. Carteles de ofertas creativos y mensajes persuasivos para los clientes que visitan el local.
4. Estrategia de prevención para el futuro.

Lista de productos en riesgo:
${vencidosONear.map((p) => {
  const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
  const estadoText = dias < 0 ? 'VENCIDO' : `${dias} días para vencer`;
  return `- **${p.nombre}**:
    * SKU: ${p.sku || 'Sin SKU'}
    * Stock actual: ${p.stock_actual} ${p.unidad}
    * Precio actual: ${formatCLPCurrency(p.precio)}
    * Costo actual: ${p.costo_actual ? formatCLPCurrency(p.costo_actual) : 'Sin registrar'}
    * Estado: ${estadoText} (Fecha: ${p.fecha_caducidad})
  `;
}).join('\n')}
`;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productos: [], 
          contexto: promptContext
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      set({ aiRespuestaVencidos: data.sugerencias });

      // Persist in Firestore
      await AIService.registrarConsulta({
        tipo_asistente: 'marketing',
        pregunta: 'Generar plan de liquidación para productos vencidos o próximos a vencer',
        respuesta: data.sugerencias,
        productos_vinculados: vencidosONear.map((p) => p.id)
      });

      toast({
        title: 'Plan de liquidación listo',
        description: 'Gemini ha elaborado las ofertas de liquidación.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo generar el plan de liquidación.',
        variant: 'destructive',
      });
    } finally {
      set({ aiCargandoVencidos: false });
    }
  },

  procesarArchivoMayoristas: (csvText, catalogProducts) => {
    set({ mayoristasCargando: true, mayoristasMatchedProducts: [], mayoristasAiRecomendaciones: null });
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error("El archivo CSV está vacío o no contiene suficientes filas.");
      }

      const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        const separator = line.includes(';') ? ';' : ',';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
      
      let prodIdx = headers.findIndex(h => h.includes('producto') || h.includes('nombre') || h.includes('item') || h.includes('glosa') || h.includes('especie'));
      let priceIdx = headers.findIndex(h => h.includes('promedio') || h.includes('medio') || h.includes('precio') || h.includes('valor') || h.includes('ponderado'));
      let unitIdx = headers.findIndex(h => h.includes('unidad') || h.includes('comercializacion') || h.includes('envase'));
      let varietyIdx = headers.findIndex(h => h.includes('variedad') || h.includes('tipo'));

      if (prodIdx === -1) prodIdx = 0;
      if (priceIdx === -1) priceIdx = headers.length > 1 ? 6 : 0;
      if (unitIdx === -1) unitIdx = headers.length > 1 ? 7 : 0;
      if (varietyIdx === -1) varietyIdx = 1;

      const mayoristaMap: Record<string, { precioRefFull: number; unidadCom: string; precioRefUnit: number }> = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= Math.max(prodIdx, priceIdx)) continue;
        
        const prodName = cols[prodIdx];
        const varietyName = varietyIdx !== -1 && cols[varietyIdx] ? cols[varietyIdx] : '';
        const priceStr = cols[priceIdx];
        const unitCom = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : '';
        
        if (!prodName || !priceStr) continue;

        const priceClean = priceStr.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const priceVal = parseFloat(priceClean);
        
        if (isNaN(priceVal)) continue;

        let divisor = 1;
        const unitLower = unitCom.toLowerCase();
        
        if (unitLower.includes('docena')) {
          divisor = 12;
        } else {
          const matchKilos = unitLower.match(/(\d+)\s*(kilo|kg|unidad|unid|atado|matas|unidades)/);
          if (matchKilos) {
            divisor = parseInt(matchKilos[1]) || 1;
          }
        }

        const priceUnit = priceVal / divisor;
        const cleanProdKey = prodName.toLowerCase().replace(/[\s_.-]/g, '');
        const cleanVarietyKey = varietyName.toLowerCase().replace(/[\s_.-]/g, '');
        
        mayoristaMap[cleanProdKey + cleanVarietyKey] = {
          precioRefFull: priceVal,
          unidadCom: unitCom,
          precioRefUnit: priceUnit
        };
        
        if (!mayoristaMap[cleanProdKey]) {
          mayoristaMap[cleanProdKey] = {
            precioRefFull: priceVal,
            unidadCom: unitCom,
            precioRefUnit: priceUnit
          };
        }
      }

      const matched = catalogProducts.map(p => {
        const cleanName = p.nombre.toLowerCase().replace(/[\s_.-]/g, '');
        let matchData = mayoristaMap[cleanName];
        
        if (!matchData) {
          const keyMatch = Object.keys(mayoristaMap).find(k => k.includes(cleanName) || cleanName.includes(k));
          if (keyMatch) {
            matchData = mayoristaMap[keyMatch];
          }
        }

        if (!matchData) return null;

        return {
          id: p.id,
          nombre: p.nombre,
          costo_local: p.costo_actual || 0,
          costo_catalogo: p.costo_actual || 0,
          precio_venta_local: p.precio,
          es_interes: !!p.es_interes,
          precio_referencia: Math.round(matchData.precioRefUnit),
          precio_referencia_full: matchData.precioRefFull,
          unidad_comercializacion: matchData.unidadCom
        };
      }).filter(item => item !== null) as any[];

      set({ mayoristasMatchedProducts: matched });
    } catch (error: any) {
      console.error("Error al procesar archivo mayoristas:", error);
    } finally {
      set({ mayoristasCargando: false });
    }
  },

  updateMatchedProductCost: (productId, newCost) => {
    set((state) => ({
      mayoristasMatchedProducts: state.mayoristasMatchedProducts.map(p => 
        p.id === productId ? { ...p, costo_local: newCost } : p
      )
    }));
  },

  registrarPreciosMayoristas: async (toast) => {
    const { mayoristasMatchedProducts } = get();
    if (mayoristasMatchedProducts.length === 0) return;
    
    set({ guardandoTodo: true });
    try {
      const batch = writeBatch(db);
      const historyCol = collection(db, 'registro_precios_mayoristas');
      
      mayoristasMatchedProducts.forEach(item => {
        const isNew = !!item.noExisteEnCatalogo;
        const prodRef = doc(db, 'productos', item.id);
        const refPriceUnit = item.precio_referencia;
        const fallbackSalesPrice = Math.round(refPriceUnit * 1.3); // default 30% margin
        
        if (isNew) {
          // Create the product in the catalog
          batch.set(prodRef, {
            nombre: item.nombre,
            precio: item.precio_venta_local || fallbackSalesPrice,
            unidad: item.unidad || 'kg',
            stock_actual: 0,
            activo: true,
            costo_actual: item.costo_local || refPriceUnit,
            margen_deseado: 30,
            es_interes: !!item.es_interes,
            tipo_empaque: item.tipo_empaque || 'Unidad',
            cantidad_por_caja: item.cantidad_por_caja || 1,
            calidad: item.calidad || null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        } else {
          // Update existing product
          batch.update(prodRef, {
            costo_actual: item.costo_local,
            updatedAt: Timestamp.now()
          });
        }

        const logRef = doc(historyCol);
        batch.set(logRef, {
          fecha: Timestamp.now(),
          producto_id: item.id,
          nombre: item.nombre,
          costo_local: item.costo_local || refPriceUnit,
          precio_venta_local: item.precio_venta_local || fallbackSalesPrice,
          precio_referencia: refPriceUnit
        });
      });
      
      await batch.commit();
      
      // Update local state to clear the new status since they are now in the catalog
      set(state => ({
        mayoristasMatchedProducts: state.mayoristasMatchedProducts.map(p => ({
          ...p,
          noExisteEnCatalogo: false
        }))
      }));
      
      toast({
        title: 'Precios registrados',
        description: 'Se guardaron los nuevos productos en el catálogo y se archivaron los precios históricos.',
      });
      
      await get().cargarHistorialPreciosMayoristas();
    } catch (error: any) {
      console.error("Error al registrar precios mayoristas:", error);
      toast({
        title: 'Error',
        description: 'No se pudieron registrar los precios.',
        variant: 'destructive'
      });
    } finally {
      set({ guardandoTodo: false });
    }
  },

  toggleProductoInteres: async (productId, currentVal, toast) => {
    try {
      const matchedProd = get().mayoristasMatchedProducts.find(p => p.id === productId);
      if (matchedProd && matchedProd.noExisteEnCatalogo) {
        set((state) => ({
          mayoristasMatchedProducts: state.mayoristasMatchedProducts.map(p => 
            p.id === productId ? { ...p, es_interes: !currentVal } : p
          )
        }));
        toast({
          title: !currentVal ? 'Agregado a la Lista de Compra' : 'Removido de la Lista de Compra',
          description: 'Preferencia de compra actualizada localmente.',
        });
        return;
      }

      const prodRef = doc(db, 'productos', productId);
      await updateDoc(prodRef, {
        es_interes: !currentVal,
        updatedAt: Timestamp.now()
      });
      
      set((state) => ({
        mayoristasMatchedProducts: state.mayoristasMatchedProducts.map(p => 
          p.id === productId ? { ...p, es_interes: !currentVal } : p
        )
      }));
      
      toast({
        title: !currentVal ? 'Agregado a la Lista de Compra' : 'Removido de la Lista de Compra',
        description: 'Preferencia de compra actualizada.',
      });
    } catch (error: any) {
      console.error("Error al cambiar preferencia de compra:", error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la Lista de Compra.',
        variant: 'destructive'
      });
    }
  },

  generarRecomendacionesPreciosIA: async (toast) => {
    const { mayoristasMatchedProducts } = get();
    if (mayoristasMatchedProducts.length === 0) return;

    set({ mayoristasAiCargando: true, mayoristasAiRecomendaciones: null });
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/mayoristas-ai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productos: mayoristasMatchedProducts }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      set({ mayoristasAiRecomendaciones: data.recomendaciones });
      
      toast({
        title: 'Análisis listo',
        description: 'La IA ha generado las recomendaciones estratégicas.',
      });
    } catch (error: any) {
      console.error("Error al obtener recomendaciones de precios IA:", error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudieron obtener las recomendaciones.',
        variant: 'destructive',
      });
    } finally {
      set({ mayoristasAiCargando: false });
    }
  },

  cargarHistorialPreciosMayoristas: async () => {
    try {
      const q = query(
        collection(db, 'registro_precios_mayoristas'),
        orderBy('fecha', 'desc')
      );
      const snap = await getDocs(q);
      let list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RegistroPrecioMayorista));

      // Auto-backfill past purchases that don't have trend logs
      const comprasSnap = await getDocs(collection(db, 'compras'));
      const batch = writeBatch(db);
      let needsCommit = false;

      comprasSnap.docs.forEach(docSnap => {
        const compra = docSnap.data();
        const fecha = compra.fecha;
        if (!fecha || !compra.productos) return;

        compra.productos.forEach((p: any) => {
          // Check if this purchase is already logged in 'registro_precios_mayoristas'
          const exists = list.some(log => {
            const sameProduct = log.producto_id === p.producto_id;
            const sameCost = log.costo_local === p.costo_unitario;
            
            const logTime = log.fecha?.toDate ? log.fecha.toDate().getTime() : new Date(log.fecha as any).getTime();
            const compTime = fecha.toDate ? fecha.toDate().getTime() : new Date(fecha).getTime();
            const sameTime = Math.abs(logTime - compTime) < 5 * 60 * 1000; // within 5 minutes

            return sameProduct && sameCost && sameTime;
          });

          if (!exists) {
            console.log(`Backfilling price log for ${p.nombre} from purchase N° ${compra.numero_documento}`);
            const logRef = doc(collection(db, 'registro_precios_mayoristas'));
            const newLog = {
              fecha: fecha,
              producto_id: p.producto_id,
              nombre: p.nombre,
              costo_local: p.costo_unitario,
              precio_venta_local: p.precio_venta || 0,
              precio_referencia: p.costo_unitario
            };
            batch.set(logRef, newLog);
            list.push(newLog as any); // add to local list to avoid duplicates
            needsCommit = true;
          }
        });
      });

      if (needsCommit) {
        await batch.commit();
        // Re-sort list by date descending
        list.sort((a, b) => {
          const tA = a.fecha?.toDate ? a.fecha.toDate().getTime() : new Date(a.fecha as any).getTime();
          const tB = b.fecha?.toDate ? b.fecha.toDate().getTime() : new Date(b.fecha as any).getTime();
          return tB - tA;
        });
      }

      set({ mayoristasHistorial: list });
    } catch (error) {
      console.error("Error al cargar historial mayorista:", error);
    }
  }
}));

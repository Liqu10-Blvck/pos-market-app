import { 
  collection, 
  doc, 
  Timestamp, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  runTransaction,
  writeBatch,
  Transaction,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
import { CuentaContable, AsientoContable, FacturaCompra, MovimientoContable, TipoDocumentoCompra } from '../types/contabilidad';
import { Producto, ItemVenta } from '../types/pos';

export class ContabilidadService {
  private static readonly COLLECTION_CUENTAS = 'cuentas';
  private static readonly COLLECTION_ASIENTOS = 'asientos';
  private static readonly COLLECTION_COMPRAS = 'compras';
  private static readonly COLLECTION_PRODUCTOS = 'productos';
  private static readonly COLLECTION_COSTOS = 'costos_diarios';

  // Static pre-defined Chart of Accounts
  public static readonly PLAN_CUENTAS: CuentaContable[] = [
    { codigo: '1.1.01', nombre: 'Caja', tipo: 'activo', descripcion: 'Efectivo disponible en el local' },
    { codigo: '1.1.02', nombre: 'Banco', tipo: 'activo', descripcion: 'Fondos en cuenta bancaria y transacciones electrónicas/tarjetas' },
    { codigo: '1.1.03', nombre: 'Mercaderías', tipo: 'activo', descripcion: 'Inventario de productos para la venta' },
    { codigo: '1.1.04', nombre: 'Clientes', tipo: 'activo', descripcion: 'Cuentas por cobrar (ventas al fiado)' },
    { codigo: '1.1.05', nombre: 'IVA Crédito Fiscal', tipo: 'activo', descripcion: 'Impuesto pagado en compras con factura (19% IVA)' },
    { codigo: '2.1.01', nombre: 'IVA Débito Fiscal', tipo: 'pasivo', descripcion: 'Impuesto cobrado en ventas (19% IVA)' },
    { codigo: '2.1.02', nombre: 'Proveedores', tipo: 'pasivo', descripcion: 'Cuentas por pagar a proveedores mayoristas' },
    { codigo: '3.1.01', nombre: 'Capital Inicial', tipo: 'patrimonio', descripcion: 'Aporte de capital de los dueños' },
    { codigo: '3.1.02', nombre: 'Utilidades Acumuladas', tipo: 'patrimonio', descripcion: 'Utilidades retenidas o aportadas de ejercicios anteriores' },
    { codigo: '4.1.01', nombre: 'Ventas', tipo: 'ingreso', descripcion: 'Ingreso neto obtenido por venta de mercaderías' },
    { codigo: '5.1.01', nombre: 'Costo de Ventas', tipo: 'egreso', descripcion: 'Costo mayorista de las mercaderías vendidas' },
    { codigo: '5.1.02', nombre: 'Gastos Generales', tipo: 'egreso', descripcion: 'Gastos operativos (luz, arriendo, insumos, sueldos, mermas)' }
  ];

  /**
   * Seeds the Chart of Accounts in Firestore if it doesn't exist.
   */
  static async inicializarPlanCuentas(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, this.COLLECTION_CUENTAS));
      const existingCodigos = new Set(snap.docs.map(doc => doc.id));
      
      const batch = writeBatch(db);
      let updatesNeeded = false;
      
      this.PLAN_CUENTAS.forEach(cuenta => {
        if (!existingCodigos.has(cuenta.codigo)) {
          console.log(`Sembrando cuenta faltante: ${cuenta.nombre} (${cuenta.codigo})`);
          const ref = doc(db, this.COLLECTION_CUENTAS, cuenta.codigo);
          batch.set(ref, cuenta);
          updatesNeeded = true;
        }
      });
      
      if (updatesNeeded) {
        await batch.commit();
      }
    } catch (err) {
      console.error('Error al inicializar plan de cuentas:', err);
    }
  }

  /**
   * Retrieves the Chart of Accounts.
   */
  static async obtenerCuentas(): Promise<CuentaContable[]> {
    await this.inicializarPlanCuentas();
    const snap = await getDocs(collection(db, this.COLLECTION_CUENTAS));
    return snap.docs.map(doc => doc.data() as CuentaContable).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  /**
   * Helper to register a journal entry inside an active transaction.
   * NOTE: Any read of metadata must be done prior to this call in the parent transaction.
   */
  static registrarAsientoEnTransaccion(
    transaction: Transaction,
    metadataRef: DocumentReference,
    ultimoAsiento: number,
    glosa: string,
    tipo: AsientoContable['tipo'],
    movimientos: MovimientoContable[],
    referenciaId?: string
  ): number {
    // Validate double entry
    const totalDebe = movimientos.reduce((sum, m) => sum + m.debe, 0);
    const totalHaber = movimientos.reduce((sum, m) => sum + m.haber, 0);

    if (Math.abs(totalDebe - totalHaber) > 0.05) {
      throw new Error(`Asiento contable desbalanceado. Debe: ${totalDebe}, Haber: ${totalHaber}`);
    }

    const nuevoNumero = ultimoAsiento + 1;
    const asientoRef = doc(collection(db, this.COLLECTION_ASIENTOS));

    const asientoData = {
      numero_asiento: nuevoNumero,
      fecha: Timestamp.now(),
      glosa,
      tipo,
      movimientos,
      createdAt: Timestamp.now(),
      ...(referenciaId ? { referencia_id: referenciaId } : {})
    };

    transaction.set(asientoRef, asientoData);
    transaction.set(metadataRef, { ultimo_numero_asiento: nuevoNumero }, { merge: true });

    return nuevoNumero;
  }

  /**
   * Registers a journal entry starting its own transaction.
   */
  static async registrarAsientoManual(
    glosa: string,
    tipo: AsientoContable['tipo'],
    movimientos: MovimientoContable[],
    referenciaId?: string
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      const metadataRef = doc(db, 'metadata', 'contabilidad');
      const metadataSnap = await transaction.get(metadataRef);
      
      let ultimoNumero = 0;
      if (metadataSnap.exists()) {
        ultimoNumero = metadataSnap.data().ultimo_numero_asiento || 0;
      }

      this.registrarAsientoEnTransaccion(
        transaction,
        metadataRef,
        ultimoNumero,
        glosa,
        tipo,
        movimientos,
        referenciaId
      );

      return 'ok';
    });
  }

  /**
   * Records a Purchase (formal or informal document), updates product stocks, registers costing entries, and adds accounting journal entries.
   */
  static async registrarFacturaCompra(data: {
    tipoDocumento?: TipoDocumentoCompra;
    numeroDocumento?: string;
    numeroFactura: string;
    proveedorRut: string;
    proveedorNombre: string;
    fecha: Date;
    neto: number;
    iva: number;
    total: number;
    metodoPago: FacturaCompra['metodo_pago'];
    productos: {
      producto_id: string;
      nombre: string;
      cantidad: number;
      costo_unitario: number;
      precio_venta?: number;
      precio_caja?: number | null;
      margen_deseado?: number;
      cantidad_por_caja?: number;
      es_interes?: boolean;
    }[];
    imagenFacturaUrl?: string;
  }): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // 1. READ ALL FIRST
      const prodRefs = data.productos.map(p => doc(db, this.COLLECTION_PRODUCTOS, p.producto_id));
      const prodSnaps = await Promise.all(prodRefs.map(ref => transaction.get(ref)));

      // Read contabilidad metadata
      const metaRef = doc(db, 'metadata', 'contabilidad');
      const metaSnap = await transaction.get(metaRef);
      let ultimoAsiento = 0;
      if (metaSnap.exists()) {
        ultimoAsiento = metaSnap.data().ultimo_numero_asiento || 0;
      }

      // 2. WRITE ALL AFTER
      // Update stocks and costs for products, write costos_diarios log
      data.productos.forEach((p, idx) => {
        const snap = prodSnaps[idx];
        if (!snap.exists()) {
          throw new Error(`Producto ${p.nombre} no encontrado`);
        }
        const producto = snap.data() as Producto;
        const nuevoStock = (producto.stock_actual || 0) + p.cantidad;

        // Update product in DB
        const updateData: Partial<Producto> = {
          stock_actual: nuevoStock,
          costo_actual: p.costo_unitario,
          updatedAt: Timestamp.now()
        };

        if (p.es_interes === false || producto.es_interes) {
          updateData.es_interes = false;
          updateData.activo = true;
        }
        if (p.precio_venta !== undefined) updateData.precio = p.precio_venta;
        if (p.precio_caja !== undefined) updateData.precio_caja = p.precio_caja ?? undefined;
        if (p.margen_deseado !== undefined) updateData.margen_deseado = p.margen_deseado;
        if (p.cantidad_por_caja !== undefined) updateData.cantidad_por_caja = p.cantidad_por_caja;
        if (data.imagenFacturaUrl) updateData.imagen_factura_url = data.imagenFacturaUrl;

        transaction.update(prodRefs[idx], updateData);

        // Add costing log (costo_diario)
        const costoLogRef = doc(collection(db, this.COLLECTION_COSTOS));
        transaction.set(costoLogRef, {
          producto_id: p.producto_id,
          nombre: p.nombre,
          costo: p.costo_unitario,
          fecha: Timestamp.fromDate(data.fecha),
          createdAt: Timestamp.now()
        });

        // Also register in registro_precios_mayoristas to log cost variation
        const mayoristaLogRef = doc(collection(db, 'registro_precios_mayoristas'));
        transaction.set(mayoristaLogRef, {
          fecha: Timestamp.fromDate(data.fecha),
          producto_id: p.producto_id,
          nombre: p.nombre,
          costo_local: p.costo_unitario,
          precio_venta_local: p.precio_venta !== undefined ? p.precio_venta : (producto.precio || 0),
          precio_referencia: p.costo_unitario
        });
      });

      // Register the invoice itself
      const typeDoc = data.tipoDocumento || 'factura';
      const numDoc = data.numeroDocumento || data.numeroFactura;

      const facturaRef = doc(collection(db, this.COLLECTION_COMPRAS));
      const facturaData: Omit<FacturaCompra, 'id'> = {
        tipo_documento: typeDoc,
        numero_documento: numDoc,
        numero_factura: data.numeroFactura,
        proveedor_rut: data.proveedorRut,
        proveedor_nombre: data.proveedorNombre,
        fecha: Timestamp.fromDate(data.fecha),
        neto: data.neto,
        iva: data.iva,
        total: data.total,
        metodo_pago: data.metodoPago,
        productos: data.productos,
        ...(data.imagenFacturaUrl ? { imagen_factura_url: data.imagenFacturaUrl } : {}),
        createdAt: Timestamp.now()
      };
      transaction.set(facturaRef, facturaData);

      // Map account based on payment type
      let contraCuentaCodigo = '1.1.01'; // Caja default
      let contraCuentaNombre = 'Caja';
      if (data.metodoPago === 'transferencia') {
        contraCuentaCodigo = '1.1.02';
        contraCuentaNombre = 'Banco';
      } else if (data.metodoPago === 'credito') {
        contraCuentaCodigo = '2.1.02';
        contraCuentaNombre = 'Proveedores';
      }

      // Generate Purchase journal entries
      // Dynamic accounting based on document type
      const movimientos: MovimientoContable[] = [];
      const esFactura = typeDoc === 'factura';

      if (esFactura) {
        // If invoice, separate Mercaderías (net) and IVA Crédito
        movimientos.push(
          { cuenta_codigo: '1.1.03', cuenta_nombre: 'Mercaderías', debe: data.neto, haber: 0 },
          { cuenta_codigo: '1.1.05', cuenta_nombre: 'IVA Crédito Fiscal', debe: data.iva, haber: 0 }
        );
      } else {
        // If boleta, recibo, etc., charge everything to Mercaderías (no separate reclaimable tax credit)
        movimientos.push(
          { cuenta_codigo: '1.1.03', cuenta_nombre: 'Mercaderías', debe: data.total, haber: 0 }
        );
      }
      
      // Credit payment account
      movimientos.push(
        { cuenta_codigo: contraCuentaCodigo, cuenta_nombre: contraCuentaNombre, debe: 0, haber: data.total }
      );

      const docLabel = typeDoc === 'factura' ? 'Factura' : 
                       typeDoc === 'boleta' ? 'Boleta' : 
                       typeDoc === 'recibo' ? 'Recibo' : 
                       typeDoc === 'guia' ? 'Guía Despacho' : 'Comprobante';

      this.registrarAsientoEnTransaccion(
        transaction,
        metaRef,
        ultimoAsiento,
        `Compra ${docLabel} N° ${numDoc} - ${data.proveedorNombre}`,
        'compra',
        movimientos,
        facturaRef.id
      );

      return facturaRef.id;
    });
  }

  /**
   * Registers a direct business expense (e.g. utilities, rent, mermas).
   */
  static async registrarGastoDirecto(data: {
    glosa: string;
    monto: number;
    metodoPago: 'efectivo' | 'transferencia';
  }): Promise<string> {
    const cuentaPagoCodigo = data.metodoPago === 'efectivo' ? '1.1.01' : '1.1.02';
    const cuentaPagoNombre = data.metodoPago === 'efectivo' ? 'Caja' : 'Banco';

    const movimientos: MovimientoContable[] = [
      { cuenta_codigo: '5.1.02', cuenta_nombre: 'Gastos Generales', debe: data.monto, haber: 0 },
      { cuenta_codigo: cuentaPagoCodigo, cuenta_nombre: cuentaPagoNombre, debe: 0, haber: data.monto }
    ];

    await this.registrarAsientoManual(data.glosa, 'gasto', movimientos);
    return 'ok';
  }

  /**
   * Retrieves all journal entries.
   */
  static async obtenerLibroDiario(fechaInicio?: Date, fechaFin?: Date): Promise<AsientoContable[]> {
    let q = query(
      collection(db, this.COLLECTION_ASIENTOS),
      orderBy('numero_asiento', 'desc')
    );

    if (fechaInicio && fechaFin) {
      q = query(
        collection(db, this.COLLECTION_ASIENTOS),
        where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
        where('fecha', '<=', Timestamp.fromDate(fechaFin)),
        orderBy('fecha', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AsientoContable));
  }

  /**
   * Retrieves Ledger movements and running balance for a specific account.
   */
  static async obtenerLibroMayor(cuentaCodigo: string): Promise<{
    cuenta: CuentaContable;
    movimientos: {
      fecha: Timestamp;
      glosa: string;
      asiento_numero: number;
      debe: number;
      haber: number;
      saldo: number;
    }[];
    saldoFinal: number;
  }> {
    const cuenta = this.PLAN_CUENTAS.find(c => c.codigo === cuentaCodigo) || {
      codigo: cuentaCodigo,
      nombre: 'Cuenta Desconocida',
      tipo: 'activo' as const
    };

    // Load all journal entries
    // Since we need to calculate running balance chronologically, we sort by number_asiento ASC
    const q = query(
      collection(db, this.COLLECTION_ASIENTOS),
      orderBy('numero_asiento', 'asc')
    );
    const snapshot = await getDocs(q);
    const asientos = snapshot.docs.map(doc => doc.data() as AsientoContable);

    interface MovimientoLibroMayor {
      fecha: Timestamp;
      glosa: string;
      asiento_numero: number;
      debe: number;
      haber: number;
      saldo: number;
    }

    const movimientos: MovimientoLibroMayor[] = [];
    let runningBalance = 0;

    asientos.forEach(asiento => {
      asiento.movimientos.forEach(mov => {
        if (mov.cuenta_codigo === cuentaCodigo) {
          // Calculate running balance based on account type
          if (cuenta.tipo === 'activo' || cuenta.tipo === 'egreso') {
            runningBalance = runningBalance + mov.debe - mov.haber;
          } else {
            runningBalance = runningBalance - mov.debe + mov.haber;
          }

          movimientos.push({
            fecha: asiento.fecha,
            glosa: asiento.glosa,
            asiento_numero: asiento.numero_asiento,
            debe: mov.debe,
            haber: mov.haber,
            saldo: runningBalance
          });
        }
      });
    });

    // Sort descending for display (latest first)
    movimientos.reverse();

    return {
      cuenta,
      movimientos,
      saldoFinal: runningBalance
    };
  }

  /**
   * Retrieves all registered purchase invoices.
   */
  static async obtenerFacturasCompra(): Promise<FacturaCompra[]> {
    const q = query(
      collection(db, this.COLLECTION_COMPRAS),
      orderBy('fecha', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FacturaCompra));
  }

  /**
   * Computes the average daily sales velocity for all products during the last X days.
   */
  static async obtenerVelocidadDeVentas(dias: number = 30): Promise<{ [productoId: string]: number }> {
    try {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - dias);

      const q = query(
        collection(db, 'ventas'),
        where('fecha', '>=', Timestamp.fromDate(inicio))
      );
      const snap = await getDocs(q);
      const totals: { [productoId: string]: number } = {};

      snap.docs.forEach(docSnap => {
        const venta = docSnap.data();
        if (venta.items && Array.isArray(venta.items)) {
          venta.items.forEach((item: ItemVenta) => {
            const pid = item.producto_id;
            const qty = item.neto || 0;
            const multiplicador = item.es_caja && item.cantidad_por_caja ? item.cantidad_por_caja : 1;
            const realQty = qty * multiplicador;
            totals[pid] = (totals[pid] || 0) + realQty;
          });
        }
      });

      const velocity: { [productoId: string]: number } = {};
      Object.keys(totals).forEach(pid => {
        velocity[pid] = totals[pid] / dias;
      });

      return velocity;
    } catch (err) {
      console.error('Error al obtener velocidad de ventas:', err);
      return {};
    }
  }
}

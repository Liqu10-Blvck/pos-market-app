import { 
  collection, 
  doc, 
  runTransaction, 
  Timestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Venta, ItemVenta, Producto, Cliente, MetodoPago } from '../types/pos';
import { sanitizeFirestoreData } from '../utils';

export class VentasService {
  private static readonly COLLECTION = 'ventas';
  private static readonly PRODUCTOS_COLLECTION = 'productos';
  private static readonly CLIENTES_COLLECTION = 'clientes';

  static async procesarVenta(
    items: ItemVenta[],
    metodoPago: MetodoPago,
    sesionId: string,
    tenantId: string,
    sucursalId: string,
    vendedorId: string,
    clienteId?: string,
    requiereFactura?: boolean,
    clienteRut?: string
  ): Promise<string> {
    if (items.length === 0) {
      throw new Error('No hay items en la venta');
    }

    if (metodoPago === 'credito' && !clienteId) {
      throw new Error('Debe seleccionar un cliente para ventas a crédito');
    }

    const total_fruta = items.reduce((sum, item) => sum + (item.total_fruta || 0), 0);
    const total_envases = items.reduce((sum, item) => sum + (item.total_envases || 0), 0);
    const total_general = total_fruta + total_envases;

    // OPTIMIZED sale number calculation (Simplified query skip index)
    const q = query(
      collection(db, this.COLLECTION), 
      where('tenantId', '==', tenantId),
      where('sucursalId', '==', sucursalId),
      limit(20) // Fetch some to find max in memory
    );
    const lastVentaSnap = await getDocs(q);
    const ventasRecientes = lastVentaSnap.docs.map(d => d.data().numero_venta || 0);
    const ultimoNumeroVenta = ventasRecientes.length > 0 ? Math.max(...ventasRecientes) : 0;
    const numeroVenta = ultimoNumeroVenta + 1;

    return await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const itemRefs = items.map(item => doc(db, this.PRODUCTOS_COLLECTION, item.producto_id));
      const loteRefs = items.map(item => item.lote_id ? doc(db, 'lotes', item.lote_id) : null);
      const envaseRefs = items.map(item => item.envase_id ? doc(db, 'envases', item.envase_id) : null);
      
      const [productoSnaps, loteSnaps, envaseSnaps] = await Promise.all([
        Promise.all(itemRefs.map(ref => transaction.get(ref))),
        Promise.all(loteRefs.map(ref => ref ? transaction.get(ref) : null)),
        Promise.all(envaseRefs.map(ref => ref ? transaction.get(ref) : null))
      ]);
      
      let clienteSnap;
      if (clienteId) {
        clienteSnap = await transaction.get(doc(db, this.CLIENTES_COLLECTION, clienteId));
      }

      // POS-TRANSACTION Validation (Credit Limit)
      if (metodoPago === 'credito' && clienteSnap?.exists()) {
        const cliente = clienteSnap.data() as Cliente;
        const deudaActual = cliente.saldo_pendiente || 0;
        const limite = cliente.limite_credito || 0;
        
        if (limite > 0 && (deudaActual + total_general) > limite) {
          throw new Error(`Crédito insuficiente. Límite: $${limite.toLocaleString()}. Deuda actual: $${deudaActual.toLocaleString()}`);
        }
      }


      // 2. ALL WRITES AFTER
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prodSnap = productoSnaps[i];
        const loteSnap = loteSnaps[i];
        const envSnap = envaseSnaps[i];
        
        if (!prodSnap.exists()) throw new Error(`Producto ${item.nombre} no encontrado`);

        const producto = prodSnap.data() as Producto;
        const descuentoPeso = item.peso_neto || item.neto;
        
        // Determinar cuántas cajas/bultos descontar
        // Si se vendió por caja/unid, el 'neto' son los bultos. 
        // Si se vendió por peso, usamos 'envase_cantidad'.
        const bultosADescontar = (item.unidad === 'caja' || item.unidad === 'unid') 
          ? (item.neto || 0) 
          : (item.envase_cantidad || 0);
        
        // Update General Product Stock
        transaction.update(itemRefs[i], {
          stock_actual: increment(-descuentoPeso),
          stock_cajas: increment(-bultosADescontar),
          updatedAt: Timestamp.now()
        });

        // Update Specific Lot Stock
        if (loteRefs[i] && loteSnap?.exists()) {
          const loteActual = loteSnap.data();
          const nuevoStockLote = loteActual.stock_actual_kg - (descuentoPeso || 0);
          const stockCajasActual = loteActual.stock_actual_cajas ?? loteActual.envase_cantidad_total;
          const nuevoStockCajas = stockCajasActual - bultosADescontar;
          
          transaction.update(loteRefs[i]!, {
            stock_actual_kg: Math.max(0, nuevoStockLote),
            stock_actual_cajas: Math.max(0, nuevoStockCajas),
            estado: (nuevoStockLote <= 0 && nuevoStockCajas <= 0) ? 'agotado' : (loteActual.estado || 'disponible')
          });
        }

        // Update Envase Stock (Cajas Retornables)
        if (envaseRefs[i] && envSnap?.exists()) {
          transaction.update(envaseRefs[i]!, {
            stock_actual: increment(-(item.envase_cantidad || 0)),
            updatedAt: Timestamp.now()
          });
        }
      }

      let clienteNombre: string = 'Cliente Genérico';
      // 3. Update Customer Balance (Debt)
      if (clienteId) {
        const clienteRef = doc(db, this.CLIENTES_COLLECTION, clienteId);

        if (clienteSnap?.exists()) {
           const clienteData = clienteSnap.data() as Cliente;
           clienteNombre = clienteData.nombre;
        }

        if (metodoPago === 'credito') {
          transaction.update(clienteRef, {
            saldo_deuda: increment(total_general), // Histórico
            saldo_pendiente: increment(total_general), // Deuda actual
            updatedAt: Timestamp.now()
          });
        }
      }

      const ventaRef = doc(collection(db, this.COLLECTION));
      const ventaData: Omit<Venta, 'id'> = {
        tenantId,
        sucursalId,
        items,
        total_fruta,
        total_envases,
        total: total_general,
        metodo_pago: metodoPago,
        estado_pago: metodoPago === 'credito' ? 'pendiente' : 'pagado',
        estado_factura: requiereFactura ? 'por_facturar' : 'no_requiere',
        sesion_id: sesionId,
        vendedor_id: vendedorId,
        fecha: Timestamp.now(),
        numero_venta: numeroVenta,
        createdAt: Timestamp.now(),
        ...(clienteId ? { cliente_id: clienteId } : {}),
        ...(clienteNombre ? { cliente_nombre: clienteNombre } : { cliente_nombre: 'Cliente' }),
        ...(clienteRut ? { cliente_rut: clienteRut } : {})
      };

      transaction.set(ventaRef, sanitizeFirestoreData(ventaData));

      return ventaRef.id;
    });
  }

  static async obtenerVentasPorSesion(sesionId: string, tenantId: string, sucursalId: string): Promise<Venta[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('tenantId', '==', tenantId),
      where('sucursalId', '==', sucursalId),
      where('sesion_id', '==', sesionId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Venta))
      .sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
  }

  static async obtenerResumenSesion(sesionId: string, tenantId: string, sucursalId: string) {
    const ventas = await this.obtenerVentasPorSesion(sesionId, tenantId, sucursalId);

    const resumen = {
      total_ventas: 0,
      total_fruta: 0,
      total_envases: 0,
      total_efectivo: 0,
      total_transferencia: 0,
      total_tarjeta: 0,
      total_credito: 0,
      cantidad_ventas: ventas.length,
      ventas_detalle: ventas
    };

    ventas.forEach(venta => {
      resumen.total_ventas += venta.total;
      resumen.total_fruta += (venta.total_fruta || venta.total);
      resumen.total_envases += (venta.total_envases || 0);
      
      switch (venta.metodo_pago) {
        case 'efectivo':
          resumen.total_efectivo += venta.total;
          break;
        case 'transferencia':
          resumen.total_transferencia += venta.total;
          break;
        case 'tarjeta':
          resumen.total_tarjeta += venta.total;
          break;
        case 'credito':
          resumen.total_credito += venta.total;
          break;
      }
    });

    return resumen;
  }

  static calcularNeto(pesoBruto: number, tara: number): number {
    const neto = pesoBruto - tara;
    return Math.max(0, Number(neto.toFixed(3)));
  }

  static calcularTotal(neto: number, precioUnitario: number): number {
    return Number((neto * precioUnitario).toFixed(2));
  }

  static async marcarComoFacturado(ventaId: string, nroFactura: string) {
    const ventaRef = doc(db, this.COLLECTION, ventaId);
    await updateDoc(ventaRef, {
      estado_factura: 'facturado',
      nro_factura: nroFactura,
      updatedAt: Timestamp.now()
    });
  }
}

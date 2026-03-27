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
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Venta, ItemVenta, Producto, Cliente, MetodoPago } from '../types/pos';

export class VentasService {
  private static readonly COLLECTION = 'ventas';
  private static readonly PRODUCTOS_COLLECTION = 'productos';
  private static readonly CLIENTES_COLLECTION = 'clientes';

  static async procesarVenta(
    items: ItemVenta[],
    metodoPago: MetodoPago,
    sesionId: string,
    clienteId?: string
  ): Promise<string> {
    if (items.length === 0) {
      throw new Error('No hay items en la venta');
    }

    if (metodoPago === 'fiado' && !clienteId) {
      throw new Error('Debe seleccionar un cliente para ventas fiadas');
    }

    const total_fruta = items.reduce((sum, item) => sum + (item.total_fruta || 0), 0);
    const total_envases = items.reduce((sum, item) => sum + (item.total_envases || 0), 0);
    const total_general = total_fruta + total_envases;

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
      if (metodoPago === 'fiado' && clienteId) {
        clienteSnap = await transaction.get(doc(db, this.CLIENTES_COLLECTION, clienteId));
      }

      // OPTIMIZED sale number calculation
      const q = query(
        collection(db, this.COLLECTION), 
        orderBy('numero_venta', 'desc'), 
        limit(1)
      );
      const lastVentaSnap = await getDocs(q);
      const ultimoNumeroVenta = lastVentaSnap.empty ? 0 : (lastVentaSnap.docs[0].data().numero_venta || 0);
      const numeroVenta = ultimoNumeroVenta + 1;

      // 2. ALL WRITES AFTER
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prodSnap = productoSnaps[i];
        const loteSnap = loteSnaps[i];
        const envSnap = envaseSnaps[i];
        
        if (!prodSnap.exists()) throw new Error(`Producto ${item.nombre} no encontrado`);

        const producto = prodSnap.data() as Producto;
        const descuentoPeso = item.peso_neto || item.neto;
        
        // Update General Product Stock
        transaction.update(itemRefs[i], {
          stock_actual: increment(-descuentoPeso),
          updatedAt: Timestamp.now()
        });

        // Update Specific Lot Stock
        if (loteRefs[i] && loteSnap?.exists()) {
          const loteActual = loteSnap.data();
          const nuevoStockLote = loteActual.stock_actual_kg - descuentoPeso;
          transaction.update(loteRefs[i]!, {
            stock_actual_kg: nuevoStockLote,
            estado: nuevoStockLote <= 0 ? 'agotado' : (loteActual.estado || 'disponible')
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

      let clienteNombre: string | undefined;
      if (metodoPago === 'fiado' && clienteId && clienteSnap) {
        if (!clienteSnap.exists()) {
          throw new Error('Cliente no encontrado');
        }

        const cliente = clienteSnap.data() as Cliente;
        clienteNombre = cliente.nombre;
        
        transaction.update(clienteSnap.ref, {
          saldo_deuda: (cliente.saldo_deuda || 0) + total_general,
          updatedAt: Timestamp.now()
        });
      }

      const ventaRef = doc(collection(db, this.COLLECTION));
      const ventaData: Omit<Venta, 'id'> = {
        items,
        total_fruta,
        total_envases,
        total: total_general,
        metodo_pago: metodoPago,
        sesion_id: sesionId,
        fecha: Timestamp.now(),
        numero_venta: numeroVenta,
        createdAt: Timestamp.now(),
        ...(clienteId ? { cliente_id: clienteId } : {}),
        ...(clienteNombre ? { cliente_nombre: clienteNombre } : {})
      };

      transaction.set(ventaRef, ventaData);

      return ventaRef.id;
    });
  }

  static async obtenerVentasPorSesion(sesionId: string): Promise<Venta[]> {
    const q = query(
      collection(db, this.COLLECTION),
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

  static async obtenerResumenSesion(sesionId: string) {
    const ventas = await this.obtenerVentasPorSesion(sesionId);

    const resumen = {
      total_ventas: 0,
      total_fruta: 0,
      total_envases: 0,
      total_efectivo: 0,
      total_transferencia: 0,
      total_tarjeta: 0,
      total_fiado: 0,
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
        case 'fiado':
          resumen.total_fiado += venta.total;
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
}

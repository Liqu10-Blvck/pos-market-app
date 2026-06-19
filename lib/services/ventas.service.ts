import { 
  collection, 
  doc, 
  runTransaction, 
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Venta, ItemVenta, Producto, Cliente, MetodoPago } from '../types/pos';
import { ContabilidadService } from './contabilidad.service';

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

    const total = items.reduce((sum, item) => sum + item.total, 0);

    return await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const itemRefs = items.map(item => doc(db, this.PRODUCTOS_COLLECTION, item.producto_id));
      const productoSnaps = await Promise.all(itemRefs.map(ref => transaction.get(ref)));
      
      let clienteSnap;
      if (metodoPago === 'fiado' && clienteId) {
        clienteSnap = await transaction.get(doc(db, this.CLIENTES_COLLECTION, clienteId));
      }

      // Read sales metadata transactionally
      const metadataRef = doc(db, 'metadata', 'ventas');
      const metadataSnap = await transaction.get(metadataRef);
      let ultimoNumeroVenta = 0;
      if (metadataSnap.exists()) {
        ultimoNumeroVenta = metadataSnap.data().ultimo_numero_venta || 0;
      }
      const numeroVenta = ultimoNumeroVenta + 1;

      // Read contabilidad metadata transactionally
      const metadataContabilidadRef = doc(db, 'metadata', 'contabilidad');
      const metadataContabilidadSnap = await transaction.get(metadataContabilidadRef);
      let ultimoNumeroAsiento = 0;
      if (metadataContabilidadSnap.exists()) {
        ultimoNumeroAsiento = metadataContabilidadSnap.data().ultimo_numero_asiento || 0;
      }

      // 2. ALL WRITES AFTER
      let costoTotalVenta = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const snap = productoSnaps[i];
        
        if (!snap.exists()) {
          throw new Error(`Producto ${item.nombre} no encontrado`);
        }

        const producto = snap.data() as Producto;
        const multiplicador = item.es_caja && item.cantidad_por_caja ? item.cantidad_por_caja : 1;
        const netoDeducido = item.neto * multiplicador;
        const nuevoStock = producto.stock_actual - netoDeducido;
        if (nuevoStock < 0) {
          throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${producto.stock_actual}`);
        }

        transaction.update(itemRefs[i], {
          stock_actual: nuevoStock,
          updatedAt: Timestamp.now()
        });

        // Accumulate cost of goods sold
        const costoProducto = producto.costo_actual || 0;
        costoTotalVenta += netoDeducido * costoProducto;
      }

      let clienteNombre: string | undefined;
      if (metodoPago === 'fiado' && clienteId && clienteSnap) {
        if (!clienteSnap.exists()) {
          throw new Error('Cliente no encontrado');
        }

        const cliente = clienteSnap.data() as Cliente;
        clienteNombre = cliente.nombre;
        
        transaction.update(clienteSnap.ref, {
          saldo_deuda: (cliente.saldo_deuda || 0) + total,
          updatedAt: Timestamp.now()
        });
      }

      // Update metadata count
      transaction.set(metadataRef, { ultimo_numero_venta: numeroVenta }, { merge: true });

      const ventaRef = doc(collection(db, this.COLLECTION));
      const ventaData: Omit<Venta, 'id'> = {
        items,
        total,
        metodo_pago: metodoPago,
        sesion_id: sesionId,
        fecha: Timestamp.now(),
        numero_venta: numeroVenta,
        createdAt: Timestamp.now(),
        ...(clienteId ? { cliente_id: clienteId } : {}),
        ...(clienteNombre ? { cliente_nombre: clienteNombre } : {})
      };

      transaction.set(ventaRef, ventaData);

      // --- CONTABILIDAD ENTRIES GENERATION ---
      let netoTotal = 0;
      let ivaTotal = 0;

      items.forEach(item => {
        if (item.facturable !== false) {
          const itemNeto = Math.round(item.total / 1.19);
          const itemIva = item.total - itemNeto;
          netoTotal += itemNeto;
          ivaTotal += itemIva;
        } else {
          // Exempt product (Exento de IVA)
          netoTotal += item.total;
        }
      });

      const debitCuentaCodigo = metodoPago === 'efectivo' ? '1.1.01' : 
                                (metodoPago === 'fiado' ? '1.1.04' : '1.1.02');
      const debitCuentaNombre = metodoPago === 'efectivo' ? 'Caja' : 
                                (metodoPago === 'fiado' ? 'Clientes' : 'Banco');

      // Entry A: Sales revenues
      const movimientosVenta = [
        { cuenta_codigo: debitCuentaCodigo, cuenta_nombre: debitCuentaNombre, debe: total, haber: 0 },
        { cuenta_codigo: '4.1.01', cuenta_nombre: 'Ventas', debe: 0, haber: netoTotal },
        ...(ivaTotal > 0 ? [{ cuenta_codigo: '2.1.01', cuenta_nombre: 'IVA Débito Fiscal', debe: 0, haber: ivaTotal }] : [])
      ];

      ultimoNumeroAsiento = ContabilidadService.registrarAsientoEnTransaccion(
        transaction,
        metadataContabilidadRef,
        ultimoNumeroAsiento,
        `Venta POS Boleta N° ${numeroVenta}`,
        'venta',
        movimientosVenta,
        ventaRef.id
      );

      // Entry B: Cost of goods sold
      if (costoTotalVenta > 0) {
        const movimientosCosto = [
          { cuenta_codigo: '5.1.01', cuenta_nombre: 'Costo de Ventas', debe: Math.round(costoTotalVenta), haber: 0 },
          { cuenta_codigo: '1.1.03', cuenta_nombre: 'Mercaderías', debe: 0, haber: Math.round(costoTotalVenta) }
        ];

        ContabilidadService.registrarAsientoEnTransaccion(
          transaction,
          metadataContabilidadRef,
          ultimoNumeroAsiento,
          `Costo de Ventas Boleta N° ${numeroVenta}`,
          'venta',
          movimientosCosto,
          ventaRef.id
        );
      }

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
      total_efectivo: 0,
      total_transferencia: 0,
      total_tarjeta: 0,
      total_fiado: 0,
      cantidad_ventas: ventas.length,
      ventas_detalle: ventas
    };

    ventas.forEach(venta => {
      resumen.total_ventas += venta.total;
      
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
    return Math.max(0, Number(neto.toFixed(2)));
  }

  static calcularTotal(neto: number, precioUnitario: number): number {
    return Number((neto * precioUnitario).toFixed(2));
  }
}

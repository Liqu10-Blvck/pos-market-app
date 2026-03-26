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
      const ventaRef = doc(collection(db, this.COLLECTION));
      
      for (const item of items) {
        const productoRef = doc(db, this.PRODUCTOS_COLLECTION, item.producto_id);
        const productoSnap = await transaction.get(productoRef);
        
        if (!productoSnap.exists()) {
          throw new Error(`Producto ${item.nombre} no encontrado`);
        }

        const producto = productoSnap.data() as Producto;
        const nuevoStock = producto.stock_actual - item.neto;

        if (nuevoStock < 0) {
          throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${producto.stock_actual}`);
        }

        transaction.update(productoRef, {
          stock_actual: nuevoStock,
          updatedAt: Timestamp.now()
        });
      }

      let clienteNombre: string | undefined;
      if (metodoPago === 'fiado' && clienteId) {
        const clienteRef = doc(db, this.CLIENTES_COLLECTION, clienteId);
        const clienteSnap = await transaction.get(clienteRef);
        
        if (!clienteSnap.exists()) {
          throw new Error('Cliente no encontrado');
        }

        const cliente = clienteSnap.data() as Cliente;
        clienteNombre = cliente.nombre;
        
        transaction.update(clienteRef, {
          saldo_deuda: cliente.saldo_deuda + total,
          updatedAt: Timestamp.now()
        });
      }

      const ventasSnapshot = await getDocs(collection(db, this.COLLECTION));
      const ultimoNumeroVenta = ventasSnapshot.docs.reduce((max, ventaDoc) => {
        const numero = ventaDoc.data().numero_venta || 0;
        return numero > max ? numero : max;
      }, 0);
      const numeroVenta = ultimoNumeroVenta + 1;

      const ventaDataBase: Omit<Venta, 'id'> = {
        items,
        total,
        metodo_pago: metodoPago,
        sesion_id: sesionId,
        fecha: Timestamp.now(),
        numero_venta: numeroVenta,
        createdAt: Timestamp.now()
      };

      const ventaData: Omit<Venta, 'id'> = {
        ...ventaDataBase,
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
    return Math.max(0, Number(neto.toFixed(3)));
  }

  static calcularTotal(neto: number, precioUnitario: number): number {
    return Number((neto * precioUnitario).toFixed(2));
  }
}

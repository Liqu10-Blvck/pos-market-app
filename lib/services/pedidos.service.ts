import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  runTransaction, 
  updateDoc, 
  deleteDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Pedido, EstadoPedido, EstadoPago } from '../types/pedido';
import { MetodoPago, ItemVenta } from '../types/pos';
import { VentasService } from './ventas.service';

export class PedidosService {
  private static readonly COLLECTION = 'pedidos';

  /**
   * Suscribe en tiempo real a la colección de pedidos ordenada por fecha descendente.
   */
  static suscribirAPedidos(callback: (pedidos: Pedido[]) => void): () => void {
    const q = query(
      collection(db, this.COLLECTION),
      orderBy('fecha', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Pedido));
      callback(list);
    });
  }

  /**
   * Crea un pedido con un número correlativo transaccional.
   */
  static async crearPedido(pedidoData: Omit<Pedido, 'id' | 'numero_pedido' | 'fecha' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const metadataRef = doc(db, 'metadata', 'pedidos');

    return await runTransaction(db, async (transaction) => {
      const metadataSnap = await transaction.get(metadataRef);
      let ultimoNumeroPedido = 0;
      if (metadataSnap.exists()) {
        ultimoNumeroPedido = metadataSnap.data().ultimo_numero_pedido || 0;
      }
      const numeroPedido = ultimoNumeroPedido + 1;

      transaction.set(metadataRef, { ultimo_numero_pedido: numeroPedido }, { merge: true });

      const pedidoRef = doc(collection(db, this.COLLECTION));
      const fullPedido: Omit<Pedido, 'id'> = {
        ...pedidoData,
        numero_pedido: numeroPedido,
        fecha: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      transaction.set(pedidoRef, fullPedido);
      return pedidoRef.id;
    });
  }

  /**
   * Cambia el estado de preparación de un pedido.
   */
  static async actualizarEstadoPedido(id: string, estado: EstadoPedido): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION, id);
      await updateDoc(ref, {
        estado,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error al actualizar estado del pedido:', err);
      throw err;
    }
  }

  /**
   * Cambia el estado de pago del pedido.
   */
  static async actualizarEstadoPago(id: string, estadoPago: EstadoPago, metodoPago?: MetodoPago): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION, id);
      const updateData: Partial<Omit<Pedido, 'id'>> = {
        estado_pago: estadoPago,
        updatedAt: Timestamp.now()
      };
      if (metodoPago) {
        updateData.metodo_pago = metodoPago;
      }
      await updateDoc(ref, updateData);
    } catch (err) {
      console.error('Error al actualizar estado de pago del pedido:', err);
      throw err;
    }
  }

  /**
   * Cobra y completa un pedido, transformándolo en una venta real en el POS.
   */
  static async completarCobroPedido(pedido: Pedido, metodoPago: MetodoPago, sesionId: string): Promise<string> {
    if (pedido.items.length === 0) {
      throw new Error('El pedido no tiene items para procesar');
    }

    // Convertir ItemPedido a ItemVenta mapeando cantidad a neto
    const itemsVenta: ItemVenta[] = pedido.items.map(item => ({
      producto_id: item.producto_id,
      nombre: item.nombre,
      precio_unitario: item.precio_unitario,
      unidad: item.unidad,
      cantidad: item.cantidad,
      neto: item.cantidad, // Mapeamos cantidad a neto para el procesamiento del stock en VentasService
      total: item.total,
      es_caja: item.es_caja || false,
      cantidad_por_caja: item.cantidad_por_caja,
      tipo_empaque: item.tipo_empaque
    }));

    // Registrar la venta en POS
    const ventaId = await VentasService.procesarVenta(
      itemsVenta,
      metodoPago,
      sesionId,
      pedido.cliente_id
    );

    // Actualizar el estado del pedido a entregado y pagado
    const pedidoRef = doc(db, this.COLLECTION, pedido.id);
    await updateDoc(pedidoRef, {
      estado: 'entregado',
      estado_pago: 'pagado',
      metodo_pago: metodoPago,
      updatedAt: Timestamp.now()
    });

    return ventaId;
  }

  /**
   * Elimina un pedido.
   */
  static async eliminarPedido(id: string): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION, id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Error al eliminar pedido:', err);
      throw err;
    }
  }
}

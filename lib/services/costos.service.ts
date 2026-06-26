import { 
  collection, 
  doc, 
  Timestamp, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { CostoDiario, Producto } from '../types/pos';
import { updateDocument } from '../firebase/firestore';

export class CostosService {
  private static readonly COLLECTION_COSTOS = 'costos_diarios';
  private static readonly COLLECTION_PRODUCTOS = 'productos';

  /**
   * Registra un nuevo costo diario para un producto y actualiza su costo_actual.
   */
  static async registrarCostoDiario(
    productoId: string,
    nombreProducto: string,
    costo: number,
    margenDeseado?: number
  ): Promise<string> {
    if (costo < 0) {
      throw new Error('El costo no puede ser negativo');
    }

    const costoData = {
      producto_id: productoId,
      nombre: nombreProducto,
      costo,
      fecha: Timestamp.now(),
      createdAt: Timestamp.now()
    };
    
    return await runTransaction(db, async (transaction) => {
      // Registrar en costos_diarios
      const costoRef = doc(collection(db, this.COLLECTION_COSTOS));
      transaction.set(costoRef, costoData);

      // Actualizar el producto
      const productoRef = doc(db, this.COLLECTION_PRODUCTOS, productoId);
      const prodSnap = await transaction.get(productoRef);
      const prodData = prodSnap.exists() ? prodSnap.data() as Producto : null;
      const currentPrice = prodData ? prodData.precio : 0;

      const updateData: Partial<Producto> = {
        costo_actual: costo,
        updatedAt: Timestamp.now()
      };
      
      if (margenDeseado !== undefined) {
        updateData.margen_deseado = margenDeseado;
      }
      
      transaction.update(productoRef, updateData);

      // Also register in registro_precios_mayoristas to log cost variation
      const mayoristaLogRef = doc(collection(db, 'registro_precios_mayoristas'));
      transaction.set(mayoristaLogRef, {
        fecha: Timestamp.now(),
        producto_id: productoId,
        nombre: nombreProducto,
        costo_local: costo,
        precio_venta_local: currentPrice,
        precio_referencia: costo
      });

      return costoRef.id;
    });
  }

  /**
   * Obtiene el historial de costos para un producto ordenado por fecha descendente.
   */
  static async obtenerHistorialCostos(productoId: string): Promise<CostoDiario[]> {
    const q = query(
      collection(db, this.COLLECTION_COSTOS),
      where('producto_id', '==', productoId),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CostoDiario));
  }

  /**
   * Actualiza el precio de venta y opcionalmente el margen de un producto.
   */
  static async actualizarPrecioVenta(
    productoId: string,
    nuevoPrecio: number,
    margenDeseado?: number
  ): Promise<void> {
    const updateData: Partial<Producto> = {
      precio: nuevoPrecio,
      updatedAt: Timestamp.now()
    };

    if (margenDeseado !== undefined) {
      updateData.margen_deseado = margenDeseado;
    }

    await updateDocument(this.COLLECTION_PRODUCTOS, productoId, updateData);
  }

  /**
   * Obtiene todos los costos registrados en un rango de fechas.
   */
  static async obtenerCostosPorFecha(fechaInicio: Date, fechaFin: Date): Promise<CostoDiario[]> {
    const q = query(
      collection(db, this.COLLECTION_COSTOS),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin)),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CostoDiario));
  }
}

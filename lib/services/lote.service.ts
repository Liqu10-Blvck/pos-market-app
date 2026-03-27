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
  setDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Lote, LoteCalibre, Producto } from '../types/pos';
import { TIPOS_ENVASES } from '../constants/envases';

export class LoteService {
  private static readonly COLLECTION = 'lotes';
  private static readonly PRODUCTOS_COLLECTION = 'productos';
  private static readonly ENVASES_COLLECTION = 'envases';

  static async registrarLote(loteData: Omit<Lote, 'id' | 'fecha_ingreso' | 'stock_actual_kg' | 'estado'>): Promise<string> {
    const loteId = `LOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    return await runTransaction(db, async (transaction) => {
      // 1. Referencias
      const productoRef = doc(db, this.PRODUCTOS_COLLECTION, loteData.producto_id);
      
      // 2. Si el envase es cobrable, necesitamos su ref para el stock
      const envaseCobrable = TIPOS_ENVASES.find(e => e.id === loteData.envase_id && e.precio_venta > 0);
      let envaseRef;
      if (envaseCobrable) {
        envaseRef = doc(db, this.ENVASES_COLLECTION, envaseCobrable.id);
      }

      // 3. Crear el Lote
      const loteRef = doc(db, this.COLLECTION, loteId);
      const nuevoLote: Lote = {
        ...loteData,
        id: loteId,
        fecha_ingreso: Timestamp.now(),
        stock_actual_kg: loteData.peso_total,
        estado: 'disponible'
      };

      transaction.set(loteRef, nuevoLote);

      // 4. Actualizar Stock del Producto
      transaction.update(productoRef, {
        stock_actual: increment(loteData.peso_total),
        precio: loteData.precio_sugerido, // Opcional: Actualizar precio de venta sugerido
        updatedAt: Timestamp.now()
      });

      // 5. Actualizar Stock de Envases Vacíos (SI son cobrables)
      if (envaseRef) {
        // Nota: incrementamos el stock de envases disponibles para la venta
        transaction.update(envaseRef, {
          stock_actual: increment(loteData.envase_cantidad_total),
          updatedAt: Timestamp.now()
        });
      }

      return loteId;
    });
  }

  static async obtenerLotesDisponibles(productoId: string): Promise<Lote[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('producto_id', '==', productoId),
      where('estado', '==', 'disponible'),
      orderBy('fecha_ingreso', 'asc') // FIFO
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lote));
  }

  static async registrarReserva(loteId: string, clienteId: string, clienteNombre: string, pesoKg?: number, cantidadCajas?: number) {
    const reservaId = `RES-${Date.now()}`;
    const reservaRef = doc(db, 'reservas', reservaId);
    
    // Aquí se podría descontar del stock_actual_kg del lote o manejar un campo 'reservado'
    await setDoc(reservaRef, {
      id: reservaId,
      lote_id: loteId,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      peso_kg: pesoKg,
      cantidad_cajas: cantidadCajas,
      fecha_reserva: Timestamp.now(),
      activo: true
    });

    return reservaId;
  }
}

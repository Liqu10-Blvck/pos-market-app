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
import { NotificationService } from './notification.service';

export class LoteService {
  private static readonly COLLECTION = 'lotes';
  private static readonly PRODUCTOS_COLLECTION = 'productos';
  private static readonly ENVASES_COLLECTION = 'envases';

  static async registrarLote(
    loteData: Omit<Lote, 'id' | 'fecha_ingreso' | 'stock_actual_kg' | 'stock_actual_cajas' | 'estado' | 'tenantId' | 'sucursalId'>,
    tenantId: string,
    sucursalId: string
  ): Promise<string> {
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
        tenantId,
        sucursalId,
        fecha_ingreso: Timestamp.now(),
        stock_actual_kg: loteData.peso_total_neto || 0,
        stock_actual_cajas: loteData.envase_cantidad_total || 0,
        estado: 'disponible'
      };

      transaction.set(loteRef, nuevoLote);

      // 4. Actualizar Stock del Producto
      transaction.update(productoRef, {
        stock_actual: increment(loteData.peso_total_neto),
        stock_cajas: increment(loteData.envase_cantidad_total),
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

  static async obtenerLotesDisponibles(productoId: string, tenantId: string, sucursalId: string): Promise<Lote[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('producto_id', '==', productoId),
      where('tenantId', '==', tenantId),
      where('sucursalId', '==', sucursalId),
      where('estado', '==', 'disponible')
      // orderBy('fecha_ingreso', 'asc')
    );

    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lote));
    } catch (error) {
      console.error('Error al obtener lotes:', error);
      return [];
    }
  }

  static async registrarReserva(
    loteId: string, 
    clienteId: string, 
    clienteNombre: string, 
    tenantId: string,
    sucursalId: string,
    pesoKg?: number, 
    cantidadCajas?: number,
    precioAcordado?: number,
    totalEstimado?: number
  ) {
    const reservaId = `RES-${Date.now()}`;
    const reservaRef = doc(db, 'reservas', reservaId);
    const loteRef = doc(db, this.COLLECTION, loteId);

    return await runTransaction(db, async (transaction) => {
      const loteSnap = await transaction.get(loteRef);
      if (!loteSnap.exists()) throw new Error('El lote no existe');
      
      const lote = loteSnap.data() as Lote;
      const productoRef = doc(db, this.PRODUCTOS_COLLECTION, lote.producto_id);

      // 1. Crear registro de reserva
      transaction.set(reservaRef, {
        id: reservaId,
        lote_id: loteId,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        tenantId,
        sucursalId,
        peso_kg: pesoKg || 0,
        cantidad_cajas: cantidadCajas || 0,
        precio_acordado: precioAcordado || 0,
        total_estimado: totalEstimado || 0,
        fecha_reserva: Timestamp.now(),
        activo: true
      });

      // 2. Descontar stock del lote
      transaction.update(loteRef, {
        stock_actual_kg: increment(-(pesoKg || 0)),
        stock_actual_cajas: increment(-(cantidadCajas || 0)),
        updatedAt: Timestamp.now()
      });

      // 3. Descontar stock del producto maestro
      transaction.update(productoRef, {
        stock_actual: increment(-(pesoKg || 0)),
        stock_cajas: increment(-(cantidadCajas || 0)),
        updatedAt: Timestamp.now()
      });

      // 4. Notificación de reserva
      await NotificationService.crear({
        titulo: 'Nueva Reserva de Stock',
        mensaje: `${clienteNombre} reservó ${pesoKg}kg de ${lote.nombre_producto}`,
        tipo: 'stock',
        prioridad: 'media',
        tenantId,
        sucursalId
      });

      return reservaId;
    });
  }

  static async registrarAjuste(ajusteData: {
    lote_id: string;
    producto_id: string;
    nombre_producto: string;
    cantidad_kg: number;
    cantidad_cajas: number;
    motivo: string;
    usuario_nombre?: string;
  }): Promise<{ ajusteId: string; tenantId: string; sucursalId: string }> {
    const ajusteId = `AJU-${Date.now()}`;
    const ajusteRef = doc(db, 'ajustes_stock', ajusteId);
    const loteRef = doc(db, this.COLLECTION, ajusteData.lote_id);
    const productoRef = doc(db, this.PRODUCTOS_COLLECTION, ajusteData.producto_id);

    return await runTransaction(db, async (transaction) => {
      // 1. Validar existencia y stock actual
      const loteSnap = await transaction.get(loteRef);
      if (!loteSnap.exists()) throw new Error('El lote no existe');
      
      const lote = loteSnap.data() as Lote;
      
      // 2. Crear registro de auditoría
      transaction.set(ajusteRef, {
        id: ajusteId,
        ...ajusteData,
        tenantId: lote.tenantId,
        sucursalId: lote.sucursalId,
        fecha: Timestamp.now()
      });

      // 3. Actualizar Lote (Decremento negativo porque el input viene como positivo a restar)
      transaction.update(loteRef, {
        stock_actual_kg: increment(-ajusteData.cantidad_kg),
        stock_actual_cajas: increment(-ajusteData.cantidad_cajas),
        updatedAt: Timestamp.now()
      });

      // 4. Actualizar Producto Maestro
      transaction.update(productoRef, {
        stock_actual: increment(-ajusteData.cantidad_kg),
        stock_cajas: increment(-ajusteData.cantidad_cajas),
        updatedAt: Timestamp.now()
      });

      // 5. Notificar ajuste
      // Nota: No podemos usar await NotificationService.crear() dentro de una transacción de Firestore de la misma manera que set/update.
      // Pero podemos lanzar la notificación después de la transacción si esta tiene éxito.
      return { ajusteId, tenantId: lote.tenantId, sucursalId: lote.sucursalId };
    });
  }

  // Wrapper para manejar la notificación fuera de la transacción
  static async ejecutarAjuste(ajusteData: Parameters<typeof LoteService.registrarAjuste>[0]) {
    const result = await this.registrarAjuste(ajusteData);
    
    await NotificationService.crear({
      titulo: 'Ajuste de Stock Realizado',
      mensaje: `Se descontaron ${ajusteData.cantidad_kg}kg de ${ajusteData.nombre_producto} por: ${ajusteData.motivo}`,
      tipo: 'error', 
      prioridad: 'alta',
      tenantId: result.tenantId,
      sucursalId: result.sucursalId
    });

    return result.ajusteId;
  }

  static async verificarStockBajo(lote: Lote) {
    const UMBRAL = 50; // kg
    if (lote.stock_actual_kg < UMBRAL) {
      await NotificationService.crear({
        titulo: 'Stock Crítico',
        mensaje: `El lote ${lote.id} de ${lote.nombre_producto} tiene menos de ${UMBRAL}kg`,
        tipo: 'warning',
        prioridad: 'alta',
        tenantId: lote.tenantId,
        sucursalId: lote.sucursalId
      });
    }
  }
}

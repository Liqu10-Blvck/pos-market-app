import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ContabilidadService } from './contabilidad.service';

export interface GastoProgramado {
  id: string;
  concepto: string;
  monto: number;
  monto_asignado: number;
  fecha_vencimiento: Timestamp;
  pagado: boolean;
  fecha_pago?: Timestamp | null;
  metodo_pago?: 'efectivo' | 'transferencia' | null;
  referencia_asiento_id?: string | null;
  createdAt: Timestamp;
}

export class GastosProgramadosService {
  private static readonly COLLECTION = 'gastos_programados';

  /**
   * Registra un nuevo gasto programado en el sistema (pendiente de pago).
   */
  static async crearGastoProgramado(
    concepto: string, 
    monto: number, 
    fechaVencimiento: Date
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        concepto,
        monto,
        monto_asignado: 0,
        fecha_vencimiento: Timestamp.fromDate(fechaVencimiento),
        pagado: false,
        fecha_pago: null,
        metodo_pago: null,
        referencia_asiento_id: null,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear gasto programado:', err);
      throw err;
    }
  }

  /**
   * Obtiene la lista de gastos programados.
   */
  static async obtenerGastosProgramados(
    filtro: 'todos' | 'pendientes' | 'pagados' = 'todos'
  ): Promise<GastoProgramado[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION),
        orderBy('fecha_vencimiento', 'asc')
      );

      if (filtro === 'pendientes') {
        q = query(
          collection(db, this.COLLECTION),
          where('pagado', '==', false),
          orderBy('fecha_vencimiento', 'asc')
        );
      } else if (filtro === 'pagados') {
        q = query(
          collection(db, this.COLLECTION),
          where('pagado', '==', true),
          orderBy('fecha_vencimiento', 'asc')
        );
      }

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GastoProgramado));
    } catch (err) {
      console.error('Error al obtener gastos programados:', err);
      return [];
    }
  }

  /**
   * Paga un gasto programado, registrándolo en la contabilidad real del negocio.
   */
  static async pagarGastoProgramado(
    id: string, 
    metodoPago: 'efectivo' | 'transferencia'
  ): Promise<void> {
    try {
      const gastoRef = doc(db, this.COLLECTION, id);
      const snap = await getDoc(gastoRef);

      if (!snap.exists()) {
        throw new Error('Gasto programado no encontrado.');
      }

      const gasto = snap.data() as GastoProgramado;

      if (gasto.pagado) {
        throw new Error('Este gasto ya ha sido pagado anteriormente.');
      }

      // 1. Registrar el egreso real en la contabilidad
      const glosaAsiento = `Pago gasto programado: ${gasto.concepto}`;
      await ContabilidadService.registrarGastoDirecto({
        glosa: glosaAsiento,
        monto: gasto.monto,
        metodoPago: metodoPago
      });

      // 2. Marcar como pagado
      await updateDoc(gastoRef, {
        pagado: true,
        fecha_pago: Timestamp.now(),
        metodo_pago: metodoPago,
        // Forzamos que esté financiado al 100% al pagarse
        monto_asignado: gasto.monto
      });

    } catch (err) {
      console.error('Error al pagar gasto programado:', err);
      throw err;
    }
  }

  /**
   * Elimina un gasto programado (solo si no ha sido pagado).
   */
  static async eliminarGastoProgramado(id: string): Promise<void> {
    try {
      const gastoRef = doc(db, this.COLLECTION, id);
      const snap = await getDoc(gastoRef);

      if (!snap.exists()) {
        throw new Error('Gasto programado no encontrado.');
      }

      const gasto = snap.data() as GastoProgramado;

      if (gasto.pagado) {
        throw new Error('No se puede eliminar un gasto que ya ha sido pagado.');
      }

      await deleteDoc(gastoRef);
    } catch (err) {
      console.error('Error al eliminar gasto programado:', err);
      throw err;
    }
  }
}

import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ConsultaIALog } from '../types/pos';

export class AIService {
  private static readonly COLLECTION = 'consultas_ia';

  /**
   * Logs a query and response from the AI.
   */
  static async registrarConsulta(log: Omit<ConsultaIALog, 'fecha'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...log,
        fecha: Timestamp.now()
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al registrar consulta de IA:', err);
      throw err;
    }
  }

  /**
   * Retrieves the recent history of queries and responses.
   * Chronologically ordered (oldest to newest) to match prompt message flow.
   */
  static async obtenerHistorial(
    tipoAsistente: ConsultaIALog['tipo_asistente'],
    productoId?: string,
    maxLimit: number = 10
  ): Promise<ConsultaIALog[]> {
    try {
      let q;
      if (productoId) {
        q = query(
          collection(db, this.COLLECTION),
          where('tipo_asistente', '==', tipoAsistente),
          where('productos_vinculados', 'array-contains', productoId),
          orderBy('fecha', 'desc'),
          limit(maxLimit)
        );
      } else {
        q = query(
          collection(db, this.COLLECTION),
          where('tipo_asistente', '==', tipoAsistente),
          orderBy('fecha', 'desc'),
          limit(maxLimit)
        );
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ConsultaIALog));

      // Reverse so it's chronologically ordered (oldest to newest) for Gemini context
      return list.reverse();
    } catch (err) {
      console.error('Error al obtener historial de IA:', err);
      return [];
    }
  }
}

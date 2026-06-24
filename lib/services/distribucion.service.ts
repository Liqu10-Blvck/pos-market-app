import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  runTransaction, 
  query, 
  where,
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface LogDistribucion {
  id: string;
  fecha: Timestamp;
  monto: number;
  origen: 'caja' | 'banco';
  destino_tipo: 'gasto' | 'meta_financiera';
  destino_id: string;
  destino_nombre: string;
  descripcion: string;
  usuario_uid: string;
}

export class DistribucionService {
  private static readonly HISTORIAL_COLLECTION = 'distribucion_fondos';

  /**
   * Distribuye fondos de manera virtual desde Caja/Banco hacia un gasto programado o una meta financiera.
   */
  static async distribuirFondos(data: {
    monto: number;
    origen: 'caja' | 'banco';
    destinoTipo: 'gasto' | 'meta_financiera';
    destinoId: string;
    destinoNombre: string;
    descripcion: string;
    usuarioUid: string;
  }): Promise<void> {
    const { monto, origen, destinoTipo, destinoId, destinoNombre, descripcion, usuarioUid } = data;

    if (monto <= 0) {
      throw new Error('El monto a distribuir debe ser mayor que cero.');
    }

    return await runTransaction(db, async (transaction) => {
      let targetRef;
      
      if (destinoTipo === 'gasto') {
        targetRef = doc(db, 'gastos_programados', destinoId);
      } else {
        targetRef = doc(db, 'metas_financieras', destinoId);
      }

      const targetSnap = await transaction.get(targetRef);

      if (!targetSnap.exists()) {
        throw new Error('El destino de la distribución no existe.');
      }

      const targetData = targetSnap.data();
      const montoAsignadoActual = targetData.monto_asignado || 0;
      const montoTotalRequerido = destinoTipo === 'gasto' ? targetData.monto : targetData.monto_objetivo;

      // Calcular nuevo asignado
      const nuevoAsignado = Math.min(montoTotalRequerido, montoAsignadoActual + monto);

      // Si ya está totalmente financiado
      if (montoAsignadoActual >= montoTotalRequerido) {
        throw new Error('El destino ya está completamente financiado.');
      }

      // Actualizar el destino
      transaction.update(targetRef, {
        monto_asignado: nuevoAsignado,
        ...(destinoTipo === 'meta_financiera' && nuevoAsignado >= montoTotalRequerido ? { completada: true } : {})
      });

      // Crear log de distribución
      const logRef = doc(collection(db, this.HISTORIAL_COLLECTION));
      const logData: Omit<LogDistribucion, 'id'> = {
        fecha: Timestamp.now(),
        monto: monto,
        origen,
        destino_tipo: destinoTipo,
        destino_id: destinoId,
        destino_nombre: destinoNombre,
        descripcion,
        usuario_uid: usuarioUid
      };

      transaction.set(logRef, logData);
    });
  }

  /**
   * Obtiene la suma total de fondos virtuales asignados a gastos o metas activas (no pagados/completados).
   * Útil para calcular el saldo "libre" o "no asignado".
   */
  static async obtenerFondosAsignadosTotales(): Promise<{ caja: number; banco: number }> {
    try {
      // 1. Obtener gastos programados pendientes
      const qGastos = query(collection(db, 'gastos_programados'), where('pagado', '==', false));
      const snapGastos = await getDocs(qGastos);
      
      // 2. Obtener metas financieras no completadas
      const qMetas = query(collection(db, 'metas_financieras'), where('completada', '==', false));
      const snapMetas = await getDocs(qMetas);

      // Sumamos las asignaciones actuales
      // Nota: Dado que la asignación es un valor virtual acumulado,
      // para saber el origen ('caja' | 'banco') de esas asignaciones, podemos consultar los logs de distribución.
      // Sin embargo, una forma más simple y directa es consultar los logs de distribución de fondos acumulados
      // y restar los que ya se hayan ejecutado (pagado).
      // Por simplicidad en la UI, calculamos el total virtual asignado y dejamos que el usuario visualice
      // el desglose a nivel de logs.
      
      let asignadoCaja = 0;
      let asignadoBanco = 0;

      // Obtener todos los logs de distribución para calcular el saldo asignado neto
      const logsSnap = await getDocs(collection(db, this.HISTORIAL_COLLECTION));
      const logs = logsSnap.docs.map(d => d.data() as LogDistribucion);

      // También necesitamos saber qué gastos ya fueron pagados para no contarlos como asignados activos.
      const gastosPagadosIds = new Set<string>();
      const gastosSnap = await getDocs(query(collection(db, 'gastos_programados'), where('pagado', '==', true)));
      gastosSnap.docs.forEach(d => gastosPagadosIds.add(d.id));

      const metasCompletadasIds = new Set<string>();
      const metasSnap = await getDocs(query(collection(db, 'metas_financieras'), where('completada', '==', true)));
      metasSnap.docs.forEach(d => metasCompletadasIds.add(d.id));

      logs.forEach(log => {
        // Si el destino es un gasto que ya se pagó o una meta completada, ya no resta del saldo "activo asignado"
        if (log.destino_tipo === 'gasto' && gastosPagadosIds.has(log.destino_id)) return;
        if (log.destino_tipo === 'meta_financiera' && metasCompletadasIds.has(log.destino_id)) return;

        if (log.origen === 'caja') {
          asignadoCaja += log.monto;
        } else {
          asignadoBanco += log.monto;
        }
      });

      return {
        caja: asignadoCaja,
        banco: asignadoBanco
      };
    } catch (err) {
      console.error('Error al obtener fondos asignados totales:', err);
      return { caja: 0, banco: 0 };
    }
  }

  /**
   * Obtiene el historial de distribuciones realizadas.
   */
  static async obtenerHistorial(maxLimit: number = 50): Promise<LogDistribucion[]> {
    try {
      const q = query(
        collection(db, this.HISTORIAL_COLLECTION),
        orderBy('fecha', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LogDistribucion));
    } catch (err) {
      console.error('Error al obtener historial de distribuciones:', err);
      return [];
    }
  }
}

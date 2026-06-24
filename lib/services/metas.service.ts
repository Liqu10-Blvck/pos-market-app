import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface MetaFinanciera {
  id: string;
  nombre: string;
  monto_objetivo: number;
  monto_asignado: number;
  fecha_limite?: Timestamp | null;
  completada: boolean;
  createdAt: Timestamp;
}

export class MetasService {
  private static readonly METAS_METADATA_REF = doc(db, 'metadata', 'metas');
  private static readonly METAS_FINANCIERAS_COLLECTION = 'metas_financieras';

  /**
   * Obtiene la meta de ventas diaria configurada.
   */
  static async obtenerMetaDiaria(): Promise<number> {
    try {
      const snap = await getDoc(this.METAS_METADATA_REF);
      if (snap.exists()) {
        return snap.data().objetivo_diario || 100000;
      }
      return 100000; // Meta por defecto: $100.000 CLP
    } catch (err) {
      console.error('Error al obtener meta diaria:', err);
      return 100000;
    }
  }

  /**
   * Guarda la meta de ventas diaria.
   */
  static async guardarMetaDiaria(monto: number, usuarioUid?: string): Promise<void> {
    try {
      await setDoc(this.METAS_METADATA_REF, {
        objetivo_diario: monto,
        updatedAt: Timestamp.now(),
        ...(usuarioUid ? { updatedBy: usuarioUid } : {})
      }, { merge: true });
    } catch (err) {
      console.error('Error al guardar meta diaria:', err);
      throw err;
    }
  }

  /**
   * Obtiene el acumulado de ventas reales para el día, semana y mes actual,
   * junto con las metas correspondientes.
   */
  static async obtenerProgresoMetas(): Promise<{
    metaDiaria: number;
    metaSemanal: number;
    metaMensual: number;
    ventasDia: number;
    ventasSemana: number;
    ventasMes: number;
  }> {
    const metaDiaria = await this.obtenerMetaDiaria();
    const metaSemanal = metaDiaria * 7;
    const metaMensual = metaDiaria * 30; // Estimación simple de 30 días

    const ahora = new Date();
    
    // Inicio del día (00:00:00)
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    // Inicio de la semana (Lunes de esta semana)
    const diaSemana = ahora.getDay();
    const diferenciaLunes = diaSemana === 0 ? -6 : 1 - diaSemana; // Ajustar si hoy es Domingo (0)
    const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + diferenciaLunes);
    inicioSemana.setHours(0, 0, 0, 0);

    // Inicio del mes (Día 1)
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    try {
      // Consultar ventas desde el inicio del mes (que cubre el día y la semana también)
      const q = query(
        collection(db, 'ventas'),
        where('fecha', '>=', Timestamp.fromDate(inicioMes))
      );

      const snap = await getDocs(q);
      let ventasDia = 0;
      let ventasSemana = 0;
      let ventasMes = 0;

      const tsInicioDia = Timestamp.fromDate(inicioDia).toMillis();
      const tsInicioSemana = Timestamp.fromDate(inicioSemana).toMillis();

      snap.docs.forEach(docSnap => {
        const venta = docSnap.data();
        const total = venta.total || 0;
        const fechaMillis = venta.fecha ? venta.fecha.toMillis() : 0;

        if (fechaMillis >= tsInicioDia) {
          ventasDia += total;
        }
        if (fechaMillis >= tsInicioSemana) {
          ventasSemana += total;
        }
        ventasMes += total;
      });

      return {
        metaDiaria,
        metaSemanal,
        metaMensual,
        ventasDia: Math.round(ventasDia),
        ventasSemana: Math.round(ventasSemana),
        ventasMes: Math.round(ventasMes)
      };
    } catch (err) {
      console.error('Error al calcular progreso de ventas:', err);
      return {
        metaDiaria,
        metaSemanal,
        metaMensual,
        ventasDia: 0,
        ventasSemana: 0,
        ventasMes: 0
      };
    }
  }

  /**
   * Crea una meta de ahorro / reinversión financiera.
   */
  static async crearMetaFinanciera(
    nombre: string, 
    montoObjetivo: number, 
    fechaLimite?: Date | null
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.METAS_FINANCIERAS_COLLECTION), {
        nombre,
        monto_objetivo: montoObjetivo,
        monto_asignado: 0,
        fecha_limite: fechaLimite ? Timestamp.fromDate(fechaLimite) : null,
        completada: false,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear meta financiera:', err);
      throw err;
    }
  }

  /**
   * Obtiene la lista de metas de ahorro / reinversión activas.
   */
  static async obtenerMetasFinancieras(): Promise<MetaFinanciera[]> {
    try {
      const q = query(
        collection(db, this.METAS_FINANCIERAS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MetaFinanciera));
    } catch (err) {
      console.error('Error al obtener metas financieras:', err);
      return [];
    }
  }
}

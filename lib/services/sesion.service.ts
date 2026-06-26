import { 
  collection, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { SesionCaja, ResumenSesion, DatosFinalesCierre } from '../types/pos';
import { VentasService } from './ventas.service';

export class SesionService {
  private static readonly COLLECTION = 'sesiones_caja';

  static async abrirSesion(montoInicial: number, vendedorId?: string, vendedorNombre?: string): Promise<string> {
    const sesionActiva = await this.obtenerSesionActiva();
    
    if (sesionActiva) {
      throw new Error('Ya existe una sesión activa. Debe cerrarla antes de abrir una nueva.');
    }

    const sesionRef = doc(collection(db, this.COLLECTION));

    const sesionDataBase: Omit<SesionCaja, 'id'> = {
      fecha_apertura: Timestamp.now(),
      monto_inicial: montoInicial,
      cerrada: false
    };

    const sesionData: Omit<SesionCaja, 'id'> = {
      ...sesionDataBase,
      ...(vendedorId ? { vendedor_id: vendedorId } : {}),
      ...(vendedorNombre ? { vendedor_nombre: vendedorNombre } : {})
    };

    await setDoc(sesionRef, sesionData);
    return sesionRef.id;
  }

  static async cerrarSesion(
    sesionId: string, 
    montoFinalReal: number,
    emailDestino?: string
  ): Promise<void> {
    const sesionRef = doc(db, this.COLLECTION, sesionId);
    const sesionSnap = await getDoc(sesionRef);

    if (!sesionSnap.exists()) {
      throw new Error('Sesión no encontrada');
    }

    const sesion = sesionSnap.data() as SesionCaja;

    if (sesion.cerrada) {
      throw new Error('La sesión ya está cerrada');
    }

    const resumen = await VentasService.obtenerResumenSesion(sesionId);
    const montoFinalEsperado = sesion.monto_inicial + resumen.total_efectivo;
    const diferencia = montoFinalReal - montoFinalEsperado;

    await updateDoc(sesionRef, {
      fecha_cierre: Timestamp.now(),
      monto_final_esperado: montoFinalEsperado,
      monto_final_real: montoFinalReal,
      diferencia: diferencia,
      cerrada: true,
      total_ventas: resumen.total_ventas,
      total_efectivo: resumen.total_efectivo,
      total_transferencia: resumen.total_transferencia,
      total_tarjeta: resumen.total_tarjeta,
      total_fiado: resumen.total_fiado,
      cantidad_ventas: resumen.cantidad_ventas
    });

    if (emailDestino) {
      await this.enviarResumenEmail(sesionId, emailDestino, resumen, {
        monto_inicial: sesion.monto_inicial,
        monto_final_esperado: montoFinalEsperado,
        monto_final_real: montoFinalReal,
        diferencia: diferencia
      });
    }
  }

  static async obtenerSesionActiva(): Promise<SesionCaja | null> {
    const q = query(
      collection(db, this.COLLECTION),
      where('cerrada', '==', false)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const docs = snapshot.docs.sort((a, b) => {
      const fechaA = a.data().fecha_apertura?.toMillis?.() ?? 0;
      const fechaB = b.data().fecha_apertura?.toMillis?.() ?? 0;
      return fechaB - fechaA;
    });

    const doc = docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as SesionCaja;
  }

  static async obtenerSesion(sesionId: string): Promise<SesionCaja | null> {
    const sesionRef = doc(db, this.COLLECTION, sesionId);
    const sesionSnap = await getDoc(sesionRef);

    if (!sesionSnap.exists()) {
      return null;
    }

    return {
      id: sesionSnap.id,
      ...sesionSnap.data()
    } as SesionCaja;
  }

  private static async enviarResumenEmail(
    sesionId: string,
    emailDestino: string,
    resumen: ResumenSesion,
    datosFinales: DatosFinalesCierre
  ): Promise<void> {
    console.log('Enviando resumen de cierre de caja:', {
      sesionId,
      emailDestino,
      resumen,
      datosFinales
    });
  }
}

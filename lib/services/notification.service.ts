import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notificacion } from '@/lib/types/pos';
import { addDoc } from 'firebase/firestore';

export const NotificationService = {
  /**
   * Escucha notificaciones en tiempo real para un tenant y sucursal.
   * Simplificado para evitar índices compuestos complejos.
   */
  subscribe: (
    tenantId: string, 
    sucursalId: string | undefined, 
    callback: (notifs: Notificacion[]) => void
  ) => {
    // Filtramos por tenantId y ordenamos por fecha (índice simple)
    const q = query(
      collection(db, 'notificaciones'),
      where('tenantId', '==', tenantId),
      orderBy('fecha', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      let notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notificacion[];

      // Filtrado manual de sucursalId para evitar el índice compuesto que pide Firebase
      if (sucursalId) {
        notifs = notifs.filter(n => 
          !n.sucursalId || n.sucursalId === '' || n.sucursalId === sucursalId
        );
      }

      callback(notifs.slice(0, 20));
    });
  },

  /**
   * Marca una notificación como leída.
   */
  marcarLeida: async (id: string) => {
    const docRef = doc(db, 'notificaciones', id);
    await updateDoc(docRef, { leida: true });
  },

  /**
   * Marca todas las notificaciones de un tenant/sucursal como leídas.
   */
  marcarTodasComoLeidas: async (tenantId: string, sucursalId?: string, notificaciones?: Notificacion[]) => {
    if (!notificaciones || notificaciones.length === 0) return;
    
    const batch = writeBatch(db);
    notificaciones.forEach(n => {
      if (!n.leida) {
        const docRef = doc(db, 'notificaciones', n.id);
        batch.update(docRef, { leida: true });
      }
    });
    
    await batch.commit();
  },

  /**
   * Crea una nueva notificación.
   */
  crear: async (notificacion: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) => {
    const docRef = collection(db, 'notificaciones');
    await addDoc(docRef, {
      ...notificacion,
      fecha: Timestamp.now(),
      leida: false
    });
  },

  /**
   * Asegura que exista al menos una notificación de bienvenida para el tenant.
   */
  bootstrap: async (tenantId: string, sucursalId?: string) => {
    const q = query(
      collection(db, 'notificaciones'),
      where('tenantId', '==', tenantId),
      limit(1)
    );
    
    // Si no hay notificaciones, creamos una de bienvenida
    const unsub = onSnapshot(q, async (snap) => {
      unsub(); // Desuscribir inmediatamente
      if (snap.empty) {
        await addDoc(collection(db, 'notificaciones'), {
          tenantId,
          sucursalId: sucursalId || '',
          titulo: '¡BIENVENIDO A FRUTAPOS!',
          mensaje: 'Tu sistema administrativo ha sido activado. Aquí recibirás alertas de stock, vencimientos y reportes diarios.',
          tipo: 'info',
          fecha: Timestamp.now(),
          leida: false
        });
      }
    });
  }
};

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedTestNotification(tenantId: string, sucursalId?: string) {
  try {
    await addDoc(collection(db, 'notificaciones'), {
      tenantId,
      sucursalId: sucursalId || null,
      titulo: 'Stock Crítico: Palta Hass',
      mensaje: 'El lote L-HASS-001 ha bajado de los 50kg. Se recomienda reponer pronto.',
      tipo: 'stock',
      leida: false,
      prioridad: 'alta',
      fecha: Timestamp.now()
    });
    console.log('Notificación de prueba creada');
  } catch (err) {
    console.error('Error al crear notificación:', err);
  }
}

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
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Cliente, PagoCredito } from '../types/pos';
import { sanitizeFirestoreData } from '../utils';

export class ClienteService {
  private static readonly COLLECTION = 'clientes';
  private static readonly ABONOS_COLLECTION = 'abonos_credito';

  static async registrarAbono(
    clienteId: string,
    monto: number,
    metodoPago: string,
    observaciones?: string,
    vendedorId?: string
  ): Promise<string> {
    if (monto <= 0) throw new Error('El monto del abono debe ser mayor a cero');

    const abonoRef = doc(collection(db, this.ABONOS_COLLECTION));
    const clienteRef = doc(db, this.COLLECTION, clienteId);

    return await runTransaction(db, async (transaction) => {
      const clienteSnap = await transaction.get(clienteRef);
      if (!clienteSnap.exists()) throw new Error('Cliente no encontrado');

      const cliente = clienteSnap.data() as Cliente;
      const saldoActual = cliente.saldo_pendiente || 0;

      // Register the payment
      const abonoData: Omit<PagoCredito, 'id'> = {
        cliente_id: clienteId,
        monto,
        metodo_pago: metodoPago,
        fecha_pago: Timestamp.now(),
        observaciones: observaciones || '',
        vendedor_id: vendedorId || ''
      };

      transaction.set(abonoRef, sanitizeFirestoreData(abonoData));

      // Update client balance
      transaction.update(clienteRef, {
        saldo_pendiente: increment(-monto),
        updatedAt: Timestamp.now()
      });

      return abonoRef.id;
    });
  }

  static async obtenerHistorialAbonos(clienteId: string): Promise<PagoCredito[]> {
    const q = query(
      collection(db, this.ABONOS_COLLECTION),
      where('cliente_id', '==', clienteId),
      orderBy('fecha_pago', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PagoCredito));
  }

  static async obtenerCliente(clienteId: string): Promise<Cliente | null> {
    const docRef = doc(db, this.COLLECTION, clienteId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Cliente;
  }
}

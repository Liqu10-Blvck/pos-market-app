import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { Cliente } from '../types/pos';

export class ClientesService {
  private static readonly COLLECTION = 'clientes';

  /**
   * Suscribe a los cambios de clientes en tiempo real, ordenados alfabéticamente por nombre.
   */
  static suscribirAClientes(callback: (clientes: Cliente[]) => void) {
    return onSnapshot(collection(db, this.COLLECTION), (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[];
      
      const ordenados = clientesData.sort((a, b) => a.nombre.localeCompare(b.nombre));
      callback(ordenados);
    });
  }

  /**
   * Crea un nuevo cliente en Firestore.
   */
  static async crearCliente(data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'activo'> & { activo?: boolean }): Promise<string> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      nombre: data.nombre,
      telefono: data.telefono || null,
      saldo_deuda: data.saldo_deuda || 0,
      direccion: data.direccion || null,
      nombre_negocio: data.nombre_negocio || null,
      rubro_negocio: data.rubro_negocio || null,
      limite_credito: data.limite_credito || null,
      activo: data.activo !== false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  }

  /**
   * Actualiza los datos de un cliente existente.
   */
  static async actualizarCliente(id: string, data: Partial<Cliente>): Promise<void> {
    const docRef = doc(db, this.COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Registra un abono de deuda para un cliente.
   * Disminuye su saldo_deuda y registra un asiento contable.
   */
  static async registrarAbono(
    clienteId: string,
    monto: number,
    metodoPago: 'efectivo' | 'transferencia'
  ): Promise<void> {
    if (monto <= 0) throw new Error('El monto del abono debe ser mayor a cero');

    await runTransaction(db, async (transaction) => {
      const clienteRef = doc(db, this.COLLECTION, clienteId);
      const clienteSnap = await transaction.get(clienteRef);

      if (!clienteSnap.exists()) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clienteSnap.data() as Cliente;
      const nuevoSaldo = Math.max(0, (cliente.saldo_deuda || 0) - monto);

      // 1. Actualizar el saldo del cliente
      transaction.update(clienteRef, {
        saldo_deuda: nuevoSaldo,
        updatedAt: Timestamp.now()
      });

      // 2. Crear Asiento Contable
      const metadataContabilidadRef = doc(db, 'metadata', 'contabilidad');
      const metadataContabilidadSnap = await transaction.get(metadataContabilidadRef);
      let ultimoNumeroAsiento = 0;
      if (metadataContabilidadSnap.exists()) {
        ultimoNumeroAsiento = metadataContabilidadSnap.data().ultimo_numero_asiento || 0;
      }

      const debitCuentaCodigo = metodoPago === 'efectivo' ? '1.1.01' : '1.1.02';
      const debitCuentaNombre = metodoPago === 'efectivo' ? 'Caja' : 'Banco';

      const movimientos = [
        { cuenta_codigo: debitCuentaCodigo, cuenta_nombre: debitCuentaNombre, debe: monto, haber: 0 },
        { cuenta_codigo: '1.1.04', cuenta_nombre: 'Clientes', debe: 0, haber: monto }
      ];

      const { ContabilidadService } = await import('./contabilidad.service');
      ContabilidadService.registrarAsientoEnTransaccion(
        transaction,
        metadataContabilidadRef,
        ultimoNumeroAsiento,
        `Abono de deuda - Cliente: ${cliente.nombre}`,
        'pago',
        movimientos,
        clienteId
      );
    });
  }
}

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  updateDoc, 
  query, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from '../types/pos';

export interface UserDB {
  uid: string;
  nombre: string;
  email: string;
  role: 'admin' | 'cashier';
  activo: boolean;
  createdAt: Timestamp;
}

export class UsuariosService {
  private static readonly COLLECTION = 'usuarios';

  /**
   * Obtiene la lista de todos los usuarios registrados en Firestore.
   */
  static async listarUsuarios(): Promise<UserDB[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({
        uid: doc.id,
        id: doc.id,
        ...doc.data()
      } as unknown as UserDB));
    } catch (err) {
      console.error('Error al listar usuarios:', err);
      return [];
    }
  }

  /**
   * Crea un usuario mediante la API interna (para evitar desloguear al administrador actual).
   */
  static async crearUsuario(data: Omit<UserDB, 'uid' | 'activo' | 'createdAt'> & { password: string }): Promise<void> {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: data.nombre,
        email: data.email,
        password: data.password,
        role: data.role
      })
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Error al crear el usuario.');
    }
  }

  /**
   * Cambia el estado de activación de un usuario.
   */
  static async cambiarEstadoActivo(uid: string, activo: boolean): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION, uid);
      await updateDoc(userRef, {
        activo,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error al cambiar estado del usuario:', err);
      throw err;
    }
  }
}

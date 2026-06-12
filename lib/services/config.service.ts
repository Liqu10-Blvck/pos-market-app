import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant, Sucursal } from '../types/pos';

export class ConfigService {
  private static readonly TENANTS_COLLECTION = 'tenants';
  private static readonly SUCURSALES_COLLECTION = 'sucursales';
  private static readonly USUARIOS_COLLECTION = 'usuarios';

  // --- Tenant Management ---
  
  static async obtenerTenant(tenantId: string): Promise<Tenant | null> {
    const docRef = doc(db, this.TENANTS_COLLECTION, tenantId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Tenant;
    }
    return null;
  }

  static async guardarTenant(tenantData: Partial<Tenant> & { id: string }) {
    const docRef = doc(db, this.TENANTS_COLLECTION, tenantData.id);
    await setDoc(docRef, {
      ...tenantData,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  // --- Sucursal Management ---

  static async obtenerSucursales(tenantId: string): Promise<Sucursal[]> {
    const q = query(
      collection(db, this.SUCURSALES_COLLECTION),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sucursal));
  }

  static async guardarSucursal(sucursalData: Partial<Sucursal> & { id?: string, tenantId: string }) {
    const id = sucursalData.id || `SUC-${Date.now()}`;
    const docRef = doc(db, this.SUCURSALES_COLLECTION, id);
    await setDoc(docRef, {
      ...sucursalData,
      id,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return id;
  }

  // --- Business Rules ---
  
  static async actualizarReglasSucursal(sucursalId: string, reglas: Sucursal['configuracion']) {
    const docRef = doc(db, this.SUCURSALES_COLLECTION, sucursalId);
    await updateDoc(docRef, {
      configuracion: reglas,
      updatedAt: Timestamp.now()
    });
  }

  // --- User Management ---

  static async obtenerUsuarios(tenantId: string): Promise<any[]> {
    const q = query(
      collection(db, this.USUARIOS_COLLECTION),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async guardarUsuario(userData: any) {
    const docRef = doc(db, this.USUARIOS_COLLECTION, userData.id || `USR-${Date.now()}`);
    await setDoc(docRef, {
      ...userData,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }
}

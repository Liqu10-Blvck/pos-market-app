import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage } from '../firebase/storage';
import { Producto } from '../types/pos';

export class ProductosService {
  private static readonly COLLECTION = 'productos';

  /**
   * Suscribe a los cambios de productos en tiempo real, ordenados alfabéticamente por nombre.
   */
  static suscribirAProductos(callback: (productos: Producto[]) => void) {
    return onSnapshot(collection(db, this.COLLECTION), (snapshot) => {
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];
      
      // Ordenar alfabéticamente
      const ordenados = productosData.sort((a, b) => a.nombre.localeCompare(b.nombre));
      callback(ordenados);
    });
  }

  /**
   * Guarda un producto (Crear nuevo o Actualizar existente).
   */
  static async guardarProducto(
    id: string | undefined,
    data: Omit<Producto, 'id' | 'createdAt' | 'updatedAt' | 'imagen_url'> & { imagen_url?: string | null },
    imagenFile: File | null,
    removedImage: boolean
  ): Promise<string> {
    const isNew = !id;
    let docRef;
    let targetId: string;

    if (isNew) {
      docRef = doc(collection(db, this.COLLECTION));
      targetId = docRef.id;
    } else {
      targetId = id!;
      docRef = doc(db, this.COLLECTION, targetId);
    }

    let finalImageUrl = data.imagen_url || '';

    // Subir imagen a Storage si hay un archivo nuevo
    if (imagenFile) {
      const storagePath = `productos/${targetId}/main_${Date.now()}.jpg`;
      finalImageUrl = await uploadImage(storagePath, imagenFile);
    } else if (removedImage) {
      finalImageUrl = '';
    }

    const productoData: Omit<Producto, 'id' | 'createdAt'> & { updatedAt: Timestamp } = {
      nombre: data.nombre,
      precio: data.precio,
      unidad: data.unidad,
      stock_actual: data.stock_actual,
      sku: data.sku || undefined,
      fecha_caducidad: data.fecha_caducidad || undefined,
      costo_actual: data.costo_actual !== undefined ? data.costo_actual : undefined,
      margen_deseado: data.margen_deseado !== undefined ? data.margen_deseado : undefined,
      es_interes: data.es_interes || false,
      cantidad_por_caja: data.cantidad_por_caja !== undefined ? data.cantidad_por_caja : undefined,
      precio_caja: data.precio_caja !== undefined ? data.precio_caja : undefined,
      tipo_empaque: data.tipo_empaque ? data.tipo_empaque.trim() : undefined,
      categoria: data.categoria ? data.categoria.trim() : undefined,
      calidad: data.calidad ? data.calidad.trim() : undefined,
      facturable: data.facturable !== false,
      activo: true,
      imagen_url: finalImageUrl || undefined,
      updatedAt: Timestamp.now()
    };

    if (isNew) {
      await setDoc(docRef, {
        ...productoData,
        createdAt: Timestamp.now()
      });
    } else {
      await updateDoc(docRef, productoData);
    }

    return targetId;
  }
}

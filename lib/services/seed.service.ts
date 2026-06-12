import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Producto, Lote, Cliente, UnidadMedida } from '../types/pos';

const PRODUCTOS_REALES = [
  { nombre: 'Manzana Fuji Extra', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 1800, variedad: 'Fuji' },
  { nombre: 'Plátano Cavendish', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 1200, variedad: 'Cavendish' },
  { nombre: 'Tomate Larga Vida', categoria: 'Verduras', unidad: 'kg' as UnidadMedida, precio: 1500, variedad: 'Larga Vida' },
  { nombre: 'Cebolla Morada', categoria: 'Verduras', unidad: 'kg' as UnidadMedida, precio: 900, variedad: 'Morada' },
  { nombre: 'Palta Hass Premium', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 4500, variedad: 'Hass' },
  { nombre: 'Naranja Valencia', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 1100, variedad: 'Valencia' },
  { nombre: 'Papa Russet', categoria: 'Verduras', unidad: 'kg' as UnidadMedida, precio: 800, variedad: 'Russet' },
  { nombre: 'Limón Sutil', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 2200, variedad: 'Sutil' },
  { nombre: 'Zanahoria Seleccionada', categoria: 'Verduras', unidad: 'kg' as UnidadMedida, precio: 700, variedad: 'N/A' },
  { nombre: 'Pimentón Rojo', categoria: 'Verduras', unidad: 'unid' as UnidadMedida, precio: 800, variedad: 'California' },
  { nombre: 'Lechuga Escarola', categoria: 'Verduras', unidad: 'unid' as UnidadMedida, precio: 1200, variedad: 'Hidropónica' },
  { nombre: 'Uva Red Globe', categoria: 'Frutas', unidad: 'kg' as UnidadMedida, precio: 2500, variedad: 'Red Globe' },
  { nombre: 'Ajo Morado', categoria: 'Verduras', unidad: 'unid' as UnidadMedida, precio: 500, variedad: 'Mendocino' },
  { nombre: 'Pepino Ensalada', categoria: 'Verduras', unidad: 'unid' as UnidadMedida, precio: 600, variedad: 'N/A' },
  { nombre: 'Brócoli Fresco', categoria: 'Verduras', unidad: 'unid' as UnidadMedida, precio: 1600, variedad: 'N/A' }
];

const CLIENTES_REALES = [
  { nombre: 'Minimarket Los Jardines', rut: '77.234.555-1', empresa: 'Comercial Jardines SpA', email: 'contacto@losjardines.cl' },
  { nombre: 'Restaurante El Gourmet', rut: '76.111.444-K', empresa: 'Inversiones Gourmet Ltda', email: 'finanzas@gourmet.cl' },
  { nombre: 'Frutería Mi Barrio', rut: '78.999.000-2', empresa: 'Juan Perez EIRL', email: 'mibarrio@gmail.com' },
  { nombre: 'Hotel Plaza Santiago', rut: '76.444.333-5', empresa: 'Hoteles del Sur S.A.', email: 'compras@hotelplaza.cl' }
];

export class SeedService {
  static async seed(tenantId: string, sucursalId: string) {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    // 1. Sembrar Productos
    for (const p of PRODUCTOS_REALES) {
      const productoId = `PROD-${p.nombre.replace(/\s+/g, '-').toUpperCase()}`;
      const productoRef = doc(db, 'productos', productoId);
      
      const nuevoProducto: Producto = {
        id: productoId,
        tenantId,
        sucursalId,
        nombre: p.nombre,
        precio: p.precio,
        unidad: p.unidad,
        stock_actual: 150,
        stock_cajas: 10,
        activo: true,
        precio_bloqueado: false,
        costo_referencia: p.precio * 0.65,
        createdAt: now
      };

      batch.set(productoRef, nuevoProducto);

      // 2. Crear un Lote inicial para cada producto
      const loteId = `LOTE-INIT-${productoId}`;
      const loteRef = doc(db, 'lotes', loteId);
      const nuevoLote: Lote = {
        id: loteId,
        tenantId,
        sucursalId,
        producto_id: productoId,
        nombre_producto: p.nombre,
        unidad: p.unidad,
        variedad: p.variedad,
        origen: 'nacional',
        calibres: [{ calibre: 'Primera', cantidad_cajas: 10 }],
        peso_total_neto: 150,
        costo_unidad: p.precio * 0.65,
        precio_sugerido: p.precio,
        tipo_bulto: 'bin',
        envase_id: 'generico',
        envase_cantidad_total: 10,
        fecha_ingreso: now,
        stock_actual_kg: 150,
        stock_actual_cajas: 10,
        estado: 'disponible'
      };

      batch.set(loteRef, nuevoLote);
    }

    // 3. Sembrar Clientes
    for (const c of CLIENTES_REALES) {
      const clienteId = `CLI-${c.rut.replace(/\./g, '').replace(/-/g, '')}`;
      const clienteRef = doc(db, 'clientes', clienteId);
      
      const nuevoCliente: Cliente = {
        id: clienteId,
        nombre: c.nombre,
        rut: c.rut,
        empresa: c.empresa,
        activo: true,
        saldo_deuda: 0,
        createdAt: now,
        updatedAt: now
      };

      batch.set(clienteRef, nuevoCliente);
    }

    await batch.commit();
    return true;
  }
}

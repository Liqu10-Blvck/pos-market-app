import { Producto } from '../../../lib/types/pos';

/**
 * Filtra los productos de catálogo de ventas por nombre o SKU.
 */
export const filtrarProductosVentas = (
  productos: Producto[], 
  searchQuery: string
): Producto[] => {
  const query = searchQuery.toLowerCase().trim();
  if (!query) return productos;
  
  return productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(query) ||
    (producto.sku && producto.sku.toLowerCase().includes(query))
  );
};

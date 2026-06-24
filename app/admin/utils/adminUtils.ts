import { Producto } from '../../../lib/types/pos';

/**
 * Calcula la cantidad de días restantes para la fecha de vencimiento dada.
 */
export const obtenerDiasParaVencer = (fechaCaducidad: string): number => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaCaducidad + 'T00:00:00');
  const diffTime = vencimiento.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Filtra la lista de productos basada en la pestaña activa del módulo admin.
 */
export const filtrarProductosAdmin = (
  productos: Producto[], 
  tabActiva: 'catalogo' | 'interes'
): Producto[] => {
  return productos.filter(p => {
    if (tabActiva === 'catalogo') {
      return p.es_interes !== true;
    } else {
      // Lista de Compra: manually flagged (es_interes === true) OR under stock threshold (stock_actual <= 5)
      return p.es_interes === true || (p.activo !== false && p.stock_actual <= 5);
    }
  });
};

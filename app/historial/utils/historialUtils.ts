import { Venta, Producto } from '../../../lib/types/pos';
import { format } from 'date-fns';

export interface VentasDia {
  fechaKey: string; // YYYY-MM-DD
  fechaDisplay: Date;
  ventas: Venta[];
  total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  fiado: number;
  cantidad: number;
}

/**
 * Agrupa las ventas por día.
 */
export const agruparVentasPorDia = (ventas: Venta[]): VentasDia[] => {
  const grupos: { [key: string]: VentasDia } = {};

  ventas.forEach(venta => {
    const date = venta.fecha.toDate();
    const key = format(date, 'yyyy-MM-dd');

    if (!grupos[key]) {
      grupos[key] = {
        fechaKey: key,
        fechaDisplay: date,
        ventas: [],
        total: 0,
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        fiado: 0,
        cantidad: 0
      };
    }

    grupos[key].ventas.push(venta);
    grupos[key].total += venta.total;
    grupos[key].cantidad += 1;

    switch (venta.metodo_pago) {
      case 'efectivo':
        grupos[key].efectivo += venta.total;
        break;
      case 'transferencia':
        grupos[key].transferencia += venta.total;
        break;
      case 'tarjeta':
        grupos[key].tarjeta += venta.total;
        break;
      case 'fiado':
        grupos[key].fiado += venta.total;
        break;
    }
  });

  return Object.values(grupos).sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
};

/**
 * Obtiene los 5 productos más vendidos del día seleccionado.
 */
export const obtenerProductosTopDelDia = (
  selectedDayData: VentasDia | null
): { nombre: string; cantidad: number; total: number; unidad: string }[] => {
  if (!selectedDayData) return [];
  const counts: { [nombre: string]: { cantidad: number; total: number; unidad: string } } = {};

  selectedDayData.ventas.forEach(venta => {
    venta.items.forEach(item => {
      const nombre = item.nombre;
      if (!counts[nombre]) {
        counts[nombre] = { cantidad: 0, total: 0, unidad: item.unidad };
      }
      counts[nombre].cantidad += item.neto;
      counts[nombre].total += item.total;
    });
  });

  return Object.entries(counts)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
};

/**
 * Filtra y analiza los productos que necesitan reposición.
 */
export const filtrarProductosAReponer = (
  productos: Producto[],
  umbralReposicion: number,
  busquedaReposicion: string
): Producto[] => {
  return productos
    .filter(p => p.activo !== false && p.es_interes !== true)
    .filter(p => p.stock_actual <= umbralReposicion)
    .filter(p => {
      if (!busquedaReposicion.trim()) return true;
      const term = busquedaReposicion.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(term) || 
        (p.sku && p.sku.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => a.stock_actual - b.stock_actual);
};

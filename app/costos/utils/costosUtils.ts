import { Producto } from '@/lib/types/pos';
import { roundToChileanDecena } from '@/lib/utils';

/**
 * Calculates the number of days until expiration.
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
 * Calculates the suggested retail price based on cost and margin.
 */
export const calcularPrecioSugerido = (
  costoInput: string | undefined,
  costoActual: number | undefined,
  margenInput: string | undefined
): number => {
  const costo = costoInput !== undefined && costoInput !== '' ? parseFloat(costoInput) : (costoActual || 0);
  const margen = parseFloat(margenInput || '30') || 0;
  
  if (costo <= 0) return 0;
  return roundToChileanDecena(Math.round(costo * (1 + margen / 100)));
};

/**
 * Determines if a product's current cost or margin inputs differ from its DB values.
 */
export const esDiferente = (
  p: Producto,
  nuevosCostos: Record<string, string>,
  margenesDeseados: Record<string, string>
): boolean => {
  const costoOriginal = (p.costo_actual !== undefined && p.costo_actual !== null) ? p.costo_actual.toString() : '';
  const margenOriginal = (p.margen_deseado !== undefined && p.margen_deseado !== null) ? p.margen_deseado.toString() : '30';
  
  const costoActual = nuevosCostos[p.id] || '';
  const margenActual = margenesDeseados[p.id] || '30';

  return costoOriginal !== costoActual || margenOriginal !== margenActual;
};

import { TipoEnvase } from '../types/pos';

export const TIPOS_ENVASES: TipoEnvase[] = [
  {
    id: 'toro_gamela',
    nombre: 'Toro / Gamela',
    precio_costo: 0,
    precio_venta: 1000, // Según mención previa de $1.000 por caja
    activo: true,
    // Peso de referencia para el vendedor (0.8 kg)
    peso_referencia: 0.8
  },
  {
    id: 'rejilla',
    nombre: 'Rejilla',
    precio_costo: 0,
    precio_venta: 0,
    activo: true,
    peso_referencia: 0.3
  },
  {
    id: 'bandeja',
    nombre: 'Bandeja',
    precio_costo: 0,
    precio_venta: 3000,
    activo: true,
    peso_referencia: 1.6
  }
];

// Extensión para incluir el peso de referencia en la interfaz si es necesario
export interface TipoEnvaseConPeso extends TipoEnvase {
  peso_referencia: number;
}

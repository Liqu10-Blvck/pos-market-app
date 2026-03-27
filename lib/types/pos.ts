import { Timestamp } from 'firebase/firestore';

export type UnidadMedida = 'kg' | 'unid' | 'pallet' | 'bin' | 'saco' | 'caja';
export type MetodoPago = 'efectivo' | 'transferencia' | 'fiado' | 'tarjeta';
export type ModoNegocio = 'retail' | 'wholesale';

export interface ConfiguracionNegocio {
  id: string;
  modo: ModoNegocio;
  nombre_negocio: string;
  rut_negocio?: string;
  direccion?: string;
  permitir_bins: boolean;
  permitir_pallets: boolean;
  tara_bin_defecto: number;
  tara_pallet_defecto: number;
  logo_url?: string;
  updatedAt: Timestamp;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  unidad: UnidadMedida;
  stock_actual: number;
  imagen_url?: string;
  activo?: boolean;
  
  // Wholesale extensions
  variedades?: string[]; // Ej: ['Hass', 'Edranol', 'Ester']
  calibres?: string[];   // Ej: ['Extra', '18', '20', '22']
  costo_referencia?: number;

  createdAt?: Timestamp;
}

export interface TipoEnvase {
  id: string;
  nombre: string;
  precio_costo: number;
  precio_venta: number; // Ej: $1.000
  activo: boolean;
  peso_referencia?: number; // Ej: 0.8
}

export interface Lote {
  id: string; // Código único (QR)
  partida_id?: string; // ID del grupo de llegada
  producto_id: string;
  nombre_producto: string;
  variedad: string; // Ej: Hass, Edranol
  origen: 'nacional' | 'internacional';
  calibres: LoteCalibre[]; // Desglose de cajas por calibre
  peso_total: number;
  costo_unidad: number;
  precio_sugerido: number;
  
  tipo_bulto: 'pallet' | 'bin';
  envase_id?: string; // Tipo de caja (ej: Toro)
  envase_cantidad_total: number;
  
  fecha_ingreso: Timestamp;
  stock_actual_kg: number;
  estado: 'disponible' | 'agotado' | 'reservado_parcial';
}

export interface LoteCalibre {
  calibre: string; // Ej: 'Extra', '18', '20'
  cantidad_cajas: number;
}

export interface Reserva {
  id: string;
  lote_id: string;
  cliente_id: string;
  cliente_nombre: string;
  cantidad_cajas?: number;
  peso_kg?: number;
  fecha_reserva: Timestamp;
  activo: boolean;
}

export interface ItemVenta {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  unidad: UnidadMedida;
  cantidad?: number;
  peso_bruto?: number;
  tara?: number;
  peso_neto: number;
  neto: number;
  total_fruta: number;
  total_envases: number;
  total: number;
  
  // Wholesale & Logistics
  calibre?: string;
  lote_id?: string;
  variedad?: string;
  envase_id?: string;
  envase_nombre?: string;
  envase_cantidad?: number;
  envase_precio_unitario?: number;
}

export interface Venta {
  id: string;
  items: ItemVenta[];
  total_fruta: number;
  total_envases: number;
  total: number; // total general
  metodo_pago: MetodoPago;
  cliente_id?: string;
  cliente_nombre?: string;
  sesion_id: string;
  fecha: Timestamp;
  numero_venta?: number;
  createdAt?: Timestamp;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  saldo_deuda: number;
  activo?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SesionCaja {
  id: string;
  fecha_apertura: Timestamp;
  monto_inicial: number;
  fecha_cierre?: Timestamp;
  monto_final_esperado?: number;
  monto_final_real?: number;
  diferencia?: number;
  cerrada: boolean;
  vendedor_id?: string;
  vendedor_nombre?: string;
  total_ventas?: number;
  total_efectivo?: number;
  total_transferencia?: number;
  total_tarjeta?: number;
  total_fiado?: number;
  cantidad_ventas?: number;
}

export interface CarritoItem extends ItemVenta {
  temp_id: string;
}

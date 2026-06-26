import { Timestamp } from 'firebase/firestore';

export type UnidadMedida = 'kg' | 'unid';
export type MetodoPago = 'efectivo' | 'transferencia' | 'fiado' | 'tarjeta';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  unidad: UnidadMedida;
  stock_actual: number;
  imagen_url?: string;
  activo?: boolean;
  costo_actual?: number;
  margen_deseado?: number;
  sku?: string;
  fecha_caducidad?: string;
  es_interes?: boolean;
  cantidad_por_caja?: number;
  precio_caja?: number;
  tipo_empaque?: string; // e.g. 'Caja', 'Saco', 'Malla', 'Bandeja'
  categoria?: string; // 'fruta', 'verdura', 'otros', etc.
  calidad?: string; // quality grade from wholesale price list, e.g. '1a', '2a', 'Extra', 'Corriente'
  facturable?: boolean;
  imagen_factura_url?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ItemVenta {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  unidad: UnidadMedida;
  cantidad?: number;
  peso_bruto?: number;
  tara?: number;
  neto: number;
  total: number;
  es_caja?: boolean;
  cantidad_por_caja?: number;
  tipo_empaque?: string; // e.g. 'Caja', 'Saco', 'Malla'
  facturable?: boolean;
}

export interface Venta {
  id: string;
  items: ItemVenta[];
  total: number;
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
  direccion?: string;
  nombre_negocio?: string;
  rubro_negocio?: string;
  limite_credito?: number;
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
}

export interface CostoDiario {
  id: string;
  producto_id: string;
  nombre: string;
  costo: number;
  fecha: Timestamp;
  createdAt: Timestamp;
}

export interface ConsultaIALog {
  id?: string;
  tipo_asistente: 'marketing' | 'contabilidad' | 'general';
  pregunta: string;
  respuesta: string;
  productos_vinculados: string[];
  fecha: Timestamp;
}

export interface RegistroPrecioMayorista {
  id?: string;
  fecha: Timestamp;
  producto_id: string;
  nombre: string;
  costo_local: number;
  precio_venta_local: number;
  precio_referencia: number;
}

export interface ProductAnalysisResponse {
  nombre: string;
  sku: string | null;
  fecha_caducidad: string | null;
  tiene_vencimiento: boolean;
  tipo_empaque: 'Caja' | 'Saco' | 'Malla' | 'Bandeja' | 'Paquete' | null;
  cantidad_por_caja: number | null;
  costo_caja: number | null;
  costo_unitario: number | null;
  precio_sugerido_unidad: number | null;
}

export interface ResumenSesion {
  total_ventas: number;
  total_efectivo: number;
  total_transferencia: number;
  total_tarjeta: number;
  total_fiado: number;
  cantidad_ventas: number;
  ventas_detalle: Venta[];
}

export interface DatosFinalesCierre {
  monto_inicial: number;
  monto_final_esperado: number;
  monto_final_real: number;
  diferencia: number;
}



import { Timestamp } from 'firebase/firestore';

export type UnidadMedida = 'kg' | 'unid' | 'caja';
export type MetodoPago = 'efectivo' | 'transferencia' | 'credito' | 'tarjeta';
export type ModoNegocio = 'retail' | 'wholesale';

export interface Tenant {
  id: string;
  nombre: string;
  rut: string;
  razonSocial: string;
  giro: string;
  direccion?: string;
  correoRepresentante?: string;
  logoUrl?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Sucursal {
  id: string;
  tenantId: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  configuracion: {
    permitirPallets: boolean;
    permitirBins: boolean;
    modoDefault: ModoNegocio;
    permitirVentaNegativa: boolean;
    precioBloqueadoDefault: boolean;
    permitirGastoEnvases: boolean;
  };
  activa: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface ConfiguracionNegocio {
  id: string; // Habitualmente el ID de la sucursal
  tenantId: string;
  modo: ModoNegocio;
  nombre_negocio: string;
  rut_negocio?: string;
  direccion?: string;
  permitir_bins: boolean;
  permitir_pallets: boolean;
  logo_url?: string;
  updatedAt: Timestamp;
}

export interface Producto {
  id: string;
  tenantId: string;
  sucursalId?: string; // Opcional si el producto es global para el tenant
  nombre: string;
  precio: number;
  precio_bloqueado?: boolean; // Regla: si true, solo admin/dueño puede cambiarlo al vender
  unidad: UnidadMedida;
  unidades_permitidas?: UnidadMedida[]; // Para productos que se venden de varias formas
  stock_actual: number;
  stock_cajas?: number; // Stock en bultos (cajas/sacos)
  imagen_url?: string;
  activo?: boolean;

  // Wholesale extensions
  costo_referencia?: number;

  createdAt?: Timestamp;
}

export interface TipoEnvase {
  id: string;
  nombre: string;
  precio_costo: number;
  precio_venta: number;
  activo: boolean;
  peso_referencia?: number; // Ej: 0.8
}

export interface Lote {
  id: string; // Código único (QR)
  tenantId: string;
  sucursalId: string;
  partida_id?: string; // ID del grupo de llegada
  producto_id: string;
  nombre_producto: string;
  unidad: UnidadMedida; // Unidad nativa del lote
  variedad: string; // Ej: Hass, Edranol
  origen: 'nacional' | 'internacional';
  calibres: LoteCalibre[]; // Desglose de cajas por calibre
  peso_total_neto: number; // Siempre valor neto según requerimiento
  costo_unidad: number;
  precio_sugerido: number;

  tipo_bulto: 'pallet' | 'bin';
  envase_id?: string; // Tipo de caja (ej: Toro)
  envase_cantidad_total: number;

  fecha_ingreso: Timestamp;
  stock_actual_kg: number;
  stock_actual_cajas: number; // Cantidad de bultos restantes
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
  precio_acordado?: number;
  total_estimado?: number;
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
  calibre?: string | null;
  lote_id?: string | null;
  variedad?: string | null;
  origen?: 'nacional' | 'internacional' | null;
  envase_id?: string | null;
  envase_nombre?: string | null;
  envase_cantidad?: number | null;
  envase_precio_unitario?: number | null;
}

export interface AjusteStock {
  id: string;
  lote_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad_kg: number;
  cantidad_cajas: number;
  motivo: string;
  fecha: Timestamp;
  usuario_id?: string;
  usuario_nombre?: string;
}

export interface Venta {
  id: string;
  tenantId: string;
  sucursalId: string;
  items: ItemVenta[];
  total_fruta: number;
  total_envases: number;
  total: number;
  metodo_pago: MetodoPago;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_rut?: string;
  sesion_id: string;
  vendedor_id: string;
  fecha: Timestamp;
  numero_venta: number;
  estado_pago: 'pagado' | 'pendiente' | 'parcial';
  estado_factura: 'no_requiere' | 'por_facturar' | 'facturado';
  nro_factura?: string;
  createdAt?: Timestamp;
}

export interface Cliente {
  id: string;
  nombre: string;
  rut?: string;
  empresa?: string;
  telefono?: string;
  saldo_deuda: number;
  limite_credito?: number; // Límite máximo de fiado
  saldo_pendiente?: number; // Total que debe actualmente
  activo?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PagoCredito {
  id: string;
  cliente_id: string;
  monto: number;
  metodo_pago: string;
  fecha_pago: Timestamp;
  nro_comprobante?: string;
  observaciones?: string;
  vendedor_id?: string;
}

export interface SesionCaja {
  id: string;
  tenantId: string;
  sucursalId: string;
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
  total_credito?: number;
  cantidad_ventas?: number;
}

export interface CarritoItem extends ItemVenta {
  temp_id: string;
}

export interface Notificacion {
  id: string;
  tenantId: string;
  sucursalId?: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error' | 'stock' | 'venta';
  leida: boolean;
  prioridad: 'baja' | 'media' | 'alta';
  link?: string;
  fecha: Timestamp;
}

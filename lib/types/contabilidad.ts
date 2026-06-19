import { Timestamp } from 'firebase/firestore';

export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso';

export interface CuentaContable {
  codigo: string; // e.g., '1.1.01'
  nombre: string; // e.g., 'Caja'
  tipo: TipoCuenta;
  descripcion?: string;
}

export interface MovimientoContable {
  cuenta_codigo: string;
  cuenta_nombre: string;
  debe: number;
  haber: number;
}

export interface AsientoContable {
  id: string;
  numero_asiento: number;
  fecha: Timestamp;
  glosa: string;
  tipo: 'venta' | 'compra' | 'gasto' | 'ajuste' | 'manual';
  referencia_id?: string; // ID of the sale or purchase invoice
  movimientos: MovimientoContable[];
  createdAt: Timestamp;
}

export type TipoDocumentoCompra = 'factura' | 'boleta' | 'recibo' | 'guia' | 'otro';

export interface FacturaCompra {
  id: string;
  tipo_documento?: TipoDocumentoCompra;
  numero_factura: string; // for backward compatibility
  numero_documento?: string; // generalized
  proveedor_rut: string;
  proveedor_nombre: string;
  fecha: Timestamp;
  neto: number;
  iva: number;
  total: number;
  metodo_pago: 'efectivo' | 'transferencia' | 'credito';
  productos: {
    producto_id: string;
    nombre: string;
    cantidad: number;
    costo_unitario: number;
  }[];
  imagen_factura_url?: string;
  createdAt: Timestamp;
}

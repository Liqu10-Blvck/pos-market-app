import { Timestamp } from 'firebase/firestore';
import { UnidadMedida, MetodoPago } from './pos';

export type EstadoPedido = 'pendiente' | 'preparado' | 'entregado' | 'cancelado';
export type EstadoPago = 'pendiente' | 'pagado';

export interface ItemPedido {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  unidad: UnidadMedida;
  cantidad: number;
  total: number;
  es_caja?: boolean;
  cantidad_por_caja?: number;
  tipo_empaque?: string;
}

export interface Pedido {
  id: string;
  numero_pedido: number;
  cliente_id?: string;
  cliente_nombre?: string;
  items: ItemPedido[];
  total: number;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago?: MetodoPago;
  notas?: string;
  direccion_entrega?: string;
  fecha: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

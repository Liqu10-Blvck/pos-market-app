import { Pedido, EstadoPedido, EstadoPago } from '@/lib/types/pedido';

/**
 * Filtra los pedidos según búsqueda de texto, estado de preparación y estado de pago.
 */
export function filtrarPedidos(
  pedidos: Pedido[],
  searchQuery: string,
  filtroEstado: EstadoPedido | 'todos',
  filtroPago: EstadoPago | 'todos'
): Pedido[] {
  return pedidos.filter((pedido) => {
    // 1. Filtro por búsqueda (Número de pedido o nombre de cliente)
    const matchSearch = searchQuery.trim() === '' || 
      pedido.numero_pedido.toString().includes(searchQuery) ||
      (pedido.cliente_nombre || '').toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Filtro por estado de pedido
    const matchEstado = filtroEstado === 'todos' || pedido.estado === filtroEstado;

    // 3. Filtro por estado de pago
    const matchPago = filtroPago === 'todos' || pedido.estado_pago === filtroPago;

    return matchSearch && matchEstado && matchPago;
  });
}

/**
 * Calcula los indicadores clave (KPIs) para el tablero de pedidos.
 */
export function calcularKPIsPedidos(pedidos: Pedido[]) {
  let totalPendientes = 0;
  let totalPreparados = 0;
  let montoPendienteCobro = 0;
  let entregadosHoy = 0;

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 999);

  pedidos.forEach((pedido) => {
    const isToday = pedido.fecha && 
      pedido.fecha.toDate().getTime() >= hoyInicio.getTime() && 
      pedido.fecha.toDate().getTime() <= hoyFin.getTime();

    if (pedido.estado === 'pendiente') {
      totalPendientes++;
    } else if (pedido.estado === 'preparado') {
      totalPreparados++;
    }

    // Sumar montos de pedidos no cobrados y no cancelados
    if (pedido.estado_pago === 'pendiente' && pedido.estado !== 'cancelado') {
      montoPendienteCobro += pedido.total;
    }

    // Pedidos entregados con éxito durante el día de hoy
    if (pedido.estado === 'entregado' && isToday) {
      entregadosHoy++;
    }
  });

  return {
    totalPendientes,
    totalPreparados,
    montoPendienteCobro,
    entregadosHoy
  };
}

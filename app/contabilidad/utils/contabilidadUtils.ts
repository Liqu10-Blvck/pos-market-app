import { AsientoContable, FacturaCompra } from '@/lib/types/contabilidad';
import { ContabilidadService } from '@/lib/services/contabilidad.service';
import { Producto } from '@/lib/types/pos';

/**
 * Calculates percentage completion, capped at 100%.
 */
export const calcPct = (actual: number, objetivo: number): number => {
  if (!objetivo) return 0;
  return Math.min(100, Math.round((actual / objetivo) * 100));
};

/**
 * Calculates the product flows (entradas/salidas) in a given date range.
 */
export const calcularProductFlow = (
  productos: Producto[],
  facturas: FacturaCompra[],
  flujoVentas: any[],
  flujoFechaInicio: string,
  flujoFechaFin: string
) => {
  const start = new Date(flujoFechaInicio + 'T00:00:00').getTime();
  const end = new Date(flujoFechaFin + 'T23:59:59').getTime();
  
  const flow: { [productoId: string]: { entradas: number; salidas: number } } = {};
  
  // Seed
  productos.forEach(p => {
    flow[p.id] = { entradas: 0, salidas: 0 };
  });

  // Accumulate purchases
  facturas.forEach(f => {
    const time = f.fecha.toDate().getTime();
    if (time >= start && time <= end && f.productos) {
      f.productos.forEach(p => {
        if (flow[p.producto_id]) {
          flow[p.producto_id].entradas += p.cantidad;
        }
      });
    }
  });

  // Accumulate sales
  flujoVentas.forEach(v => {
    if (v.items && Array.isArray(v.items)) {
      v.items.forEach((item: any) => {
        const pid = item.producto_id;
        if (flow[pid]) {
          const qty = item.cantidad || item.neto || 0;
          const mult = item.es_caja && item.cantidad_por_caja ? item.cantidad_por_caja : 1;
          flow[pid].salidas += qty * mult;
        }
      });
    }
  });

  return flow;
};

/**
 * Calculates the balance and KPIs from journal entries.
 */
export const calcularKPIsContables = (asientos: AsientoContable[]) => {
  const balances: { [codigo: string]: number } = {};
  
  // Seed initial balances to 0
  ContabilidadService.PLAN_CUENTAS.forEach(c => {
    balances[c.codigo] = 0;
  });

  asientos.forEach(asiento => {
    asiento.movimientos.forEach(mov => {
      const codigo = mov.cuenta_codigo;
      const cuenta = ContabilidadService.PLAN_CUENTAS.find(c => c.codigo === codigo);
      if (!cuenta) return;

      if (cuenta.tipo === 'activo' || cuenta.tipo === 'egreso') {
        balances[codigo] = (balances[codigo] || 0) + mov.debe - mov.haber;
      } else {
        balances[codigo] = (balances[codigo] || 0) - mov.debe + mov.haber;
      }
    });
  });

  const caja = balances['1.1.01'] || 0;
  const banco = balances['1.1.02'] || 0;
  const mercaderias = balances['1.1.03'] || 0;
  const clientes = balances['1.1.04'] || 0;
  const ivaCredito = balances['1.1.05'] || 0;

  const ivaDebito = balances['2.1.01'] || 0;
  const proveedores = balances['2.1.02'] || 0;
  const capitalInicial = balances['3.1.01'] || 0;
  const utilidadesAcumuladas = balances['3.1.02'] || 0;

  const ventas = balances['4.1.01'] || 0;
  const costoVentas = balances['5.1.01'] || 0;
  const gastosGenerales = balances['5.1.02'] || 0;

  const activosTotales = caja + banco + mercaderias + clientes + ivaCredito;
  const pasivosTotales = ivaDebito + proveedores;

  const utilidadBruta = ventas - costoVentas;
  const utilidadNeta = utilidadBruta - gastosGenerales;

  const ivaNeto = ivaDebito - ivaCredito;

  return {
    caja,
    banco,
    mercaderias,
    clientes,
    ivaCredito,
    ivaDebito,
    proveedores,
    capitalInicial,
    utilidadesAcumuladas,
    ventas,
    costoVentas,
    gastosGenerales,
    activosTotales,
    pasivosTotales,
    utilidadBruta,
    utilidadNeta,
    ivaNeto
  };
};

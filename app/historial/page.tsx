'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venta, SesionCaja } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketGenerator } from '@/lib/utils/ticket-generator';
import { formatCLPCurrency } from '@/lib/utils';
import { History, Printer, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistorialPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [sesiones, setSesiones] = useState<SesionCaja[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const ventasSnapshot = await getDocs(collection(db, 'ventas'));
      const ventasData = ventasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Venta[];
      const ventasOrdenadas = ventasData
        .sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis())
        .slice(0, 50);
      setVentas(ventasOrdenadas);

      const sesionesSnapshot = await getDocs(collection(db, 'sesiones_caja'));
      const sesionesData = sesionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SesionCaja[];
      const sesionesOrdenadas = sesionesData
        .sort((a, b) => b.fecha_apertura.toMillis() - a.fecha_apertura.toMillis())
        .slice(0, 10);
      setSesiones(sesionesOrdenadas);

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleImprimirTicket = (venta: Venta) => {
    const ticket = TicketGenerator.generar(venta, 'POS MARKET');
    TicketGenerator.imprimir(ticket);
  };

  const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
  const ventasHoy = ventas.filter(v => {
    const fecha = v.fecha.toDate();
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  });
  const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] flex-col justify-center gap-1.5 sm:min-h-[84px]">
            <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight">
              <History className="h-8 w-8 shrink-0" />
              Historial de Ventas
            </h1>
            <p className="text-sm text-muted-foreground font-medium opacity-70">
              Revisa ventas recientes, sesiones de caja y totales acumulados.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ventas (últimas 50)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCLPCurrency(totalVentas)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {ventas.length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ventas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCLPCurrency(totalHoy)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {ventasHoy.length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sesiones Registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sesiones.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {sesiones.filter(s => s.cerrada).length} cerradas
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Últimas Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] min-h-[420px] 2xl:h-[600px]">
                <div className="space-y-3">
                  {ventas.map((venta) => (
                    <div
                      key={venta.id}
                      className="rounded-xl border border-border/50 bg-card p-3 sm:p-4 transition-all hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold sm:text-base">
                            # {venta.numero_venta || venta.id.slice(-6)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground opacity-70">
                            {format(venta.fecha.toDate(), "HH:mm '·' dd MMM", { locale: es })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleImprimirTicket(venta)}
                          className="self-end sm:self-auto"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mb-3 space-y-2">
                        {venta.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <span className="text-muted-foreground break-words">
                              {item.nombre} ({item.unidad === 'kg' ? item.neto.toFixed(3) : item.neto} {item.unidad})
                            </span>
                            <span className="sm:text-right">{formatCLPCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg border ${
                            venta.metodo_pago === 'efectivo' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            venta.metodo_pago === 'transferencia' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            venta.metodo_pago === 'tarjeta' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                            'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                            {venta.metodo_pago}
                          </span>
                          {venta.cliente_nombre && (
                            <span className="text-xs text-muted-foreground">
                              {venta.cliente_nombre}
                            </span>
                          )}
                        </div>
                        <span className="font-bold sm:text-right">{formatCLPCurrency(venta.total)}</span>
                      </div>
                    </div>
                  ))}

                  {ventas.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay ventas registradas
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sesiones de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] min-h-[420px] 2xl:h-[600px]">
                <div className="space-y-3">
                  {sesiones.map((sesion) => (
                    <div
                      key={sesion.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {format(sesion.fecha_apertura.toDate(), "dd 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(sesion.fecha_apertura.toDate(), 'HH:mm', { locale: es })}
                            {sesion.fecha_cierre && ` - ${format(sesion.fecha_cierre.toDate(), 'HH:mm', { locale: es })}`}
                          </p>
                        </div>
                        <span className={`w-fit text-xs px-2 py-1 rounded-full ${
                          sesion.cerrada ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {sesion.cerrada ? 'Cerrada' : 'Activa'}
                        </span>
                      </div>

                      {sesion.cerrada && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Monto Inicial:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.monto_inicial)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Total Ventas:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.total_ventas || 0)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Efectivo:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.total_efectivo || 0)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Transferencia:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.total_transferencia || 0)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Tarjeta:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.total_tarjeta || 0)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Fiado:</span>
                            <span className="text-right">{formatCLPCurrency(sesion.total_fiado || 0)}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3 border-t pt-2 font-semibold">
                            <span>Diferencia:</span>
                            <span className={`text-right ${sesion.diferencia && sesion.diferencia !== 0 ? 'text-red-500' : ''}`}>
                              {formatCLPCurrency(sesion.diferencia || 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {sesiones.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay sesiones registradas
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { usePedidosStore } from '../hooks/usePedidosStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { Pedido } from '@/lib/types/pedido';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCLPCurrency } from '@/lib/utils';
import { Clock, User, Package, MapPin, Truck, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MetodoPago } from '@/lib/types/pos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function OrderDetailModal() {
  const { toast } = useToast();
  
  // Local state for payment method selection during delivery
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  
  // Global Store box session
  const sesionActiva = useAppStore((state) => state.sesionActiva);

  // Local Pedidos Store
  const detailModalOpen = usePedidosStore((state) => state.detailModalOpen);
  const setDetailModalOpen = usePedidosStore((state) => state.setDetailModalOpen);
  const pedido = usePedidosStore((state) => state.selectedPedido);
  const handleActualizarEstado = usePedidosStore((state) => state.handleActualizarEstado);
  const handleCompletarPagoDirecto = usePedidosStore((state) => state.handleCompletarPagoDirecto);
  const handleEntregarYCobrar = usePedidosStore((state) => state.handleEntregarYCobrar);

  if (!pedido) return null;

  const isFinalState = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
  const isPaid = pedido.estado_pago === 'pagado';
  const isPrepared = pedido.estado === 'preparado';
  const isDelivery = pedido.direccion_entrega && pedido.direccion_entrega !== 'Retiro en Local';

  // Format creation date
  const formattedDate = pedido.fecha ? format(pedido.fecha.toDate(), 'dd/MM/yyyy HH:mm:ss') : '';

  const handleMarcarComoPreparado = async () => {
    await handleActualizarEstado(pedido.id, 'preparado', toast);
  };

  const handleCobrarRetiro = async () => {
    if (!sesionActiva) {
      toast({
        title: 'Caja cerrada',
        description: 'Debes abrir una sesión de caja antes de registrar cobros.',
        variant: 'destructive'
      });
      return;
    }
    // Para retiros, cobramos directo usando el medio de pago del pedido
    await handleCompletarPagoDirecto(pedido.id, pedido.metodo_pago || 'efectivo', toast);
  };

  const handleEntregarPedido = async () => {
    // Si ya está pagado, solo registramos entrega
    await handleActualizarEstado(pedido.id, 'entregado', toast);
    setDetailModalOpen(false);
  };

  const handleEntregarYCobrarPedido = async () => {
    if (!sesionActiva) {
      toast({
        title: 'Caja cerrada',
        description: 'Debes abrir una sesión de caja antes de registrar cobros.',
        variant: 'destructive'
      });
      return;
    }
    await handleEntregarYCobrar(pedido, metodoPago, sesionActiva.id, toast);
    setDetailModalOpen(false);
  };

  return (
    <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
              PEDIDO #PED-{pedido.numero_pedido}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={`font-bold px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider ${
                pedido.estado === 'pendiente' ? 'bg-amber-100 text-amber-800 border-amber-250' :
                pedido.estado === 'preparado' ? 'bg-indigo-100 text-indigo-800 border-indigo-250' :
                pedido.estado === 'entregado' ? 'bg-emerald-100 text-emerald-800 border-emerald-250' :
                'bg-rose-100 text-rose-800 border-rose-250'
              }`}>
                {pedido.estado === 'pendiente' ? 'Pendiente' :
                 pedido.estado === 'preparado' ? 'Preparado' :
                 pedido.estado === 'entregado' ? 'Entregado' : 'Cancelado'}
              </Badge>
              <Badge className={`font-bold px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider ${
                isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-250' : 'bg-rose-100 text-rose-800 border-rose-250'
              }`}>
                {isPaid ? 'Pagado' : 'Impago'}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1 font-medium">
            Detalles del pedido, estado de pago e inventario.
          </DialogDescription>
        </DialogHeader>

        {/* Order Details Body */}
        <div className="py-6 space-y-6">
          {/* Section 1: Customer & Delivery */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-500">
                <User className="size-4 text-emerald-600" />
                <span>Cliente: <strong className="text-slate-800 font-extrabold">{pedido.cliente_nombre || 'General'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="size-4 text-emerald-600" />
                <span>Fecha: <span className="text-slate-800 font-bold">{formattedDate}</span></span>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="size-4 text-emerald-600" />
                <span className="truncate" title={pedido.direccion_entrega}>
                  Dirección: <strong className="text-slate-800 font-extrabold">{pedido.direccion_entrega || 'Retiro en Local'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign className="size-4 text-emerald-600" />
                <span>Medio de Pago: <strong className="text-slate-800 font-extrabold capitalize">{pedido.metodo_pago || 'No definido'}</strong></span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {pedido.notas && (
            <div className="bg-amber-50/30 border border-amber-100/50 rounded-2xl p-4 text-xs font-bold text-amber-900/90 space-y-1">
              <span className="text-[10px] tracking-wider text-amber-600 uppercase font-black">Notas del Pedido:</span>
              <p className="italic font-bold">"{pedido.notas}"</p>
            </div>
          )}

          {/* Section 2: Items Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-extrabold text-[10px] text-slate-500 uppercase h-9">Producto</TableHead>
                  <TableHead className="font-extrabold text-[10px] text-slate-500 uppercase h-9 text-center">Cant.</TableHead>
                  <TableHead className="font-extrabold text-[10px] text-slate-500 uppercase h-9 text-right">Unitario</TableHead>
                  <TableHead className="font-extrabold text-[10px] text-slate-500 uppercase h-9 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell className="font-extrabold text-slate-700 text-xs py-3">{item.nombre}</TableCell>
                    <TableCell className="font-bold text-slate-500 text-xs py-3 text-center">
                      {item.cantidad} {item.unidad}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-xs py-3 text-right">
                      {formatCLPCurrency(item.precio_unitario)}
                    </TableCell>
                    <TableCell className="font-extrabold text-slate-800 text-xs py-3 text-right">
                      {formatCLPCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Section 3: Totals */}
          <div className="flex justify-between items-center bg-slate-50/30 border border-slate-100/50 rounded-2xl p-4">
            <span className="font-extrabold text-slate-500 text-[11px] uppercase tracking-wider">Total</span>
            <span className="font-black text-emerald-600 text-xl">{formatCLPCurrency(pedido.total)}</span>
          </div>

          {/* Section 4: Operational actions */}
          {!isFinalState && (
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/10 space-y-4">
              <div className="flex items-start gap-2.5">
                <Package className="size-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Acciones de Gestión</h4>
                  <p className="text-slate-400 font-medium text-[11px]">
                    {pedido.estado === 'pendiente' 
                      ? 'El pedido se encuentra registrado. Una vez empaquetado y listo, márcalo como preparado.' 
                      : 'El pedido está preparado. Procede a registrar la entrega y/o el cobro.'}
                  </p>
                </div>
              </div>

              {pedido.estado === 'pendiente' ? (
                <Button
                  onClick={handleMarcarComoPreparado}
                  className="w-full font-bold h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-transform"
                >
                  <Package className="mr-2 size-4" /> Marcar como Preparado
                </Button>
              ) : (
                <div>
                  {!isPaid ? (
                    isDelivery ? (
                      /* Despacho + Cobro */
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Medio de Pago:</label>
                          <Select 
                            value={metodoPago} 
                            onValueChange={(val: MetodoPago) => setMetodoPago(val)}
                          >
                            <SelectTrigger className="w-full h-10 rounded-xl border-slate-200/80 bg-white font-bold text-xs">
                              <SelectValue placeholder="Seleccionar Pago" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-xl border border-slate-100 font-bold text-xs text-slate-700">
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                              <SelectItem value="transferencia">Transferencia</SelectItem>
                              <SelectItem value="debito">Tarjeta de Débito</SelectItem>
                              <SelectItem value="credito">Tarjeta de Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleEntregarYCobrarPedido}
                          className="w-full font-bold h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform"
                        >
                          <Truck className="mr-2 size-4" /> Registrar Entrega y Cobrar Pedido
                        </Button>
                      </div>
                    ) : (
                      /* Retiro + Cobro */
                      <div className="space-y-2">
                        <Button
                          onClick={handleCobrarRetiro}
                          className="w-full font-bold h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform"
                        >
                          <DollarSign className="mr-2 size-4" /> Registrar Cobro (Retiro)
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-semibold">El pedido ya ha sido cancelado/pagado previamente, solo falta realizar el despacho.</p>
                      <Button
                        onClick={handleEntregarPedido}
                        className="w-full font-bold h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform"
                      >
                        <Truck className="mr-2 size-4" /> Registrar como Entregado
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between gap-4">
          <div>
            {!isFinalState && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl text-xs font-bold h-10 px-4 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    Cancelar Pedido
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl max-w-sm bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-slate-800">¿Cancelar Pedido?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-slate-500">
                      Esta acción marcará el pedido #PED-{pedido.numero_pedido} como cancelado. No se descontará inventario ni se registrará la venta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex sm:flex-row gap-2">
                    <AlertDialogCancel className="rounded-xl font-bold border-slate-200">
                      Atrás
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleActualizarEstado(pedido.id, 'cancelado', toast)}
                      className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Confirmar Cancelación
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetailModalOpen(false)}
              className="rounded-xl text-xs font-bold h-10 px-5"
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { usePedidosStore } from '../hooks/usePedidosStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { Pedido } from '@/lib/types/pedido';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCLPCurrency } from '@/lib/utils';
import { Clock, User, Package, MapPin, Truck, XCircle, DollarSign, Trash2 } from 'lucide-react';
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
  const handleEliminarPedido = usePedidosStore((state) => state.handleEliminarPedido);

  if (!pedido) return null;

  const isFinalState = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
  const isPaid = pedido.estado_pago === 'pagado';

  const getEstadoBadge = (estado: Pedido['estado']) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider text-[10px] border border-amber-500/20 rounded-xl px-2.5 py-1">Pendiente</Badge>;
      case 'preparado':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider text-[10px] border border-blue-500/20 rounded-xl px-2.5 py-1">Preparado</Badge>;
      case 'entregado':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-[10px] border border-emerald-500/20 rounded-xl px-2.5 py-1">Entregado</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 font-black uppercase tracking-wider text-[10px] border border-red-500/20 rounded-xl px-2.5 py-1">Cancelado</Badge>;
    }
  };

  const getPagoBadge = (pago: Pedido['estado_pago']) => {
    if (pago === 'pagado') {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-[10px] border border-emerald-500/20 rounded-xl px-2.5 py-1">Pagado</Badge>;
    }
    return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider text-[10px] border border-rose-500/20 rounded-xl px-2.5 py-1">Impago</Badge>;
  };

  const handleEntregarPedido = async () => {
    if (pedido.estado_pago === 'pendiente') {
      if (!sesionActiva) {
        toast({
          title: 'Caja cerrada',
          description: 'Abre la caja desde la página de inicio para procesar el cobro y la venta.',
          variant: 'destructive'
        });
        return;
      }
      
      if (metodoPago === 'fiado' && !pedido.cliente_id) {
        toast({
          title: 'Venta fiada fallida',
          description: 'Debe seleccionar un cliente registrado (no Cliente General) para fiar el pedido.',
          variant: 'destructive'
        });
        return;
      }

      await handleEntregarYCobrar(pedido, metodoPago, sesionActiva.id, toast);
    } else {
      // Si ya está pagado pero no entregado, solo cambiamos el estado del pedido
      await handleActualizarEstado(pedido.id, 'entregado', toast);
      setDetailModalOpen(false);
    }
  };

  return (
    <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[650px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
        <DialogHeader className="mb-4 flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
              Pedido #PED-{pedido.numero_pedido}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detalles del pedido, estado de pago e inventario.
            </DialogDescription>
          </div>
          <div className="flex gap-1.5 items-center mr-4">
            {getEstadoBadge(pedido.estado)}
            {getPagoBadge(pedido.estado_pago)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border/40 p-4 rounded-2xl bg-muted/10 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <User className="size-4 text-indigo-500 shrink-0" />
                <span>Cliente: {pedido.cliente_nombre || 'Cliente General'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                <Clock className="size-4 shrink-0" />
                <span>Fecha: {pedido.fecha ? format(pedido.fecha.toDate(), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-2">
              {pedido.direccion_entrega && (
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <MapPin className="size-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Dirección: {pedido.direccion_entrega}</span>
                </div>
              )}
              {pedido.metodo_pago && (
                <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                  <DollarSign className="size-4 text-amber-500 shrink-0" />
                  <span className="capitalize">Medio de Pago: {pedido.metodo_pago}</span>
                </div>
              )}
            </div>
          </div>

          {pedido.notas && (
            <div className="border border-border/40 p-3.5 rounded-2xl bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400 font-semibold leading-relaxed">
              <span className="font-black uppercase tracking-wider block mb-1">Notas del Pedido:</span>
              "{pedido.notas}"
            </div>
          )}

          {/* Tabla de Productos */}
          <div className="border border-border/40 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="text-xs font-bold pl-4">Producto</TableHead>
                  <TableHead className="text-xs font-bold text-center">Cant.</TableHead>
                  <TableHead className="text-xs font-bold text-right">Unitario</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-4">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.items.map((item) => (
                  <TableRow key={item.producto_id} className="text-xs hover:bg-muted/5">
                    <TableCell className="font-bold pl-4">{item.nombre}</TableCell>
                    <TableCell className="font-mono text-center">
                      {item.cantidad} {item.es_caja ? (item.tipo_empaque || 'Caja') : item.unidad}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCLPCurrency(item.precio_unitario)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-foreground pr-4">
                      {formatCLPCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center bg-muted/10 px-4 py-3 rounded-2xl border border-border/30">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Total</span>
            <span className="text-lg font-black text-primary">{formatCLPCurrency(pedido.total)}</span>
          </div>

          {/* Sección de Acciones / Entregas */}
          {!isFinalState && (
            <div className="border border-border/40 p-4 rounded-2xl bg-muted/20 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Truck className="size-4 text-indigo-500" />
                Acciones de Gestión
              </h3>

              {pedido.estado === 'pendiente' && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground font-semibold">El pedido se encuentra registrado. Una vez empaquetado y listo, márcalo como preparado.</p>
                  <Button
                    onClick={() => handleActualizarEstado(pedido.id, 'preparado', toast)}
                    className="w-full font-bold h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-transform"
                  >
                    <Package className="mr-2 size-4" /> Marcar como Preparado
                  </Button>
                </div>
              )}

              {pedido.estado === 'preparado' && (
                <div className="space-y-4">
                  {pedido.estado_pago === 'pendiente' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Método de Cobro en Entrega</Label>
                        <Select
                          value={metodoPago}
                          onValueChange={(val: MetodoPago) => setMetodoPago(val)}
                        >
                          <SelectTrigger className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                            <SelectValue placeholder="Selecciona método de cobro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo (Dinero en caja)</SelectItem>
                            <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                            <SelectItem value="tarjeta">Tarjeta Débito/Crédito</SelectItem>
                            <SelectItem value="fiado">Fiado (Registrar deuda a cliente)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {!sesionActiva && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 font-bold rounded-xl flex items-center gap-1.5">
                          <XCircle className="size-4 shrink-0" />
                          Debes abrir la caja desde Inicio antes de poder entregar y cobrar.
                        </div>
                      )}

                      <Button
                        onClick={handleEntregarPedido}
                        className="w-full font-bold h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform"
                      >
                        <Truck className="mr-2 size-4" /> Entregar y Cobrar Pedido
                      </Button>
                    </div>
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if(confirm('¿Seguro que deseas cancelar este pedido?')) {
                    handleActualizarEstado(pedido.id, 'cancelado', toast);
                  }
                }}
                className="rounded-xl text-xs font-bold h-10 px-4 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              >
                Cancelar Pedido
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if(confirm('¿Seguro que deseas eliminar este pedido permanentemente? No se podrá recuperar.')) {
                  handleEliminarPedido(pedido.id, toast);
                }
              }}
              className="rounded-xl text-xs font-bold h-10 px-3 text-muted-foreground hover:text-rose-500 hover:bg-muted"
            >
              <Trash2 className="size-4" />
            </Button>
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

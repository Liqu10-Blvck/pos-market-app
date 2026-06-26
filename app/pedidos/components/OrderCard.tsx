'use client';

import React from 'react';
import { Pedido } from '@/lib/types/pedido';
import { usePedidosStore } from '../hooks/usePedidosStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatCLPCurrency } from '@/lib/utils';
import { Clock, User, Package, MapPin, CheckCircle, Truck, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface OrderCardProps {
  pedido: Pedido;
}

export function OrderCard({ pedido }: OrderCardProps) {
  const { toast } = useToast();
  const setSelectedPedido = usePedidosStore((state) => state.setSelectedPedido);
  const setDetailModalOpen = usePedidosStore((state) => state.setDetailModalOpen);
  const handleActualizarEstado = usePedidosStore((state) => state.handleActualizarEstado);

  const getEstadoBadge = (estado: Pedido['estado']) => {
    switch (estado) {
      case 'pendiente':
        return (
          <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider text-[9px] border border-amber-500/20 rounded-xl px-2.5 py-1">
            <Clock className="mr-1 size-3 shrink-0" />
            Pendiente
          </Badge>
        );
      case 'preparado':
        return (
          <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider text-[9px] border border-blue-500/20 rounded-xl px-2.5 py-1">
            <Package className="mr-1 size-3 shrink-0" />
            Preparado
          </Badge>
        );
      case 'entregado':
        return (
          <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-[9px] border border-emerald-500/20 rounded-xl px-2.5 py-1">
            <Truck className="mr-1 size-3 shrink-0" />
            Entregado
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-black uppercase tracking-wider text-[9px] border border-red-500/20 rounded-xl px-2.5 py-1">
            <XCircle className="mr-1 size-3 shrink-0" />
            Cancelado
          </Badge>
        );
    }
  };

  const getPagoBadge = (pago: Pedido['estado_pago']) => {
    if (pago === 'pagado') {
      return (
        <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-[9px] border border-emerald-500/20 rounded-xl px-2.5 py-1">
          Pagado
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider text-[9px] border border-rose-500/20 rounded-xl px-2.5 py-1">
        Impago
      </Badge>
    );
  };

  const handleCardClick = () => {
    setSelectedPedido(pedido);
    setDetailModalOpen(true);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="group relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 rounded-3xl hover:border-indigo-500/35 hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.99]"
    >
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header: Order Num and Badges */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono font-black text-sm text-primary tracking-wide">
            #PED-{pedido.numero_pedido}
          </span>
          <div className="flex gap-1.5 items-center">
            {getEstadoBadge(pedido.estado)}
            {getPagoBadge(pedido.estado_pago)}
          </div>
        </div>

        {/* Client & Date details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <User className="size-4 text-indigo-500 shrink-0" />
            <span className="truncate">{pedido.cliente_nombre || 'Cliente General'}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
            <Clock className="size-4 shrink-0" />
            <span>{pedido.fecha ? format(pedido.fecha.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}</span>
          </div>

          {pedido.direccion_entrega && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
              <MapPin className="size-4 text-emerald-500 shrink-0" />
              <span className="truncate">{pedido.direccion_entrega}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-border/30 my-3" />

        {/* Footer: total and operations */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Total Pedido</p>
            <p className="text-base font-black text-foreground">{formatCLPCurrency(pedido.total)}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {pedido.estado === 'pendiente' && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActualizarEstado(pedido.id, 'preparado', toast);
                }}
                className="h-8 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Preparar
              </Button>
            )}

            {pedido.estado === 'preparado' && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPedido(pedido);
                  setDetailModalOpen(true);
                }}
                className="h-8 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Entregar
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 group-hover:translate-x-0.5 transition-transform"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

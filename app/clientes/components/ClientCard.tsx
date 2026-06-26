import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Cliente } from '../../../lib/types/pos';
import { formatCLPCurrency } from '../../../lib/utils';
import { useClientesStore } from '../hooks/useClientesStore';
import { Plus, Phone, CreditCard, History, Coins, Store } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

interface ClientCardProps {
  cliente: Cliente;
}

export const ClientCard: React.FC<ClientCardProps> = ({ cliente }) => {
  const { toast } = useToast();
  const handleAbrirModal = useClientesStore((state) => state.handleAbrirModal);
  const handleAbrirAbono = useClientesStore((state) => state.handleAbrirAbono);
  const handleAbrirDetalle = useClientesStore((state) => state.handleAbrirDetalle);

  return (
    <Card className="group overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-primary/20 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black shadow-inner">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">{cliente.nombre}</CardTitle>
              {cliente.nombre_negocio && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 mt-0.5">
                  <Store className="h-2.5 w-2.5" /> {cliente.nombre_negocio}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleAbrirModal(cliente)} 
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          {cliente.telefono || 'Sin teléfono'}
        </div>
        
        <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/10 border border-border/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Saldo Deudor</span>
            <CreditCard className="h-3.5 w-3.5 opacity-40 text-primary" />
          </div>
          <div className={`text-xl font-black tracking-tighter ${cliente.saldo_deuda > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-500'}`}>
            {formatCLPCurrency(cliente.saldo_deuda)}
          </div>
        </div>

        {cliente.saldo_deuda > 0 && (
          <Button 
            onClick={() => handleAbrirAbono(cliente)} 
            className="w-full h-10 text-xs bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl gap-2 shadow-sm"
          >
            <Coins className="h-4 w-4" /> Registrar Abono / Pago
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => handleAbrirModal(cliente)}>
            Editar Datos
          </Button>
          <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => handleAbrirDetalle(cliente, toast)}>
            <History className="h-3 w-3" /> Ver History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

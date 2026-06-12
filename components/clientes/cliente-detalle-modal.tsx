'use client';

import { useState, useEffect } from 'react';
import { Cliente, PagoCredito } from '@/lib/types/pos';
import { ClienteService } from '@/lib/services/cliente.service';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCLPCurrency } from '@/lib/utils';
import { 
  History, 
  Banknote, 
  CreditCard, 
  Calendar, 
  User, 
  AlertCircle,
  TrendingDown,
  ArrowDownCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClienteDetalleModalProps {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
}

export function ClienteDetalleModal({ cliente, open, onClose }: ClienteDetalleModalProps) {
  const [abonos, setAbonos] = useState<PagoCredito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && cliente) {
      cargarHistorial();
    }
  }, [open, cliente]);

  const cargarHistorial = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const data = await ClienteService.obtenerHistorialAbonos(cliente.id);
      setAbonos(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  const deuda = cliente.saldo_pendiente || 0;
  const limite = cliente.limite_credito || 0;
  const porcentajeUso = limite > 0 ? (deuda / limite) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-background">
        <div className="bg-primary/5 p-8 pb-6 border-b border-border/10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-lg bg-primary/10 text-primary border-none font-black uppercase text-[9px]">
                  Ficha de Crédito
                </Badge>
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight">{cliente.nombre}</DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground flex items-center gap-2">
                 RUT: {cliente.rut || 'N/A'} • {cliente.telefono || 'Sin teléfono'}
              </DialogDescription>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white font-black text-2xl shadow-xl shadow-primary/20">
               {cliente.nombre.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-background/80 p-4 rounded-3xl border border-border/40 shadow-sm">
                <p className="text-[10px] font-black uppercase opacity-40 mb-1 flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-amber-500" /> Deuda Actual
                </p>
                <p className="text-2xl font-black tracking-tighter text-amber-600">{formatCLPCurrency(deuda)}</p>
                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${porcentajeUso > 90 ? 'bg-destructive' : 'bg-amber-500'}`} 
                     style={{ width: `${Math.min(100, porcentajeUso)}%` }} 
                   />
                </div>
                <p className="text-[9px] font-bold opacity-40 mt-1 uppercase">Uso: {porcentajeUso.toFixed(0)}% del límite</p>
            </div>
            <div className="bg-background/80 p-4 rounded-3xl border border-border/40 shadow-sm">
                <p className="text-[10px] font-black uppercase opacity-40 mb-1 flex items-center gap-1.5">
                   <Banknote className="h-3 w-3 text-success" /> Total Abonado
                </p>
                <p className="text-2xl font-black tracking-tighter text-success">
                   {formatCLPCurrency(abonos.reduce((sum, a) => sum + a.monto, 0))}
                </p>
                <p className="text-[9px] font-bold opacity-40 mt-1 uppercase flex items-center gap-1">
                  <ArrowDownCircle className="h-3 w-3" /> Veces que abonó: {abonos.length}
                </p>
            </div>
          </div>
        </div>

        <div className="p-8 pt-6 space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Historial de Movimientos
             </h3>
             <Clock className="h-4 w-4 text-muted-foreground opacity-20" />
          </div>

          <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
             {loading ? (
               <div className="py-20 text-center animate-pulse opacity-40 text-xs font-bold uppercase">Cargando pagos...</div>
             ) : abonos.length === 0 ? (
               <div className="py-20 text-center opacity-30 border-2 border-dashed rounded-3xl border-border/20 flex flex-col items-center gap-3">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
                  <p className="text-xs font-bold uppercase">No hay abonos registrados para este cliente.</p>
               </div>
             ) : (
               abonos.map((abono) => (
                 <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={abono.id} 
                    className="group bg-muted/20 p-4 rounded-2xl border border-border/10 flex items-center justify-between hover:bg-muted/40 transition-all"
                 >
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-success/10 rounded-xl flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                          <ArrowDownCircle className="h-5 w-5" />
                       </div>
                       <div>
                          <p className="text-sm font-black tracking-tight">{formatCLPCurrency(abono.monto)}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                             <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {abono.fecha_pago?.toDate().toLocaleDateString()}</span>
                             <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> {abono.metodo_pago}</span>
                          </div>
                          {abono.observaciones && (
                             <p className="text-[10px] text-muted-foreground italic mt-0.5 mt-1 border-l-2 border-primary/20 pl-2">
                               {abono.observaciones}
                             </p>
                          )}
                       </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline" className="text-[9px] font-black uppercase bg-success/5 text-success border-success/20">
                          Abono Exitoso
                       </Badge>
                       <p className="text-[8px] font-black opacity-30 mt-1 uppercase tracking-widest">{abono.id.split('-').pop()}</p>
                    </div>
                 </motion.div>
               ))
             )}
          </div>
        </div>

        <DialogFooter className="p-8 pt-0">
           <Button onClick={onClose} variant="secondary" className="w-full h-14 rounded-2xl font-black text-lg bg-muted text-muted-foreground hover:bg-muted/80">
              CERRAR
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

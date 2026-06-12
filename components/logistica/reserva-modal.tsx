'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lote, Cliente } from '@/lib/types/pos';
import { LoteService } from '@/lib/services/lote.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Star, User, Package, Calculator } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ReservaModalProps {
  lote: Lote | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReservaModal({ lote, open, onClose, onConfirm }: ReservaModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [cantidadCajas, setCantidadCajas] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');
  const [precioAcordado, setPrecioAcordado] = useState<string>('');
  const [procesando, setProcesando] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const totalEstimado = (parseFloat(pesoKg) || 0) * (parseFloat(precioAcordado) || 0);

  useEffect(() => {
    if (open) {
      const unsub = onSnapshot(query(collection(db, 'clientes'), where('activo', '!=', false)), (snapshot) => {
        setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cliente[]);
      });
      return () => unsub();
    }
  }, [open]);

  useEffect(() => {
    if (lote) {
      setCantidadCajas(lote.envase_cantidad_total.toString());
      setPesoKg(lote.stock_actual_kg.toString());
      setPrecioAcordado(lote.precio_sugerido.toString());
    }
  }, [lote]);

  const handleReservar = async () => {
    if (!lote || !clienteId) {
      toast({ title: 'Error', description: 'Selecciona un cliente', variant: 'destructive' });
      return;
    }

    setProcesando(true);
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      await LoteService.registrarReserva(
        lote.id,
        clienteId,
        cliente?.nombre || 'Cliente Desconocido',
        user?.tenantId || 'default-tenant',
        user?.sucursalesIds?.[0] || 'default-sucursal',
        parseFloat(pesoKg) || undefined,
        parseInt(cantidadCajas) || undefined,
        parseFloat(precioAcordado) || undefined,
        totalEstimado
      );

      toast({ title: 'Reserva Exitosa', description: `Lote reservado para ${cliente?.nombre}` });
      onConfirm();
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  if (!lote) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <DialogTitle className="text-2xl font-black">Crear Reserva</DialogTitle>
          <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
            Lote: {lote.id} · {lote.nombre_producto}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase opacity-60 flex items-center gap-2">
              <User className="h-3 w-3" /> Cliente Destino
            </Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-12 rounded-xl border-border/40 font-bold">
                <SelectValue placeholder="Selecciona el cliente..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">
                    {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60 flex items-center gap-2">
                <Package className="h-3 w-3" /> Cant. Cajas
              </Label>
              <Input
                type="number"
                value={cantidadCajas}
                onChange={e => setCantidadCajas(e.target.value)}
                className="h-12 rounded-xl font-black text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60 flex items-center gap-2">
                <Calculator className="h-3 w-3" /> Peso Est. (KG)
              </Label>
              <Input
                type="number"
                value={pesoKg}
                onChange={e => setPesoKg(e.target.value)}
                className="h-12 rounded-xl font-black text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase opacity-60 flex items-center gap-2">
              Precio Acordado / KG
            </Label>
            <Input
              type="number"
              value={precioAcordado}
              onChange={e => setPrecioAcordado(e.target.value)}
              className="h-12 rounded-xl font-black text-xl text-amber-600 bg-amber-50 border-amber-200"
            />
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center group">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase opacity-40">Total Estimado</p>
              <p className="text-2xl font-black text-primary">$ {totalEstimado.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-primary text-white font-bold h-6">RESERVA COMERCIAL</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Cancelar</Button>
          <Button 
            onClick={handleReservar} 
            disabled={procesando || !clienteId}
            className="rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 px-8"
          >
            Confirmar Reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

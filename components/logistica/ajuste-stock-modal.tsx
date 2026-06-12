'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lote } from '@/lib/types/pos';
import { LoteService } from '@/lib/services/lote.service';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Trash2, Box, Scale, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AjusteStockModalProps {
  lote: Lote | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AjusteStockModal({ lote, open, onClose, onConfirm }: AjusteStockModalProps) {
  const [cantidadKg, setCantidadKg] = useState<string>('');
  const [cantidadCajas, setCantidadCajas] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  if (!lote) return null;

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      toast({
        title: 'Motivo Obligatorio',
        description: 'Debes explicar por qué estás eliminando este stock.',
        variant: 'destructive',
      });
      return;
    }

    const kg = parseFloat(cantidadKg) || 0;
    const cajas = parseInt(cantidadCajas) || 0;

    if (kg <= 0 && cajas <= 0) {
      toast({
        title: 'Error de Cantidad',
        description: 'Debes ingresar al menos una unidad (KG o Cajas) para descontar.',
        variant: 'destructive',
      });
      return;
    }

    // Validación de no quitar más de lo que hay
    if (kg > lote.stock_actual_kg || cajas > (lote.stock_actual_cajas ?? 0)) {
       toast({
        title: 'Stock Insuficiente',
        description: 'No puedes descontar más del stock actual disponible.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await LoteService.ejecutarAjuste({
        lote_id: lote.id,
        producto_id: lote.producto_id,
        nombre_producto: lote.nombre_producto,
        cantidad_kg: kg,
        cantidad_cajas: cajas,
        motivo: motivo.trim(),
        usuario_nombre: user?.name || 'Operador'
      });

      toast({
        title: 'Ajuste Realizado',
        description: `Se han descontado ${kg}kg / ${cajas} cajas del stock.`,
      });
      
      onConfirm();
      onClose();
      // Limpiar campos
      setCantidadKg('');
      setCantidadCajas('');
      setMotivo('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo realizar el ajuste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
        <div className="bg-destructive/10 p-8 pb-6">
          <div className="h-14 w-14 bg-destructive/20 rounded-2xl flex items-center justify-center mb-4 text-destructive animate-pulse">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl font-black text-foreground">Ajuste Manual de Stock</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Estás a punto de eliminar stock de <span className="text-foreground font-black uppercase">{lote.nombre_producto} - {lote.variedad}</span>. Esta acción quedará registrada.
          </DialogDescription>
        </div>

        <div className="p-8 pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1.5 focus:text-primary transition-colors">
                <Scale className="h-3 w-3" /> Descontar KG
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  className="rounded-2xl h-14 bg-muted/30 border-none font-black text-lg focus-visible:ring-destructive/30"
                  value={cantidadKg}
                  onChange={(e) => setCantidadKg(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">KG</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground">Disponible: {lote.stock_actual_kg.toFixed(1)}kg</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1.5 focus:text-primary transition-colors">
                <Box className="h-3 w-3" /> Descontar Cajas
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  className="rounded-2xl h-14 bg-muted/30 border-none font-black text-lg focus-visible:ring-destructive/30"
                  value={cantidadCajas}
                  onChange={(e) => setCantidadCajas(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">CAJAS</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground">Disponible: {lote.stock_actual_cajas ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-60">Explicación del Error (Motivo)</Label>
            <Textarea
              placeholder="Ej: Fruta en mal estado detectada al despachar..."
              className="rounded-2xl min-h-[80px] bg-muted/30 border-none font-medium resize-none focus-visible:ring-destructive/30"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {/* Preview Section */}
          {(parseFloat(cantidadKg) > 0 || parseInt(cantidadCajas) > 0) && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40 animate-in zoom-in-95 duration-300">
                <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest text-center">Vista Previa del Resultado</p>
                <div className="flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Nuevo Peso</p>
                        <p className="text-xl font-black text-foreground">{(lote.stock_actual_kg - (parseFloat(cantidadKg) || 0)).toFixed(1)} <span className="text-[10px]">KG</span></p>
                    </div>
                    <div className="h-8 w-[1px] bg-border/40" />
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Nuevas Cajas</p>
                        <p className="text-xl font-black text-foreground">{(lote.stock_actual_cajas ?? 0) - (parseInt(cantidadCajas) || 0)} <span className="text-[10px]">CJS</span></p>
                    </div>
                </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
                variant="ghost" 
                onClick={onClose} 
                className="flex-1 h-14 rounded-2xl font-bold text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={loading}
              className="flex-1 h-14 rounded-2xl bg-destructive text-destructive-foreground font-black text-lg shadow-xl shadow-destructive/20 hover:scale-[1.02] transition-all"
            >
              {loading ? 'Procesando...' : (
                <span className="flex items-center gap-2">
                   <Trash2 className="h-5 w-5" /> Aplicar Ajuste
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

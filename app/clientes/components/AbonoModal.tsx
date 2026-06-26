import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';
import { useClientesStore } from '../hooks/useClientesStore';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '../../../lib/utils';
import { Landmark, Coins } from 'lucide-react';

export const AbonoModal: React.FC = () => {
  const { toast } = useToast();
  
  const abonoModalOpen = useClientesStore((state) => state.abonoModalOpen);
  const setAbonoModalOpen = useClientesStore((state) => state.setAbonoModalOpen);
  const abonoCliente = useClientesStore((state) => state.abonoCliente);
  const abonoMonto = useClientesStore((state) => state.abonoMonto);
  const setAbonoMonto = useClientesStore((state) => state.setAbonoMonto);
  const abonoMetodo = useClientesStore((state) => state.abonoMetodo);
  const setAbonoMetodo = useClientesStore((state) => state.setAbonoMetodo);
  const guardando = useClientesStore((state) => state.guardando);
  const handleGuardarAbono = useClientesStore((state) => state.handleGuardarAbono);

  if (!abonoCliente) return null;

  return (
    <Dialog open={abonoModalOpen} onOpenChange={(open) => !guardando && setAbonoModalOpen(open)}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#080b12] rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Registrar Abono / Pago</DialogTitle>
          <DialogDescription className="text-xs">
            Disminuye la deuda de <strong>{abonoCliente.nombre}</strong> registrando un pago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Resumen Deuda */}
          <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 flex items-center justify-between">
            <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Deuda Actual:</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-500">{formatCLPCurrency(abonoCliente.saldo_deuda)}</span>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Método de Pago</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAbonoMetodo('efectivo')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-xs ${
                  abonoMetodo === 'efectivo' 
                    ? 'border-indigo-600 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <Coins className="h-4 w-4" />
                Efectivo (Caja)
              </button>
              <button
                type="button"
                onClick={() => setAbonoMetodo('transferencia')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-xs ${
                  abonoMetodo === 'transferencia' 
                    ? 'border-indigo-600 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Transferencia (Banco)
              </button>
            </div>
          </div>

          {/* Monto del Abono */}
          <div className="space-y-2">
            <Label htmlFor="monto_abono" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto a Abonar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black">$</span>
              <Input
                id="monto_abono"
                value={abonoMonto}
                onChange={(e) => setAbonoMonto(normalizeMoneyInput(e.target.value))}
                onBlur={() => setAbonoMonto(abonoMonto ? formatCLPCurrency(parseChileanMoneyInput(abonoMonto)) : '0')}
                onFocus={() => setAbonoMonto(normalizeMoneyInput(abonoMonto))}
                className="pl-7 h-11 border-indigo-200 focus:ring-indigo-500 rounded-xl font-bold"
                placeholder="Ingresa el monto"
                disabled={guardando}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">El saldo restante después de este abono será de {formatCLPCurrency(Math.max(0, abonoCliente.saldo_deuda - parseChileanMoneyInput(abonoMonto)))}.</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => setAbonoModalOpen(false)} disabled={guardando} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={() => handleGuardarAbono(toast)} disabled={guardando} className="shadow-lg rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">
            {guardando ? 'Procesando...' : 'Confirmar Abono'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

'use client';

import React from 'react';
import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, parseChileanMoneyInput } from '@/lib/utils';
import { DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CapitalDialog() {
  const {
    capitalOpen,
    setCapitalOpen,
    capitalMonto,
    setCapitalMonto,
    capitalDestino,
    setCapitalDestino,
    capitalMontoCaja,
    setCapitalMontoCaja,
    capitalMontoBanco,
    setCapitalMontoBanco,
    capitalTipo,
    setCapitalTipo,
    capitalGlosa,
    setCapitalGlosa,
    guardandoCapital,
    handleCapitalSubmit
  } = useContabilidadStore();

  const { toast } = useToast();

  return (
    <Dialog open={capitalOpen} onOpenChange={setCapitalOpen}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[500px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-500" />
            Declarar Fondos / Operación
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {capitalTipo === 'capital' 
              ? 'Ingresa el monto de dinero disponible para iniciar operaciones. Se creará un asiento contable que cargará el dinero en tus cuentas de activo y acreditará Capital Inicial.'
              : 'Ingresa el monto de utilidades acumuladas que deseas declarar como fondos para operar. Se cargará el dinero en tus cuentas de activo y acreditará Utilidades Acumuladas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => handleCapitalSubmit(e, toast)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="capital_tipo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Fondos</Label>
            <Select
              value={capitalTipo}
              onValueChange={(val: 'capital' | 'utilidades') => {
                setCapitalTipo(val);
                if (val === 'capital') {
                  setCapitalGlosa('Aporte de Capital Inicial');
                } else {
                  setCapitalGlosa('Registro de Utilidades Acumuladas');
                }
              }}
            >
              <SelectTrigger id="capital_tipo" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                <SelectValue placeholder="Selecciona tipo de fondos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capital">Aporte de Capital Inicial (Cuenta 3.1.01)</SelectItem>
                <SelectItem value="utilidades">Utilidades Acumuladas / Históricas (Cuenta 3.1.02)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capital_glosa" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Concepto / Glosa</Label>
            <Input
              id="capital_glosa"
              value={capitalGlosa}
              onChange={(e) => setCapitalGlosa(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capital_destino" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Destino del Dinero</Label>
            <Select
              value={capitalDestino}
              onValueChange={(val: any) => setCapitalDestino(val)}
            >
              <SelectTrigger id="capital_destino" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                <SelectValue placeholder="Selecciona destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caja">Todo en Caja (Efectivo local)</SelectItem>
                <SelectItem value="banco">Todo en Banco (Cuenta bancaria / Digital)</SelectItem>
                <SelectItem value="mixto">Dividido (Mixto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {capitalDestino !== 'mixto' ? (
            <div className="space-y-1.5">
              <Label htmlFor="capital_monto" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto Total ($)</Label>
              <Input
                id="capital_monto"
                inputMode="numeric"
                placeholder="Ej: $1.500.000"
                value={capitalMonto}
                onChange={(e) => setCapitalMonto(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={() => { const v = parseChileanMoneyInput(capitalMonto); setCapitalMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                className="h-9 text-xs"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="capital_monto_caja" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto en Caja ($)</Label>
                <Input
                  id="capital_monto_caja"
                  inputMode="numeric"
                  placeholder="Ej: $500.000"
                  value={capitalMontoCaja}
                  onChange={(e) => setCapitalMontoCaja(e.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={() => { const v = parseChileanMoneyInput(capitalMontoCaja); setCapitalMontoCaja(v > 0 ? formatCLPCurrency(v) : ''); }}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capital_monto_banco" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto en Banco ($)</Label>
                <Input
                  id="capital_monto_banco"
                  inputMode="numeric"
                  placeholder="Ej: $1.000.000"
                  value={capitalMontoBanco}
                  onChange={(e) => setCapitalMontoBanco(e.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={() => { const v = parseChileanMoneyInput(capitalMontoBanco); setCapitalMontoBanco(v > 0 ? formatCLPCurrency(v) : ''); }}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCapitalOpen(false)}
              className="rounded-xl text-xs font-bold h-10 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardandoCapital}
              className="rounded-xl text-xs font-bold h-10 px-5 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {guardandoCapital ? 'Registrando...' : capitalTipo === 'capital' ? 'Registrar Capital' : 'Registrar Utilidades'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

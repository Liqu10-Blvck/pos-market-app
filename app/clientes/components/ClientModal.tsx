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

export const ClientModal: React.FC = () => {
  const { toast } = useToast();
  
  const modalOpen = useClientesStore((state) => state.modalOpen);
  const setModalOpen = useClientesStore((state) => state.setModalOpen);
  const editando = useClientesStore((state) => state.editando);
  const guardando = useClientesStore((state) => state.guardando);
  const formData = useClientesStore((state) => state.formData);
  const setFormData = useClientesStore((state) => state.setFormData);
  const handleGuardar = useClientesStore((state) => state.handleGuardar);

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !guardando && setModalOpen(open)}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#080b12] rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>{editando ? 'Actualizar Cliente' : 'Nuevo Registro de Cliente'}</DialogTitle>
          <DialogDescription>
            Administra la información básica y saldos de crédito para este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="nombre_completo">Nombre Completo</Label>
            <Input
              id="nombre_completo"
              value={formData.nombre}
              onChange={(e) => setFormData({ nombre: e.target.value })}
              placeholder="Nombre del cliente"
              className="h-10 rounded-xl"
              disabled={guardando}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="telefono_contacto">Teléfono</Label>
              <Input
                id="telefono_contacto"
                value={formData.telefono}
                onChange={(e) => setFormData({ telefono: e.target.value })}
                placeholder="Ej: +56912345678"
                className="h-10 rounded-xl"
                disabled={guardando}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nombre_negocio">Nombre del Negocio</Label>
              <Input
                id="nombre_negocio"
                value={formData.nombre_negocio}
                onChange={(e) => setFormData({ nombre_negocio: e.target.value })}
                placeholder="Ej: Almacén El Sol"
                className="h-10 rounded-xl"
                disabled={guardando}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rubro_negocio">Giro / Rubro</Label>
              <Input
                id="rubro_negocio"
                value={formData.rubro_negocio}
                onChange={(e) => setFormData({ rubro_negocio: e.target.value })}
                placeholder="Ej: Minimarket, Restaurant"
                className="h-10 rounded-xl"
                disabled={guardando}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="limite_credito">Límite de Crédito</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="limite_credito"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({ limite_credito: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setFormData({ limite_credito: formData.limite_credito ? formatCLPCurrency(parseChileanMoneyInput(formData.limite_credito)) : '0' })}
                  onFocus={() => setFormData({ limite_credito: normalizeMoneyInput(formData.limite_credito) })}
                  className="pl-7 h-10 border-indigo-200 focus:ring-indigo-500 rounded-xl"
                  placeholder="Sin límite"
                  disabled={guardando}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="direccion_despacho">Dirección / Localización</Label>
            <Input
              id="direccion_despacho"
              value={formData.direccion}
              onChange={(e) => setFormData({ direccion: e.target.value })}
              placeholder="Calle, Número, Comuna"
              className="h-10 rounded-xl"
              disabled={guardando}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="saldo_deudor">Saldo Deudor Inicial</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="saldo_deudor"
                value={formData.saldo_deuda}
                onChange={(e) => setFormData({ saldo_deuda: normalizeMoneyInput(e.target.value) })}
                onBlur={() => setFormData({ saldo_deuda: formData.saldo_deuda ? formatCLPCurrency(parseChileanMoneyInput(formData.saldo_deuda)) : '0' })}
                onFocus={() => setFormData({ saldo_deuda: normalizeMoneyInput(formData.saldo_deuda) })}
                className="pl-7 h-10 border-amber-200 focus:ring-amber-500 rounded-xl"
                placeholder="0"
                disabled={guardando}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Monto acumulado por compras fiadas anteriores.</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={guardando} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={() => handleGuardar(toast)} disabled={guardando} className="shadow-lg rounded-xl">
            {guardando ? 'Guardando...' : (editando ? 'Guardar Cambios' : 'Registrar Cliente')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

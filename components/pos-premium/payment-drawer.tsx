'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CarritoItem, MetodoPago, Cliente } from '@/lib/types/pos';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCLPCurrency } from '@/lib/utils';
import { CreditCard, Banknote, UserCircle, CheckCircle2 } from 'lucide-react';

interface PaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CarritoItem[];
  total: number;
  clientes: Cliente[];
  onConfirm: (metodoPago: MetodoPago, clienteId?: string) => void;
  procesando: boolean;
}

export function PaymentDrawer({
  open,
  onOpenChange,
  items,
  total,
  clientes,
  onConfirm,
  procesando
}: PaymentDrawerProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');

  const handleConfirm = () => {
    onConfirm(metodoPago, clienteSeleccionado || undefined);
  };

  const paymentMethods = [
    { value: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-600' },
    { value: 'transferencia', label: 'Transfer', icon: CreditCard, color: 'text-blue-600' },
    { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-purple-600' },
    { value: 'fiado', label: 'Fiado', icon: UserCircle, color: 'text-amber-600' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[88vh] rounded-t-3xl border-t-4 border-primary bg-background p-0 dark:bg-background-dark sm:h-[82vh] sm:max-w-3xl sm:mx-auto"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex h-full flex-col"
        >
          <SheetHeader className="border-b border-border p-4 pb-4 dark:border-border-dark sm:p-6">
            <SheetTitle className="text-xl font-bold sm:text-2xl">Procesar Venta</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'producto' : 'productos'} en el carrito. Selecciona el método de pago para finalizar.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
            {/* Items Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Resumen de Compra
              </h3>
              {items.map((item, idx) => (
                <div key={item.temp_id} className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3 dark:bg-muted/10 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground dark:text-white">{item.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.neto.toFixed(3)} {item.unidad} × {formatCLPCurrency(item.precio_unitario)}
                    </p>
                    {item.unidad === 'kg' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Bruto: {item.peso_bruto?.toFixed(3)}kg | Tara: {item.tara?.toFixed(3)}kg
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-base font-bold text-foreground dark:text-white sm:text-lg">
                      {formatCLPCurrency(item.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Breakdown */}
            <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 dark:from-primary/20 dark:to-primary/10 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCLPCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="h-px bg-border dark:bg-border-dark my-2" />
                <div className="flex items-end justify-between gap-3">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary dark:text-primary-300 sm:text-4xl">
                    {formatCLPCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Método de Pago
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = metodoPago === method.value;
                  
                  return (
                    <button
                      key={method.value}
                      onClick={() => setMetodoPago(method.value as MetodoPago)}
                      className={`
                        relative rounded-xl border-2 p-4 text-left transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-medium' 
                          : 'border-border dark:border-border-dark hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : method.color}`} />
                        </div>
                        <span className={`font-semibold text-base sm:text-lg ${isSelected ? 'text-primary' : 'text-foreground dark:text-white'}`}>
                          {method.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Client Selection for Fiado */}
            {metodoPago === 'fiado' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Seleccionar Cliente
                </Label>
                <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                  <SelectTrigger className="h-12 border-2 text-sm sm:h-14 sm:text-base">
                    <SelectValue placeholder="Elige un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id} className="py-3 text-sm sm:text-base">
                        <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-semibold">{cliente.nombre}</span>
                          <span className="text-sm text-muted-foreground sm:ml-4">
                            Deuda: {formatCLPCurrency(cliente.saldo_deuda)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clienteSeleccionado && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      La deuda del cliente se actualizará automáticamente
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Action Button - Fixed at bottom (Thumb Zone) */}
          <div className="border-t border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark sm:p-6">
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={procesando || (metodoPago === 'fiado' && !clienteSeleccionado)}
              className="h-14 w-full bg-primary text-base font-bold shadow-hard transition-transform active:scale-95 hover:bg-primary-700 sm:h-16 sm:text-lg"
            >
              {procesando ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-6 w-6 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  <span className="truncate">Confirmar Venta - {formatCLPCurrency(total)}</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { SesionService } from '@/lib/services/sesion.service';
import type { SesionCaja } from '@/lib/types/pos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '@/lib/utils';
import { DollarSign, Lock, Unlock } from 'lucide-react';

export function SesionCaja() {
  const [sesionActiva, setSesionActiva] = useState<SesionCaja | null>(null);
  const [modalApertura, setModalApertura] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinal, setMontoFinal] = useState('');
  const [cargando, setCargando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarSesionActiva();
  }, []);

  const cargarSesionActiva = async () => {
    try {
      const sesion = await SesionService.obtenerSesionActiva();
      setSesionActiva(sesion);
    } catch (error) {
      console.error('Error al cargar sesión:', error);
    }
  };

  const handleAbrirSesion = async () => {
    const monto = parseChileanMoneyInput(montoInicial);
    
    if (isNaN(monto) || monto < 0) {
      toast({
        title: 'Monto inválido',
        description: 'Ingrese un monto inicial válido',
        variant: 'destructive'
      });
      return;
    }

    setCargando(true);
    try {
      await SesionService.abrirSesion(monto);
      toast({
        title: 'Sesión abierta',
        description: 'Caja abierta exitosamente'
      });
      setModalApertura(false);
      setMontoInicial('');
      await cargarSesionActiva();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  const handleCerrarSesion = async () => {
    if (!sesionActiva) return;

    const monto = parseChileanMoneyInput(montoFinal);
    
    if (isNaN(monto) || monto < 0) {
      toast({
        title: 'Monto inválido',
        description: 'Ingrese el monto final de caja',
        variant: 'destructive'
      });
      return;
    }

    setCargando(true);
    try {
      await SesionService.cerrarSesion(sesionActiva.id, monto);
      toast({
        title: 'Sesión cerrada',
        description: 'Caja cerrada exitosamente'
      });
      setModalCierre(false);
      setMontoFinal('');
      setSesionActiva(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      {sesionActiva ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-500" />
              Sesión Activa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Apertura:</span>
              <span className="font-semibold">
                {sesionActiva.fecha_apertura.toDate().toLocaleString('es-CL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto Inicial:</span>
              <span className="font-semibold">{formatCLPCurrency(sesionActiva.monto_inicial)}</span>
            </div>
            <Button 
              variant="destructive" 
              className="w-full mt-4"
              onClick={() => setModalCierre(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Cerrar Caja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button 
          className="w-full" 
          size="lg"
          onClick={() => setModalApertura(true)}
        >
          <Unlock className="mr-2 h-5 w-5" />
          Abrir Caja
        </Button>
      )}

      <Dialog open={modalApertura} onOpenChange={setModalApertura}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Iniciar Sesión de Caja</DialogTitle>
            <DialogDescription>Ingresa el monto inicial con el que dispones para comenzar la jornada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="monto-inicial">Monto Inicial en Caja</Label>
              <Input
                id="monto-inicial"
                type="text"
                inputMode="decimal"
                placeholder="$0,00"
                value={montoInicial}
                onChange={(e) => setMontoInicial(normalizeMoneyInput(e.target.value))}
                onBlur={() => setMontoInicial((current) => current ? formatCLPCurrency(parseChileanMoneyInput(current)) : '')}
                onFocus={() => setMontoInicial((current) => normalizeMoneyInput(current))}
                className="text-lg h-12"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalApertura(false)} disabled={cargando}>
              Cancelar
            </Button>
            <Button onClick={handleAbrirSesion} disabled={cargando}>
              {cargando ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCierre} onOpenChange={setModalCierre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Cerrar Sesión de Caja</DialogTitle>
            <DialogDescription>Verifica los montos finales y guarda el resumen de ventas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {sesionActiva && (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Monto Inicial:</span>
                    <span className="font-semibold">{formatCLPCurrency(sesionActiva.monto_inicial)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monto-final">Monto Final en Caja</Label>
                  <Input
                    id="monto-final"
                    type="text"
                    inputMode="decimal"
                    placeholder="$0,00"
                    value={montoFinal}
                    onChange={(e) => setMontoFinal(normalizeMoneyInput(e.target.value))}
                    onBlur={() => setMontoFinal((current) => current ? formatCLPCurrency(parseChileanMoneyInput(current)) : '')}
                    onFocus={() => setMontoFinal((current) => normalizeMoneyInput(current))}
                    className="text-lg h-12"
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCierre(false)} disabled={cargando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCerrarSesion} disabled={cargando}>
              {cargando ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

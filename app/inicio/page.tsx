'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SesionService } from '@/lib/services/sesion.service';
import { VentasService } from '@/lib/services/ventas.service';
import { MetasService } from '@/lib/services/metas.service';
import { SesionCaja, Venta } from '@/lib/types/pos';
import { SesionCaja as SesionCajaComponent } from '@/components/pos/sesion-caja';
import { AppNav } from '@/components/layout/app-nav';
import { formatCLPCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { 
  ShoppingCart, 
  Package, 
  History, 
  DollarSign, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  Zap, 
  Target, 
  Settings, 
  CreditCard, 
  Send, 
  AlertTriangle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ProtectedRoute } from '@/components/layout/protected-route';

function InicioPage() {
  const [sesionActiva, setSesionActiva] = useState<SesionCaja | null>(null);
  const [resumenSesion, setResumenSesion] = useState<any>(null);
  const [progresoMetas, setProgresoMetas] = useState<any>(null);
  const [metaDialog, setMetaDialog] = useState(false);
  const [nuevaMetaDiaria, setNuevaMetaDiaria] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const sesion = await SesionService.obtenerSesionActiva();
      setSesionActiva(sesion);
      if (sesion) {
        const resumen = await VentasService.obtenerResumenSesion(sesion.id);
        setResumenSesion(resumen);
      }
      
      const metas = await MetasService.obtenerProgresoMetas();
      setProgresoMetas(metas);
      setNuevaMetaDiaria(metas.metaDiaria.toString());
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarMeta = async () => {
    const monto = parseInt(nuevaMetaDiaria);
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Por favor, ingresa un monto válido mayor a 0',
        variant: 'destructive'
      });
      return;
    }

    setGuardandoMeta(true);
    try {
      await MetasService.guardarMetaDiaria(monto, user?.id);
      toast({
        title: 'Meta actualizada',
        description: `La meta diaria de ventas se ha configurado en ${formatCLPCurrency(monto)}.`
      });
      setMetaDialog(false);
      // Recargar datos
      const metas = await MetasService.obtenerProgresoMetas();
      setProgresoMetas(metas);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la meta.',
        variant: 'destructive'
      });
    } finally {
      setGuardandoMeta(false);
    }
  };

  const menuItems = [
    { 
      title: 'Ventas', 
      desc: 'Realizar nuevas ventas', 
      icon: ShoppingCart, 
      href: '/ventas', 
      color: 'bg-blue-500', 
      disabled: !sesionActiva,
      badge: sesionActiva ? 'SESIÓN ACTIVA' : 'ABRE CAJA'
    },
    { 
      title: 'Productos', 
      desc: 'Inventario y precios', 
      icon: Package, 
      href: '/admin', 
      color: 'bg-purple-500' 
    },
    { 
      title: 'Costos y Margen', 
      desc: 'Cotizaciones y sugerencias de precios', 
      icon: TrendingUp, 
      href: '/costos', 
      color: 'bg-indigo-500' 
    },
    { 
      title: 'Clientes', 
      desc: 'Créditos y contactos', 
      icon: Users, 
      href: '/clientes', 
      color: 'bg-emerald-500' 
    },
    { 
      title: 'Historial', 
      desc: 'Ventas y reportes', 
      icon: History, 
      href: '/historial', 
      color: 'bg-amber-500' 
    },
  ];

  if (cargando) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background">
        <BrandLogo className="h-20" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest opacity-60">
          INICIANDO FRUTAPOS...
        </p>
      </div>
    );
  }

  // Helper para porcentaje de metas
  const calcPct = (venta: number, meta: number) => {
    if (!meta) return 0;
    return Math.min(100, Math.round((venta / meta) * 100));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-8">
        {/* Welcome Header */}
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4 fill-primary" />
              <span className="text-xs font-black uppercase tracking-widest">Dashboard General</span>
            </div>
            <h1 className="text-2xl font-black text-foreground sm:text-3xl tracking-tight">
              ¡Hola de nuevo, {user?.name}!
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Rol: <span className="capitalize font-bold text-foreground">{user?.role === 'admin' ? 'Administrador' : 'Cajero'}</span>. Resumen de actividad para hoy.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <div className="flex items-center gap-2 rounded-2xl bg-card p-2 pr-4 shadow-sm border border-border/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500">
                   <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase leading-none opacity-60">Ventas Hoy (Acumulado)</div>
                  <div className="text-lg font-black leading-tight text-foreground">
                    {progresoMetas ? formatCLPCurrency(progresoMetas.ventasDia) : '$0'}
                  </div>
                </div>
             </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Quick Actions & Navigation & Financial Breakdown */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {menuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  disabled={item.disabled}
                  className={`group relative flex flex-col items-start justify-between rounded-3xl border border-border/40 bg-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 ${item.disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex w-full items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color.replace('500', '500/10')} ${item.color.replace('bg-', 'text-')}`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black text-primary uppercase tracking-wider border border-primary/10">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-8 text-left">
                    <h3 className="text-xl font-black text-foreground tracking-tight">{item.title}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground font-medium leading-relaxed opacity-70">{item.desc}</p>
                  </div>

                  <div className="mt-6 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 dark:bg-muted/20 text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Stats Card - DETAILED WITH PAYMENT METHODS */}
            <div className="rounded-[2rem] border border-border/40 bg-card p-8 shadow-sm">
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Rendimiento de la Sesión</h3>
                    <div className="text-4xl font-black tracking-tighter text-foreground">
                      {resumenSesion ? formatCLPCurrency(resumenSesion.total_ventas) : '$0'}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium opacity-70">
                      Total vendido en la sesión actual ({resumenSesion?.cantidad_ventas || 0} ventas)
                    </p>
                  </div>
                </div>

                {/* Desglose de Métodos de Pago */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Efectivo</span>
                    </div>
                    <div className="text-lg font-black text-foreground">
                      {resumenSesion ? formatCLPCurrency(resumenSesion.total_efectivo) : '$0'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-500">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Tarjeta</span>
                    </div>
                    <div className="text-lg font-black text-foreground">
                      {resumenSesion ? formatCLPCurrency(resumenSesion.total_tarjeta) : '$0'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-500">
                      <Send className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Transf.</span>
                    </div>
                    <div className="text-lg font-black text-foreground">
                      {resumenSesion ? formatCLPCurrency(resumenSesion.total_transferencia) : '$0'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Fiado</span>
                    </div>
                    <div className="text-lg font-black text-foreground text-destructive">
                      {resumenSesion ? formatCLPCurrency(resumenSesion.total_fiado) : '$0'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sessions, Goals & Side Info */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Sales Goals Tracker Widget */}
            <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 pb-4 pt-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Objetivos de Ventas</CardTitle>
                    <CardDescription className="text-[10px]">Progreso de facturación</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMetaDialog(true)}
                  className="h-8 w-8 rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {progresoMetas ? (
                  <>
                    {/* Meta Diaria */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Hoy</span>
                        <span className="text-muted-foreground">
                          {formatCLPCurrency(progresoMetas.ventasDia)} / {formatCLPCurrency(progresoMetas.metaDiaria)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${calcPct(progresoMetas.ventasDia, progresoMetas.metaDiaria)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progreso Diario</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {calcPct(progresoMetas.ventasDia, progresoMetas.metaDiaria)}%
                        </span>
                      </div>
                    </div>

                    {/* Meta Semanal */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Semana</span>
                        <span className="text-muted-foreground">
                          {formatCLPCurrency(progresoMetas.ventasSemana)} / {formatCLPCurrency(progresoMetas.metaSemanal)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-505 bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${calcPct(progresoMetas.ventasSemana, progresoMetas.metaSemanal)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progreso Semanal (Lunes-Dom)</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {calcPct(progresoMetas.ventasSemana, progresoMetas.metaSemanal)}%
                        </span>
                      </div>
                    </div>

                    {/* Meta Mensual */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Mes</span>
                        <span className="text-muted-foreground">
                          {formatCLPCurrency(progresoMetas.ventasMes)} / {formatCLPCurrency(progresoMetas.metaMensual)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${calcPct(progresoMetas.ventasMes, progresoMetas.metaMensual)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progreso Mensual (30 días)</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {calcPct(progresoMetas.ventasMes, progresoMetas.metaMensual)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-4">Cargando progreso de metas...</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 pb-4 pt-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold">Control de Caja</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <SesionCajaComponent />
              </CardContent>
            </Card>

            {sesionActiva && (
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Sesión en Curso</h4>
                    <p className="text-[10px] text-muted-foreground">Iniciada a las {sesionActiva.fecha_apertura.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => router.push('/ventas')}
                  className="mt-4 w-full rounded-xl bg-primary text-xs font-bold"
                >
                  Regresar a la Venta
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Meta Config Dialog */}
      <Dialog open={metaDialog} onOpenChange={setMetaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Configurar Objetivo de Ventas</DialogTitle>
            <DialogDescription>
              Ajusta la meta de ventas diaria para el negocio. Las metas semanales y mensuales se calcularán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="objetivo-diario">Objetivo de Venta Diario ($)</Label>
              <Input
                id="objetivo-diario"
                type="number"
                placeholder="Ej: 100000"
                value={nuevaMetaDiaria}
                onChange={(e) => setNuevaMetaDiaria(e.target.value)}
                className="text-lg h-12 rounded-xl font-bold"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaDialog(false)} disabled={guardandoMeta}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarMeta} disabled={guardandoMeta}>
              {guardandoMeta ? 'Guardando...' : 'Actualizar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <InicioPage />
    </ProtectedRoute>
  );
}

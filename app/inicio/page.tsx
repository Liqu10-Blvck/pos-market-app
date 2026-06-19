'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SesionService } from '@/lib/services/sesion.service';
import { VentasService } from '@/lib/services/ventas.service';
import { SesionCaja, Venta } from '@/lib/types/pos';
import { SesionCaja as SesionCajaComponent } from '@/components/pos/sesion-caja';
import { AppNav } from '@/components/layout/app-nav';
import { formatCLPCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, History, DollarSign, TrendingUp, Users, ArrowRight, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/ui/brand-logo';

import { ProtectedRoute } from '@/components/layout/protected-route';

function InicioPage() {
  const [sesionActiva, setSesionActiva] = useState<SesionCaja | null>(null);
  const [resumenSesion, setResumenSesion] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

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
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
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
              ¡Hola de nuevo!
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Resumen de actividad para tu negocio hoy.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <div className="flex items-center gap-2 rounded-2xl bg-card p-2 pr-4 shadow-sm border border-border/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-500">
                   <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase leading-none opacity-60">Ventas Hoy</div>
                  <div className="text-lg font-black leading-tight text-foreground">
                    {resumenSesion ? formatCLPCurrency(resumenSesion.total_ventas) : '$0'}
                  </div>
                </div>
             </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Quick Actions & Navigation */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {menuItems.map((item, idx) => (
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

            {/* Quick Stats Card - MINIMALIST */}
            <div className="rounded-[2rem] border border-border/40 bg-card p-8 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Rendimiento de Sesión</h3>
                  <div className="text-4xl font-black tracking-tighter text-foreground">
                    {resumenSesion ? formatCLPCurrency(resumenSesion.total_ventas) : '$0'}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium opacity-70">Sesión actual de hoy</p>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="text-center">
                    <div className="text-xl font-bold">{resumenSesion?.cantidad_ventas || 0}</div>
                    <div className="text-[10px] font-bold uppercase opacity-50">Ventas</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-xl font-bold">{resumenSesion?.total_efectivo ? formatCLPCurrency(resumenSesion.total_efectivo) : '$0'}</div>
                    <div className="text-[10px] font-bold uppercase opacity-50">Efectivo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sessions & Side Info */}
          <div className="lg:col-span-4 space-y-6">
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

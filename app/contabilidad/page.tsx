'use client';

import { useEffect } from 'react';
import { useContabilidadStore } from './hooks/useContabilidadStore';
import { ResumenPanel } from './components/ResumenPanel';
import { DiarioPanel } from './components/DiarioPanel';
import { MayorPanel } from './components/MayorPanel';
import { FacturasPanel } from './components/FacturasPanel';
import { GastosPanel } from './components/GastosPanel';
import { FlujoPanel } from './components/FlujoPanel';
import { AIChatPanel } from './components/AIChatPanel';
import { CapitalDialog } from './components/CapitalDialog';
import { calcularKPIsContables } from './utils/contabilidadUtils';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { 
  BookOpen, RefreshCw, ArrowUpRight, ArrowDownRight, 
  Landmark, Percent, Sparkles, FileText, ShoppingCart, 
  TrendingDown, Activity 
} from 'lucide-react';
import { formatCLPCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function ContabilidadPage() {
  const {
    activeTab,
    setActiveTab,
    cargando,
    cuentas,
    asientos,
    selectedCuentaCodigo,
    cargarDatosContables,
    cargarLibroMayor
  } = useContabilidadStore();

  const { toast } = useToast();

  // Load all accounting books on mount
  useEffect(() => {
    cargarDatosContables(toast);
  }, [cargarDatosContables]);

  // Load ledger details when selected account or journal entries change
  useEffect(() => {
    if (selectedCuentaCodigo) {
      cargarLibroMayor(selectedCuentaCodigo);
    }
  }, [selectedCuentaCodigo, asientos, cargarLibroMayor]);

  const contabilidadKPIs = calcularKPIsContables(asientos);

  if (cargando && cuentas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm font-semibold">Cargando libro contable general...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      {/* Header */}
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6 lg:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight uppercase">
              <BookOpen className="h-8 w-8 text-primary" />
              Contabilidad General
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-70 mt-1">
              Partida doble, Libro Diario, Libro Mayor, Liquidación de IVA Crédito/Débito e ingreso de Facturas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatosContables(toast)}
            className="rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-center h-10 px-4"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar Libros
          </Button>
        </div>
      </section>

      {/* Main KPI cards */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Utilidad Neta (Ingresos - Gastos)</p>
                <p className={`text-2xl font-black mt-1.5 ${contabilidadKPIs.utilidadNeta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCLPCurrency(contabilidadKPIs.utilidadNeta)}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">Ventas Netas: {formatCLPCurrency(contabilidadKPIs.ventas)}</span>
              </div>
              <div className={`p-2 rounded-xl ${contabilidadKPIs.utilidadNeta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {contabilidadKPIs.utilidadNeta >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Activos Totales (Debe)</p>
                <p className="text-2xl font-black mt-1.5 text-foreground">
                  {formatCLPCurrency(contabilidadKPIs.activosTotales)}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">Caja: {formatCLPCurrency(contabilidadKPIs.caja)} | Banco: {formatCLPCurrency(contabilidadKPIs.banco)}</span>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Landmark className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Estado de IVA Neto</p>
                <p className={`text-2xl font-black mt-1.5 ${contabilidadKPIs.ivaNeto >= 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatCLPCurrency(Math.abs(contabilidadKPIs.ivaNeto))}
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {contabilidadKPIs.ivaNeto >= 0 ? 'IVA por Pagar (Débito > Crédito)' : 'Remanente de IVA (Crédito > Débito)'}
                </span>
              </div>
              <div className={`p-2 rounded-xl ${contabilidadKPIs.ivaNeto >= 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Percent className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/40 relative overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="pt-6 flex items-start justify-between cursor-pointer" onClick={() => setActiveTab('ai-assistant')}>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Diagnóstico contable (IA)</p>
                <p className="text-sm font-extrabold mt-2 text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                  Consultar Gemini
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold block mt-1">Obtén auditoría en lenguaje natural</span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border/50 overflow-x-auto whitespace-nowrap scrollbar-none gap-6 text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'resumen'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            Resumen Financiero
          </button>
          
          <button
            onClick={() => setActiveTab('diario')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'diario'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Libro Diario
          </button>

          <button
            onClick={() => setActiveTab('mayor')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'mayor'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="h-4 w-4" />
            Libro Mayor
          </button>

          <button
            onClick={() => setActiveTab('facturas')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'facturas'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Compras (Doc. Recibidos)
          </button>

          <button
            onClick={() => setActiveTab('gastos')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'gastos'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            Gastos y Asignación
          </button>

          <button
            onClick={() => setActiveTab('flujo')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'flujo'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="h-4 w-4" />
            Flujo & Rotación
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`pb-3 font-bold border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'ai-assistant'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Asistente Contable (IA)
          </button>
        </div>

        {/* Tab Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'resumen' && <ResumenPanel />}
            {activeTab === 'diario' && <DiarioPanel />}
            {activeTab === 'mayor' && <MayorPanel />}
            {activeTab === 'facturas' && <FacturasPanel />}
            {activeTab === 'gastos' && <GastosPanel />}
            {activeTab === 'flujo' && <FlujoPanel />}
            {activeTab === 'ai-assistant' && <AIChatPanel />}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Global Modals */}
      <CapitalDialog />
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ContabilidadPage />
    </ProtectedRoute>
  );
}

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from './hooks/useCostosStore';
import { PreciosTab } from './components/PreciosTab';
import { VencimientosTab } from './components/VencimientosTab';
import { MayoristasTab } from './components/MayoristasTab';
import { MarketingAIAssistant } from './components/MarketingAIAssistant';
import { LiquidacionAIAssistant } from './components/LiquidacionAIAssistant';
import { esDiferente, calcularPrecioSugerido, obtenerDiasParaVencer } from './utils/costosUtils';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Save, 
  Loader2, 
  ArrowRightLeft, 
  Sparkles
} from 'lucide-react';
import { Producto } from '@/lib/types/pos';

function CostosPage() {
  const { productos, iniciarProductosListener } = useAppStore();
  const {
    activeTab,
    setActiveTab,
    guardandoTodo,
    aplicandoTodo,
    aiCargandoVencidos,
    nuevosCostos,
    margenesDeseados,
    inicializarInputs,
    handleGuardarTodo,
    handleAplicarTodoSugerido,
    handleGenerarLiquidacionVencimientos
  } = useCostosStore();

  const { toast } = useToast();

  // Start real-time sync for products
  useEffect(() => {
    const unsub = iniciarProductosListener();
    return () => unsub();
  }, [iniciarProductosListener]);

  const activeProducts = productos.filter(p => p.activo !== false);

  // Initialize input states once products load
  useEffect(() => {
    if (activeProducts.length > 0) {
      inicializarInputs(activeProducts);
    }
  }, [activeProducts, inicializarInputs]);

  // Determine if a product has changed compared to DB value
  const checkDiferente = (p: Producto) => esDiferente(p, nuevosCostos, margenesDeseados);
  const productsModified = activeProducts.filter(checkDiferente);

  // Products with expiration dates
  const productosConVencimiento = activeProducts.filter(p => p.fecha_caducidad);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        
        {/* Page Header */}
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">Pricing & Inventario</span>
            </div>
            <h1 className="text-2xl font-black text-foreground sm:text-3xl tracking-tight leading-tight">
              Control de Costos, Precios y Caducidades
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Gestiona los costos de tus productos, prevé pérdidas controlando fechas de vencimiento y optimiza tus ventas con IA.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            {activeTab === 'precios' && (
              <>
                <Button 
                  onClick={() => handleGuardarTodo(activeProducts, checkDiferente, toast)} 
                  disabled={guardandoTodo || productsModified.length === 0}
                  variant="outline"
                  className="rounded-2xl border-border/80 text-xs font-black shadow-sm h-11 w-full sm:w-auto"
                >
                  {guardandoTodo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 text-indigo-500" />}
                  Guardar Costos ({productsModified.length})
                </Button>
                <Button 
                  onClick={() => handleAplicarTodoSugerido(
                    activeProducts, 
                    (pid, cost) => calcularPrecioSugerido(nuevosCostos[pid], cost, margenesDeseados[pid]), 
                    toast
                  )} 
                  disabled={aplicandoTodo}
                  className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm h-11 w-full sm:w-auto"
                >
                  {aplicandoTodo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                  Aplicar Precios Sugeridos
                </Button>
              </>
            )}

            {activeTab === 'vencimientos' && (
              <Button 
                onClick={() => handleGenerarLiquidacionVencimientos(productosConVencimiento, obtenerDiasParaVencer, toast)} 
                disabled={aiCargandoVencidos || productosConVencimiento.length === 0}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm h-11 w-full sm:w-auto"
              >
                {aiCargandoVencidos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Crear Ofertas de Liquidación (IA)
              </Button>
            )}
          </div>
        </header>

        {/* Tab Selector */}
        <div className="flex border-b border-border/50 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('precios')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'precios'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Costos y Márgenes
          </button>
          
          <button
            onClick={() => setActiveTab('vencimientos')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 relative ${
              activeTab === 'vencimientos'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Control de Vencimientos
            {productosConVencimiento.some(p => obtenerDiasParaVencer(p.fecha_caducidad!) <= 30) && (
              <span className="absolute -top-1.5 -right-3.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mayoristas')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'mayoristas'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Precios Mayoristas
          </button>
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          {activeTab === 'precios' ? (
            <motion.div 
              key="precios-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-3"
            >
              <div className="xl:col-span-2 space-y-6">
                <PreciosTab />
              </div>
              <div className="space-y-6">
                <MarketingAIAssistant />
              </div>
            </motion.div>
          ) : activeTab === 'vencimientos' ? (
            <motion.div 
              key="vencimientos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-3"
            >
              <div className="xl:col-span-2 space-y-6">
                <VencimientosTab />
              </div>
              <div className="space-y-6">
                <LiquidacionAIAssistant />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="mayoristas-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full animate-in fade-in duration-300"
            >
              <MayoristasTab />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CostosPage />
    </ProtectedRoute>
  );
}

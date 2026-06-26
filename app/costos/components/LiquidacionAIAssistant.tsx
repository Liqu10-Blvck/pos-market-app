'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from '../hooks/useCostosStore';
import { obtenerDiasParaVencer } from '../utils/costosUtils';
import { RenderMarkdown } from './RenderMarkdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export function LiquidacionAIAssistant() {
  const { productos } = useAppStore();
  const {
    aiRespuestaVencidos,
    aiCargandoVencidos,
    handleGenerarLiquidacionVencimientos
  } = useCostosStore();
  const { toast } = useToast();

  const activeProducts = productos.filter(p => p.activo !== false);

  // Expiration-only products list
  const productosConVencimiento = activeProducts
    .filter(p => p.fecha_caducidad)
    .sort((a, b) => new Date(a.fecha_caducidad!).getTime() - new Date(b.fecha_caducidad!).getTime());

  return (
    <Card className="rounded-[2rem] border-indigo-500/20 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="h-24 w-24 text-indigo-500" />
      </div>

      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-red-500/5 to-indigo-500/5 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Liquidación Inteligente IA</CardTitle>
            <CardDescription className="text-[10px] uppercase font-black opacity-60">Prevención de Pérdidas</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        <div className="text-xs text-muted-foreground font-medium leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border/50">
          Esta herramienta analiza los abarrotes que vencen pronto y genera combos de descuento, carteles promocionales y consejos estratégicos para vender el stock hoy mismo.
        </div>

        <Button
          onClick={() => handleGenerarLiquidacionVencimientos(productosConVencimiento, obtenerDiasParaVencer, toast)}
          disabled={aiCargandoVencidos || productosConVencimiento.length === 0}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/10 h-11"
        >
          {aiCargandoVencidos ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando ofertas de liquidación...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Diseñar Estrategia de Ofertas (IA)
            </>
          )}
        </Button>

        <AnimatePresence>
          {(aiRespuestaVencidos || aiCargandoVencidos) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="rounded-2xl border border-border bg-background/40 p-4 max-h-[480px] overflow-y-auto custom-scrollbar"
            >
              {aiCargandoVencidos ? (
                <div className="space-y-3 py-6 text-center text-xs text-muted-foreground font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                  <span>Gemini calculando ofertas y redactando carteles de descuento...</span>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert">
                  <RenderMarkdown text={aiRespuestaVencidos || ''} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!aiRespuestaVencidos && !aiCargandoVencidos && (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground font-medium">
            <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground/60 mb-2" />
            Haz click en el botón de arriba para que Gemini cree estrategias rápidas de liquidación.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

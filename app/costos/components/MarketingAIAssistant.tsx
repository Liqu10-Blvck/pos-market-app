'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from '../hooks/useCostosStore';
import { RenderMarkdown } from './RenderMarkdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MarketingAIAssistant() {
  const { productos } = useAppStore();
  const {
    aiContexto,
    setAiContexto,
    marketingProductId,
    setMarketingProductId,
    aiRespuesta,
    aiCargando,
    chatLogs,
    cargarHistorialIA,
    handleGenerarMarketingIA
  } = useCostosStore();
  const { toast } = useToast();

  const activeProducts = productos.filter(p => p.activo !== false);

  useEffect(() => {
    cargarHistorialIA(marketingProductId);
  }, [marketingProductId]);

  return (
    <Card className="rounded-[2rem] border-indigo-500/20 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden relative flex flex-col h-[650px]">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="h-24 w-24 text-indigo-500" />
      </div>

      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-5 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Asistente de Marketing</CardTitle>
            <CardDescription className="text-[10px] uppercase font-black opacity-60">Sugerencias Inteligentes Gemini</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="space-y-1.5 shrink-0">
          <Label htmlFor="marketing-product" className="text-[11px] font-bold opacity-75">Seleccionar Alcance del Análisis</Label>
          <Select
            value={marketingProductId}
            onValueChange={(val) => setMarketingProductId(val)}
          >
            <SelectTrigger id="marketing-product" className="w-full rounded-xl border border-border/60 text-xs bg-background/50 dark:bg-card/40 font-bold text-foreground">
              <SelectValue placeholder="Selecciona Alcance del Análisis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">📊 Analizar Catálogo Completo (Todos los Productos)</SelectItem>
              {activeProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  📦 {p.nombre} {p.sku ? `(SKU: ${p.sku})` : ''} - Stock: {p.stock_actual.toFixed(2)} {p.unidad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 pr-1 -mr-1">
          <div className="space-y-4 pb-4">
            {/* Chat history */}
            {chatLogs.map((log) => (
              <div key={log.id} className="space-y-2.5">
                {/* User query */}
                <div className="flex justify-end">
                  <div className="bg-indigo-600 text-white rounded-2xl px-3.5 py-2 text-xs font-semibold max-w-[85%] shadow-sm">
                    <p className="font-bold text-[8px] uppercase tracking-wider opacity-75 mb-0.5">Tú</p>
                    {log.pregunta}
                  </div>
                </div>

                {/* Assistant response */}
                <div className="flex justify-start">
                  <div className="bg-background/85 dark:bg-card/90 border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                    <p className="font-black text-[8px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Asistente de Marketing
                    </p>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      <RenderMarkdown text={log.respuesta} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Current streaming/unsaved response */}
            {aiRespuesta && !chatLogs.some(log => log.respuesta === aiRespuesta) && (
              <div className="space-y-2.5">
                <div className="flex justify-start">
                  <div className="bg-background/85 dark:bg-card/90 border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                    <p className="font-black text-[8px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Asistente de Marketing
                    </p>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      <RenderMarkdown text={aiRespuesta} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loader when generating */}
            {aiCargando && (
              <div className="flex justify-start">
                <div className="bg-background/85 dark:bg-card/90 border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="font-semibold text-xs">Analizando rentabilidad y generando estrategias...</span>
                </div>
              </div>
            )}

            {chatLogs.length === 0 && !aiRespuesta && !aiCargando && (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <Sparkles className="h-8 w-8 mx-auto opacity-30 text-indigo-500" />
                <p className="font-bold text-xs">¿Cómo puedo ayudarte con tu marketing hoy?</p>
                <p className="text-[10px] opacity-75 max-w-xs mx-auto">Selecciona una sugerencia rápida o escribe tu instrucción personalizada abajo.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggestions Area */}
        <div className="space-y-2 shrink-0 pt-2 border-t border-border/40">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {marketingProductId === 'todos' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleGenerarMarketingIA(activeProducts, 'Analizar el inventario completo y sugerir estrategias de precios para mejorar rentabilidad', toast)}
                  className="px-2.5 py-1.5 text-[9px] font-bold border rounded-lg bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Estrategias de Precios
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerarMarketingIA(activeProducts, 'Proponer 3 combos promocionales cruzados (cross-selling) atractivos con los productos actuales', toast)}
                  className="px-2.5 py-1.5 text-[9px] font-bold border rounded-lg bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Combos de Productos
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleGenerarMarketingIA(activeProducts, '¿Cómo puedo aumentar rápidamente la rotación de stock de este producto en el local?', toast)}
                  className="px-2.5 py-1.5 text-[9px] font-bold border rounded-lg bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Aumentar Rotación
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerarMarketingIA(activeProducts, 'Diseña un cartel promocional creativo y copia persuasiva para este producto', toast)}
                  className="px-2.5 py-1.5 text-[9px] font-bold border rounded-lg bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Diseñar Cartel/Promo
                </button>
              </>
            )}
          </div>

          {/* Text Input area */}
          <div className="flex gap-2 items-center">
            <textarea
              id="contexto"
              rows={1}
              placeholder={
                marketingProductId === 'todos'
                  ? "Ej: 'Fin de semana largo y quiero aumentar ventas...'"
                  : "Ej: 'Sugerir precio rentable si el proveedor aumentó 10%...'"
              }
              value={aiContexto}
              onChange={(e) => setAiContexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerarMarketingIA(activeProducts, undefined, toast);
                }
              }}
              className="flex-1 p-2.5 rounded-xl border border-border/60 text-xs bg-background/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium leading-relaxed resize-none text-foreground"
            />
            <Button
              onClick={() => handleGenerarMarketingIA(activeProducts, undefined, toast)}
              disabled={aiCargando || activeProducts.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-3.5 shrink-0"
            >
              Enviar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

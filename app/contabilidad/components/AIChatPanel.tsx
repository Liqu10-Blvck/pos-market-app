'use client';

import React from 'react';
import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { calcularKPIsContables } from '../utils/contabilidadUtils';
import { RenderMarkdown } from './RenderMarkdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send, Activity, Percent, TrendingDown, Target } from 'lucide-react';

export function AIChatPanel() {
  const {
    asientos,
    chatLogs,
    aiRespuesta,
    aiCargando,
    aiContexto,
    setAiContexto,
    handleEnviarMensajeIA
  } = useContabilidadStore();

  const { toast } = useToast();
  
  // Calculate KPIs to pass to prompt context
  const contabilidadKPIs = calcularKPIsContables(asientos);

  // Helper for quick suggestion clicks
  const handleQuickSuggestion = (text: string) => {
    setAiContexto(text);
  };

  return (
    <div className="mt-0 outline-none">
      <Card className="border border-border/50 w-full rounded-[2rem] overflow-hidden shadow-lg bg-card/60 backdrop-blur-sm flex flex-col h-[75vh]">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Asistente Contable & Financiero con IA</CardTitle>
              <p className="text-[10px] uppercase font-black text-muted-foreground opacity-75">Diagnóstico y Consejos en base a tu Partida Doble</p>
            </div>
          </div>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-5 space-y-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Chat logs */}
            {chatLogs.map((log) => (
              <div key={log.id} className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-indigo-600 text-white rounded-2xl px-4 py-2.5 text-xs font-semibold max-w-[85%] shadow-sm">
                    <p className="font-bold text-[9px] uppercase tracking-wider opacity-75 mb-0.5">Tú</p>
                    {log.pregunta}
                  </div>
                </div>

                {/* Assistant reply */}
                <div className="flex justify-start">
                  <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                    <p className="font-black text-[9px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Asistente Contable
                    </p>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      <RenderMarkdown text={log.respuesta} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Temporary screen response if any */}
            {aiRespuesta && !chatLogs.some(log => log.respuesta === aiRespuesta) && (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm prose prose-sm dark:prose-invert">
                    <p className="font-black text-[9px] uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Asistente Contable
                    </p>
                    <div className="leading-relaxed whitespace-pre-wrap">
                      <RenderMarkdown text={aiRespuesta} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generating placeholder */}
            {aiCargando && (
              <div className="flex justify-start">
                <div className="bg-background border border-border/60 rounded-2xl px-4 py-3 text-xs text-muted-foreground max-w-[85%] shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="font-semibold text-xs">El asistente está analizando tus registros financieros...</span>
                </div>
              </div>
            )}

            {chatLogs.length === 0 && !aiRespuesta && !aiCargando && (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Sparkles className="h-10 w-10 mx-auto opacity-30 text-indigo-500" />
                <p className="font-bold text-sm">¿Cómo puedo ayudarte con tu contabilidad hoy?</p>
                <p className="text-xs opacity-75 max-w-sm mx-auto">Selecciona una sugerencia de abajo o escribe una consulta libre sobre tus transacciones.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <CardContent className="p-4 border-t bg-muted/10 shrink-0 space-y-4">
          {/* Suggestions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSuggestion('Realiza un diagnóstico de salud financiera general del negocio y da 3 consejos inmediatos para aumentar ganancias y reducir costos.')}
                className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
              >
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
                Salud General
              </button>
              <button
                type="button"
                onClick={() => handleQuickSuggestion('Analiza mi saldo acumulado de IVA Crédito Fiscal contra IVA Débito Fiscal. Explica cuánto debo pagar, si tengo remanente y qué estrategias tributarias legales puedo aplicar.')}
                className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
              >
                <Percent className="h-3.5 w-3.5 text-emerald-500" />
                IVA Impuestos
              </button>
              <button
                type="button"
                onClick={() => handleQuickSuggestion('¿Cómo se comparan mis Gastos Generales (Egresos fijos) contra mis Ventas Netas y utilidad neta? Dame ideas de control.')}
                className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
              >
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                Reducir Gastos
              </button>
              <button
                type="button"
                onClick={() => handleQuickSuggestion('¿Qué punto de equilibrio de ventas diarias necesito cubrir para solventar los costos de mercaderías (Costo de Ventas) y gastos fijos? Proyecta una meta.')}
                className="p-2.5 text-[9px] text-center font-bold border rounded-xl bg-background/65 hover:bg-indigo-500/5 border-border/70 text-foreground transition-all duration-200 flex flex-col items-center justify-center gap-1"
              >
                <Target className="h-3.5 w-3.5 text-purple-500" />
                Punto Equilibrio
              </button>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <textarea
              id="ai_pregunta_input"
              rows={1}
              placeholder="Pregúntale al Asistente contable..."
              value={aiContexto}
              onChange={(e) => setAiContexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviarMensajeIA(e, contabilidadKPIs, asientos, toast);
                }
              }}
              className="flex-1 p-3 rounded-xl border border-border/60 text-[16px] md:text-xs bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold leading-relaxed resize-none text-foreground"
            />
            <Button
              onClick={(e) => handleEnviarMensajeIA(e, contabilidadKPIs, asientos, toast)}
              disabled={aiCargando || !aiContexto.trim() || asientos.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 shrink-0"
            >
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

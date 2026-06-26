import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useClientesStore } from '../hooks/useClientesStore';
import { formatCLPCurrency } from '../../../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { 
  Phone, 
  MapPin, 
  Store, 
  Tag, 
  Calendar, 
  Sparkles, 
  CreditCard, 
  ArrowUpRight, 
  ShoppingBag, 
  TrendingUp, 
  Loader2 
} from 'lucide-react';
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-foreground/80 dark:text-foreground/90">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Headings
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-3 mb-1">
              {trimmed.replace('###', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="text-sm font-black text-foreground mt-4 mb-2">
              {trimmed.replace('##', '').trim()}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={idx} className="text-base font-black text-foreground mt-4 mb-2">
              {trimmed.replace('#', '').trim()}
            </h2>
          );
        }

        // List items
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const itemContent = trimmed.substring(1).trim();
          return (
            <ul key={idx} className="list-disc pl-4 space-y-1 my-1">
              <li className="text-[11px]">
                {parseBoldText(itemContent)}
              </li>
            </ul>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="text-[11px] leading-relaxed">
            {parseBoldText(line)}
          </p>
        );
      })}
    </div>
  );
};

function parseBoldText(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-foreground">{part}</strong>;
    }
    return part;
  });
}

export const ClientDetailModal: React.FC = () => {
  const { toast } = useToast();
  
  const detalleModalOpen = useClientesStore((state) => state.detalleModalOpen);
  const setDetalleModalOpen = useClientesStore((state) => state.setDetalleModalOpen);
  const detalleCliente = useClientesStore((state) => state.detalleCliente);
  const detalleVentas = useClientesStore((state) => state.detalleVentas);
  const cargandoVentas = useClientesStore((state) => state.cargandoVentas);
  const recomendacionIA = useClientesStore((state) => state.recomendacionIA);
  const generandoRecomendacion = useClientesStore((state) => state.generandoRecomendacion);
  const generarOfertaIA = useClientesStore((state) => state.generarOfertaIA);

  if (!detalleCliente) return null;

  // Calculate metrics
  const totalComprasCount = detalleVentas.length;
  const totalGastado = detalleVentas.reduce((sum, v) => sum + v.total, 0);
  const ticketPromedio = totalComprasCount > 0 ? Math.round(totalGastado / totalComprasCount) : 0;
  
  // Favorite payment method
  const metodosPago = detalleVentas.map(v => v.metodo_pago);
  const favoritosMap = metodosPago.reduce((acc, current) => {
    acc[current] = (acc[current] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const metodoFavorito = Object.keys(favoritosMap).reduce(
    (a, b) => (favoritosMap[a] > favoritosMap[b] ? a : b), 
    'N/A'
  );

  return (
    <Dialog open={detalleModalOpen} onOpenChange={setDetalleModalOpen}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#080b12] rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 font-black shadow-inner text-xl">
              {detalleCliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">{detalleCliente.nombre}</DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3 w-3" />
                {detalleCliente.telefono || 'Sin teléfono'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className="grid grid-cols-3 bg-muted/60 dark:bg-muted/10 p-1 rounded-xl mb-4">
            <TabsTrigger value="perfil" className="rounded-lg font-bold text-xs">Perfil & Métricas</TabsTrigger>
            <TabsTrigger value="historial" className="rounded-lg font-bold text-xs">Historial de Compras</TabsTrigger>
            <TabsTrigger value="ia" className="rounded-lg font-bold text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500 animate-pulse" />
              Ofertas con IA
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden min-h-0">
            {/* Tab: Perfil & Métricas */}
            <TabsContent value="perfil" className="h-full flex flex-col gap-4 overflow-y-auto pr-1 m-0">
              {/* Cards de Información General */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 dark:bg-muted/5 rounded-2xl border border-border/40 flex items-start gap-3">
                  <Store className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-70">Negocio</span>
                    <p className="text-sm font-bold text-foreground">{detalleCliente.nombre_negocio || 'No especificado'}</p>
                    <p className="text-[10px] text-muted-foreground">{detalleCliente.rubro_negocio || 'Sin rubro registrado'}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 dark:bg-muted/5 rounded-2xl border border-border/40 flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground opacity-70">Dirección</span>
                    <p className="text-sm font-bold text-foreground leading-snug">{detalleCliente.direccion || 'Sin dirección'}</p>
                  </div>
                </div>
              </div>

              {/* Límite de Crédito y Deuda */}
              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Estado Crediticio</span>
                  <span className="text-xs text-muted-foreground font-bold">
                    Límite: {detalleCliente.limite_credito ? formatCLPCurrency(detalleCliente.limite_credito) : 'Sin límite'}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">Deuda Fiada Actual:</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-500 tracking-tighter">
                      {formatCLPCurrency(detalleCliente.saldo_deuda)}
                    </p>
                  </div>
                  {detalleCliente.limite_credito ? (
                    <span className="text-xs font-black text-amber-600">
                      {Math.round((detalleCliente.saldo_deuda / detalleCliente.limite_credito) * 100)}% del límite usado
                    </span>
                  ) : null}
                </div>
                {detalleCliente.limite_credito ? (
                  <div className="w-full bg-muted/60 dark:bg-muted/10 h-2 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${detalleCliente.saldo_deuda >= detalleCliente.limite_credito ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (detalleCliente.saldo_deuda / detalleCliente.limite_credito) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Estadísticas de Compra */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Estadísticas Comerciales</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/40 dark:bg-muted/5 rounded-2xl border border-border/30 text-center">
                    <ShoppingBag className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Compras</span>
                    <p className="text-lg font-black text-foreground mt-0.5">{totalComprasCount}</p>
                  </div>
                  <div className="p-3 bg-muted/40 dark:bg-muted/5 rounded-2xl border border-border/30 text-center">
                    <TrendingUp className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Total Comprado</span>
                    <p className="text-lg font-black text-green-600 mt-0.5">{formatCLPCurrency(totalGastado)}</p>
                  </div>
                  <div className="p-3 bg-muted/40 dark:bg-muted/5 rounded-2xl border border-border/30 text-center">
                    <ArrowUpRight className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Ticket Promedio</span>
                    <p className="text-lg font-black text-foreground mt-0.5">{formatCLPCurrency(ticketPromedio)}</p>
                  </div>
                  <div className="p-3 bg-muted/40 dark:bg-muted/5 rounded-2xl border border-border/30 text-center">
                    <CreditCard className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Pago Preferido</span>
                    <p className="text-sm font-black text-indigo-600 mt-1 uppercase tracking-tight">{metodoFavorito}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Historial de Compras */}
            <TabsContent value="historial" className="h-full flex flex-col m-0">
              <ScrollArea className="flex-1 pr-2">
                {cargandoVentas ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Obteniendo historial desde la base de datos...</p>
                  </div>
                ) : detalleVentas.length === 0 ? (
                  <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-border/50">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-bold text-muted-foreground">No se registran compras para este cliente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detalleVentas.map((venta) => (
                      <div key={venta.id} className="p-3.5 bg-muted/20 dark:bg-muted/5 rounded-2xl border border-border/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-lg">
                              N° {venta.numero_venta || 'S/N'}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {venta.fecha?.seconds 
                                ? new Date(venta.fecha.seconds * 1000).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                                : 'N/A'}
                            </span>
                          </div>
                          <span className="text-sm font-black text-foreground">
                            {formatCLPCurrency(venta.total)}
                          </span>
                        </div>
                        {/* Productos */}
                        <div className="flex flex-wrap gap-1.5 border-t border-border/20 pt-2">
                          {venta.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] bg-background border border-border/50 px-2 py-0.5 rounded-md font-medium">
                              {item.nombre} x {item.cantidad || item.peso_bruto || 1} {item.unidad}
                            </span>
                          ))}
                        </div>
                        {/* Método de pago */}
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-black tracking-wider mt-1">
                          <span>Pago: {venta.metodo_pago}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Tab: Recomendación de IA */}
            <TabsContent value="ia" className="h-full flex flex-col m-0 gap-3">
              {recomendacionIA ? (
                <ScrollArea className="flex-1 bg-indigo-500/5 dark:bg-[#0f1424] rounded-2xl border border-indigo-500/15 p-4">
                  <div className="prose prose-sm dark:prose-invert prose-indigo text-xs leading-relaxed max-w-none">
                    <SimpleMarkdown content={recomendacionIA} />
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-2xl border border-dashed border-border/50">
                  <Sparkles className="h-12 w-12 text-indigo-500 mb-3 animate-bounce" />
                  <h4 className="text-sm font-bold mb-1">Generar Sugerencias & Ofertas con IA</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mb-4">
                    Gemini analizará el rubro, historial de productos comprados y saldos para proponerte ofertas de marketing exclusivas.
                  </p>
                  <Button 
                    onClick={() => generarOfertaIA(toast)} 
                    disabled={generandoRecomendacion}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-2 shadow-lg"
                  >
                    {generandoRecomendacion ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analizando Datos...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generar Campaña Personalizada
                      </>
                    )}
                  </Button>
                </div>
              )}
              {recomendacionIA && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => generarOfertaIA(toast)} 
                    disabled={generandoRecomendacion}
                    className="text-xs rounded-xl gap-1.5 h-9"
                  >
                    {generandoRecomendacion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-indigo-500" />}
                    Regenerar Oferta
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from '../hooks/useCostosStore';
import { obtenerDiasParaVencer } from '../utils/costosUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Barcode, 
  Calendar,
  AlertTriangle,
  CalendarOff
} from 'lucide-react';
import { formatCLPCurrency } from '@/lib/utils';

export function VencimientosTab() {
  const { productos } = useAppStore();
  const { filtroBusqueda, setFiltroBusqueda } = useCostosStore();

  const activeProducts = productos.filter(p => p.activo !== false);

  // Expiration-only products list
  const productosConVencimiento = activeProducts
    .filter(p => p.fecha_caducidad)
    .sort((a, b) => new Date(a.fecha_caducidad!).getTime() - new Date(b.fecha_caducidad!).getTime());

  // Filtered expiration list
  const productosConVencimientoFiltrados = productosConVencimiento.filter(p =>
    p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  return (
    <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 px-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">Vencimiento de Abarrotes</CardTitle>
            <CardDescription className="text-xs">
              Listado de productos con caducidades registradas, ordenados de forma crítica.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
            <Input
              placeholder="Buscar producto..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              className="pl-9 rounded-xl border-border/60 text-[16px] md:text-xs bg-background/50 h-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {productosConVencimientoFiltrados.map((p) => {
            const dias = obtenerDiasParaVencer(p.fecha_caducidad!);
            const estaVencido = dias < 0;
            const proximo = dias >= 0 && dias <= 30;

            return (
              <div 
                key={p.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border transition-all duration-300 ${
                  estaVencido ? 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400' :
                  proximo ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400' :
                  'bg-card border-border/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{p.nombre}</span>
                    {p.sku && (
                      <span className="text-[9px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1 shrink-0">
                        <Barcode className="h-2.5 w-2.5" />
                        {p.sku}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-semibold flex flex-wrap items-center gap-2">
                    <span className="text-indigo-500 font-bold">Stock: {p.stock_actual} {p.unidad}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>Precio: {formatCLPCurrency(p.precio)}</span>
                  </div>
                </div>

                <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-border/30 pt-2.5 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold flex items-center gap-1.5 justify-start sm:justify-end">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{p.fecha_caducidad}</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-wider mt-0.5 opacity-80">
                      {estaVencido ? (
                        <span className="text-red-500 font-black">Vencido</span>
                      ) : proximo ? (
                        <span className="text-amber-500">{dias} días restantes</span>
                      ) : (
                        <span className="text-emerald-500">{dias} días restantes</span>
                      )}
                    </div>
                  </div>

                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    estaVencido ? 'bg-red-500/10 text-red-500' :
                    proximo ? 'bg-amber-500/10 text-amber-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}

          {productosConVencimiento.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-semibold">
              <CalendarOff className="h-16 w-16 mx-auto opacity-30 mb-4" />
              <h3>No hay productos con vencimiento</h3>
              <p className="text-xs text-muted-foreground/85 font-medium mt-1">
                Para monitorear vencimientos, edita un producto en el catálogo y añade su fecha de caducidad.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

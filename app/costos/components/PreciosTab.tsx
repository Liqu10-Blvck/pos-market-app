'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from '../hooks/useCostosStore';
import { calcularPrecioSugerido, esDiferente } from '../utils/costosUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2, 
  Check,
  Barcode 
} from 'lucide-react';
import { formatCLPCurrency } from '@/lib/utils';

export function PreciosTab() {
  const { productos, productosCargados } = useAppStore();
  const { 
    filtroBusqueda, 
    setFiltroBusqueda, 
    nuevosCostos, 
    setNuevoCosto, 
    margenesDeseados, 
    setMargenDeseado,
    guardandoProductoId,
    handleGuardarProducto,
    handleAplicarSugerido
  } = useCostosStore();
  const { toast } = useToast();

  const activeProducts = productos.filter(p => p.activo !== false);
  const sortedProducts = [...activeProducts].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Filtered product list (precios tab)
  const productosFiltrados = sortedProducts.filter(p =>
    p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  return (
    <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 px-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">Listado de Cotizaciones</CardTitle>
            <CardDescription className="text-xs">Introduce el costo mayorista y previsualiza los precios.</CardDescription>
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

      {/* Desktop Table View */}
      <CardContent className="p-0">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <th className="p-4 pl-6">Producto</th>
                <th className="p-4">Costo Mayorista</th>
                <th className="p-4">Margen Deseado</th>
                <th className="p-4">Venta Sugerida</th>
                <th className="p-4">Venta Actual</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {productosFiltrados.map((p) => {
                const sug = calcularPrecioSugerido(nuevosCostos[p.id], p.costo_actual, margenesDeseados[p.id]);
                const changed = esDiferente(p, nuevosCostos, margenesDeseados);
                
                return (
                  <tr 
                    key={p.id}
                    className={`group transition-colors ${changed ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : 'hover:bg-muted/30'}`}
                  >
                    <td className="p-4 pl-6">
                      <div>
                        <div className="font-bold text-foreground text-sm tracking-tight">{p.nombre}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5 flex items-center gap-1.5 opacity-70">
                          <span>{p.unidad === 'kg' ? 'Venta por Peso' : 'Venta por Unidad'}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-indigo-500 font-bold">Stock: {p.stock_actual.toFixed(2)} {p.unidad}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-60">$</span>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={nuevosCostos[p.id] || ''}
                          onChange={(e) => setNuevoCosto(p.id, e.target.value)}
                          className="pl-6 pr-2 rounded-lg border-border/60 text-xs bg-background/40 h-9 font-semibold"
                        />
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="relative w-20">
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          placeholder="30"
                          value={margenesDeseados[p.id] || '30'}
                          onChange={(e) => setMargenDeseado(p.id, e.target.value)}
                          className="pr-6 pl-2.5 rounded-lg border-border/60 text-xs bg-background/40 h-9 font-semibold text-center"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground opacity-60 font-black">%</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {sug > 0 ? formatCLPCurrency(sug) : '—'}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-foreground text-sm">
                        {formatCLPCurrency(p.precio)}
                      </div>
                      {p.costo_actual && p.costo_actual > 0 ? (
                        <div className={`text-[9px] font-black mt-0.5 uppercase tracking-wide ${
                          p.precio < p.costo_actual ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {(((p.precio - p.costo_actual) / p.precio) * 100).toFixed(0)}% real
                        </div>
                      ) : (
                        <div className="text-[9px] text-muted-foreground mt-0.5 font-semibold uppercase opacity-50">
                          Sin costo
                        </div>
                      )}
                    </td>

                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {changed && (
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={guardandoProductoId === p.id}
                            onClick={() => handleGuardarProducto(p, toast)}
                            className="h-8 w-8 rounded-lg border-indigo-500/20 bg-indigo-500/5 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                          >
                            {guardandoProductoId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sug <= 0 || sug === p.precio}
                          onClick={() => handleAplicarSugerido(p, sug, toast)}
                          className="h-8 text-[10px] font-bold rounded-lg border border-border bg-background hover:bg-muted"
                        >
                          Aplicar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="block md:hidden divide-y divide-border/30">
          {productosFiltrados.map((p) => {
            const sug = calcularPrecioSugerido(nuevosCostos[p.id], p.costo_actual, margenesDeseados[p.id]);
            const changed = esDiferente(p, nuevosCostos, margenesDeseados);
            
            return (
              <div 
                key={p.id}
                className={`p-4 transition-colors ${changed ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground leading-tight">{p.nombre}</h4>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block mt-0.5">
                      Stock: {p.stock_actual.toFixed(2)} {p.unidad} ({p.unidad === 'kg' ? 'peso' : 'unid'})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {changed && (
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={guardandoProductoId === p.id}
                        onClick={() => handleGuardarProducto(p, toast)}
                        className="h-9 w-9 rounded-xl bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
                      >
                        {guardandoProductoId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sug <= 0 || sug === p.precio}
                      onClick={() => handleAplicarSugerido(p, sug, toast)}
                      className="h-9 text-[10px] font-black rounded-xl"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>

                {/* Cost and Margin side by side */}
                <div className="grid grid-cols-2 gap-3.5 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-75">Costo Mayorista</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-60">$</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={nuevosCostos[p.id] || ''}
                        onChange={(e) => setNuevoCosto(p.id, e.target.value)}
                        className="pl-6 pr-2 rounded-xl text-[16px] bg-background/40 h-10 font-bold border-border/70"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-75">Margen Deseado</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="1000"
                        placeholder="30"
                        value={margenesDeseados[p.id] || '30'}
                        onChange={(e) => setMargenDeseado(p.id, e.target.value)}
                        className="pr-6 pl-3 rounded-xl text-[16px] bg-background/40 h-10 font-bold text-center border-border/70"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">%</span>
                    </div>
                  </div>
                </div>

                {/* Suggested Pricing row */}
                <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl text-xs font-semibold">
                  <div>
                    <span className="text-muted-foreground text-[10px]">Sugerido:</span>{' '}
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {sug > 0 ? formatCLPCurrency(sug) : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-[10px]">Actual:</span>{' '}
                    <span className="font-bold text-foreground">
                      {formatCLPCurrency(p.precio)}
                    </span>
                    {p.costo_actual && p.costo_actual > 0 && (
                      <span className={`ml-1 text-[9px] font-black uppercase ${
                        p.precio < p.costo_actual ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                        ({(((p.precio - p.costo_actual) / p.precio) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground font-semibold">
            {!productosCargados ? (
              <div className="flex justify-center items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Cargando catálogo...
              </div>
            ) : (
              'No se encontraron productos activos.'
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

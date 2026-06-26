'use client';

import React, { useEffect, useMemo } from 'react';
import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { calcularProductFlow } from '../utils/contabilidadUtils';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Activity, Loader2 } from 'lucide-react';

export function FlujoPanel() {
  const {
    productos,
    facturas,
    flujoFechaInicio,
    setFlujoFechaInicio,
    flujoFechaFin,
    setFlujoFechaFin,
    flujoVentas,
    cargandoFlujo,
    cargarFlujoVentas
  } = useContabilidadStore();

  const { toast } = useToast();

  // Load sales history on range change
  useEffect(() => {
    cargarFlujoVentas(toast);
  }, [flujoFechaInicio, flujoFechaFin, cargarFlujoVentas]);

  // Compile flows
  const productFlowData = useMemo(() => {
    return calcularProductFlow(productos, facturas, flujoVentas, flujoFechaInicio, flujoFechaFin);
  }, [productos, facturas, flujoVentas, flujoFechaInicio, flujoFechaFin]);

  return (
    <div className="mt-0 outline-none space-y-4">
      <Card className="border border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Flujo de Entrada y Salida de Inventario
              </CardTitle>
              <p className="text-xs text-muted-foreground">Compara el ingreso (compras) versus salidas (ventas) en el rango seleccionado.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto self-start sm:self-center">
              <Input
                type="date"
                value={flujoFechaInicio}
                onChange={(e) => setFlujoFechaInicio(e.target.value)}
                className="h-9 text-[16px] md:text-xs rounded-xl w-full sm:w-36 font-semibold"
              />
              <span className="text-xs font-bold text-muted-foreground">a</span>
              <Input
                type="date"
                value={flujoFechaFin}
                onChange={(e) => setFlujoFechaFin(e.target.value)}
                className="h-9 text-[16px] md:text-xs rounded-xl w-full sm:w-36 font-semibold"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cargandoFlujo ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-bold">Calculando movimientos de productos...</span>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-6">Producto</TableHead>
                    <TableHead className="text-right">Entradas (Compras)</TableHead>
                    <TableHead className="text-right">Salidas (Ventas)</TableHead>
                    <TableHead className="text-right">Flujo Neto</TableHead>
                    <TableHead className="text-right">Stock de Catálogo</TableHead>
                    <TableHead className="text-center pr-6">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((prod) => {
                    const flow = productFlowData[prod.id] || { entradas: 0, salidas: 0 };
                    const netFlow = flow.entradas - flow.salidas;
                    const stock = prod.stock_actual;

                    return (
                      <TableRow key={prod.id} className="hover:bg-muted/5 transition-colors text-xs">
                        <TableCell className="font-bold pl-6">{prod.nombre}</TableCell>
                        <TableCell className="text-right text-emerald-500 font-semibold">
                          +{prod.unidad === 'kg' ? flow.entradas.toFixed(2) : Math.round(flow.entradas)} {prod.unidad}
                        </TableCell>
                        <TableCell className="text-right text-red-500 font-semibold">
                          -{prod.unidad === 'kg' ? flow.salidas.toFixed(2) : Math.round(flow.salidas)} {prod.unidad}
                        </TableCell>
                        <TableCell className={`text-right font-black ${netFlow > 0 ? 'text-emerald-500' : netFlow < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {netFlow > 0 ? '+' : ''}{prod.unidad === 'kg' ? netFlow.toFixed(2) : Math.round(netFlow)} {prod.unidad}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {prod.unidad === 'kg' ? stock.toFixed(2) : Math.round(stock)} {prod.unidad}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {stock < 5 ? (
                            <Badge className="bg-red-500 hover:bg-red-600 font-bold text-[8px] uppercase tracking-wider text-white">Crítico</Badge>
                          ) : stock < 15 ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 font-bold text-[8px] uppercase tracking-wider text-white">Bajo</Badge>
                          ) : (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold text-[8px] uppercase tracking-wider text-white">Saludable</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {productos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No hay productos catalogados para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

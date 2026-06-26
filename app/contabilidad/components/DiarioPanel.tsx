'use client';

import { useState } from 'react';
import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCLPCurrency } from '@/lib/utils';

export function DiarioPanel() {
  const { asientos } = useContabilidadStore();
  const [expandedAsientoId, setExpandedAsientoId] = useState<string | null>(null);

  return (
    <div className="mt-0 outline-none">
      <Card className="border border-border/50">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-extrabold uppercase tracking-wider">Libro Diario (General Journal)</CardTitle>
          <p className="text-xs text-muted-foreground">Listado cronológico de asientos y movimientos contables.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="w-[10%] text-center pl-6">N° Asiento</TableHead>
                  <TableHead className="w-[15%]">Fecha</TableHead>
                  <TableHead className="w-[15%]">Tipo</TableHead>
                  <TableHead className="w-[45%]">Glosa / Concepto</TableHead>
                  <TableHead className="w-[15%] text-right pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asientos.map((asiento) => {
                  const isExpanded = expandedAsientoId === asiento.id;
                  const totalMonto = asiento.movimientos
                    .filter(m => m.debe > 0)
                    .reduce((sum, m) => sum + m.debe, 0);

                  return (
                    <React.Fragment key={asiento.id}>
                      <TableRow 
                        className="hover:bg-muted/5 transition-colors cursor-pointer"
                        onClick={() => setExpandedAsientoId(isExpanded ? null : asiento.id)}
                      >
                        <TableCell className="text-center font-mono font-bold pl-6 text-primary">
                          #{asiento.numero_asiento}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground">
                          {format(asiento.fecha.toDate(), 'dd MMM yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className="font-bold text-[9px] uppercase tracking-wider" variant="outline">
                            {asiento.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-foreground">
                          {asiento.glosa}
                          <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                            Monto total: {formatCLPCurrency(totalMonto)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-lg text-xs font-bold text-primary"
                          >
                            {isExpanded ? 'Ocultar' : 'Ver Detalle'}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={5} className="p-4 pl-12 pr-6">
                            <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Asiento contable #{asiento.numero_asiento}</span>
                                {asiento.referencia_id && (
                                  <span className="text-[10px] font-mono text-muted-foreground/60">ID ref: {asiento.referencia_id}</span>
                                )}
                              </div>
                              <div className="overflow-x-auto w-full">
                                <Table className="min-w-[550px]">
                                  <TableHeader>
                                    <TableRow className="bg-muted/20 border-b-2">
                                      <TableHead className="w-[15%] text-xs font-bold">Código</TableHead>
                                      <TableHead className="w-[45%] text-xs font-bold">Cuenta Contable</TableHead>
                                      <TableHead className="w-[20%] text-right text-xs font-bold text-emerald-500">Debe</TableHead>
                                      <TableHead className="w-[20%] text-right text-xs font-bold text-red-500">Haber</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {asiento.movimientos.map((mov, mIdx) => (
                                      <TableRow key={mIdx} className="hover:bg-transparent border-b border-border/5">
                                        <TableCell className="font-mono text-xs text-muted-foreground">{mov.cuenta_codigo}</TableCell>
                                        <TableCell className="font-bold text-xs">
                                          {mov.cuenta_nombre}
                                          {mov.haber > 0 && <span className="text-muted-foreground font-normal ml-3 italic">(al haber)</span>}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-xs text-emerald-500">
                                          {mov.debe > 0 ? formatCLPCurrency(mov.debe) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-xs text-red-500">
                                          {mov.haber > 0 ? formatCLPCurrency(mov.haber) : '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {/* Total sum row */}
                                    <TableRow className="bg-muted/30 border-t-2 font-black">
                                      <TableCell colSpan={2} className="text-right text-xs uppercase text-muted-foreground">Totales Asiento:</TableCell>
                                      <TableCell className="text-right text-xs text-emerald-600">{formatCLPCurrency(totalMonto)}</TableCell>
                                      <TableCell className="text-right text-xs text-red-600">{formatCLPCurrency(totalMonto)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

                {asientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No hay asientos contables registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';

'use client';

import React from 'react';
import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { calcularKPIsContables, calcPct } from '../utils/contabilidadUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { formatCLPCurrency, parseChileanMoneyInput } from '@/lib/utils';
import { 
  RefreshCw, Target, Plus, Calendar, Trash2, DollarSign, Send
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function GastosPanel() {
  const {
    asientos,
    fondosAsignados,
    distribucionOpen,
    setDistribucionOpen,
    distribucionMonto,
    setDistribucionMonto,
    distribucionOrigen,
    setDistribucionOrigen,
    distribucionDestinoTipo,
    setDistribucionDestinoTipo,
    distribucionDestinoId,
    setDistribucionDestinoId,
    distribucionDestinoNombre,
    setDistribucionDestinoNombre,
    ejecutandoDistribucion,
    tipoGastoRegistro,
    setTipoGastoRegistro,
    gastoGlosa,
    setGastoGlosa,
    gastoMonto,
    setGastoMonto,
    gastoMetodo,
    setGastoMetodo,
    progConcepto,
    setProgConcepto,
    progMonto,
    setProgMonto,
    progFecha,
    setProgFecha,
    metasFinancieras,
    metaAhorroNombre,
    setMetaAhorroNombre,
    metaAhorroMonto,
    setMetaAhorroMonto,
    metaAhorroFecha,
    setMetaAhorroFecha,
    gastosProgramados,
    handleGastoSubmit,
    handleProgramarGastoSubmit,
    handleMetaAhorroSubmit,
    handleDistribuirFondosSubmit,
    handlePagarGastoProgramado,
    handleEliminarGastoProgramado,
    handleEliminarMeta
  } = useContabilidadStore();

  const { toast } = useToast();
  const { user } = useAuth();
  
  const contabilidadKPIs = calcularKPIsContables(asientos);

  return (
    <div className="mt-0 outline-none space-y-6">
      
      {/* Resumen de Fondos y Distribución */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/50 bg-card p-5 space-y-2">
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Fondos en Caja (Efectivo)</h4>
          <div className="text-2xl font-black text-foreground">{formatCLPCurrency(contabilidadKPIs.caja)}</div>
          <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Asignado: {formatCLPCurrency(fondosAsignados.caja)}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Disponible: {formatCLPCurrency(Math.max(0, contabilidadKPIs.caja - fondosAsignados.caja))}</span>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card p-5 space-y-2">
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Fondos en Banco (Digital)</h4>
          <div className="text-2xl font-black text-foreground">{formatCLPCurrency(contabilidadKPIs.banco)}</div>
          <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Asignado: {formatCLPCurrency(fondosAsignados.banco)}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Disponible: {formatCLPCurrency(Math.max(0, contabilidadKPIs.banco - fondosAsignados.banco))}</span>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Presupuesto Asignado</h4>
            <div className="text-2xl font-black text-primary mt-2">
              {formatCLPCurrency(fondosAsignados.caja + fondosAsignados.banco)}
            </div>
          </div>
          <Button
            onClick={() => {
              setDistribucionOrigen('caja');
              setDistribucionDestinoTipo('gasto');
              setDistribucionDestinoId('');
              setDistribucionDestinoNombre('');
              setDistribucionMonto('');
              setDistribucionOpen(true);
            }}
            className="w-full rounded-xl text-xs font-bold h-9 mt-4 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Distribuir Fondos
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Formularios y Metas de Ahorro */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Formulario de Gastos */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex gap-2 bg-muted/50 p-1 rounded-xl w-full">
                <button
                  onClick={() => setTipoGastoRegistro('directo')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tipoGastoRegistro === 'directo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Gasto Directo
                </button>
                <button
                  onClick={() => setTipoGastoRegistro('programado')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tipoGastoRegistro === 'programado' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Programar Gasto
                </button>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              {tipoGastoRegistro === 'directo' ? (
                <form onSubmit={(e) => handleGastoSubmit(e, toast)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="gasto_glosa" className="text-[10px] font-black uppercase text-muted-foreground">Concepto / Glosa</Label>
                    <Input
                      id="gasto_glosa"
                      placeholder="Ej: Pago de luz eléctrica"
                      value={gastoGlosa}
                      onChange={(e) => setGastoGlosa(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="gasto_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto ($)</Label>
                      <Input
                        id="gasto_monto"
                        inputMode="numeric"
                        placeholder="Ej: $35.000"
                        value={gastoMonto}
                        onChange={(e) => setGastoMonto(e.target.value.replace(/[^\d.]/g, ''))}
                        onBlur={() => { const v = parseChileanMoneyInput(gastoMonto); setGastoMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                        className="h-9 text-xs rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="gasto_metodo" className="text-[10px] font-black uppercase text-muted-foreground">Medio de Pago</Label>
                      <Select
                        value={gastoMetodo}
                        onValueChange={(val: any) => setGastoMetodo(val)}
                      >
                        <SelectTrigger id="gasto_metodo" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                          <SelectValue placeholder="Selecciona medio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Caja (Efectivo)</SelectItem>
                          <SelectItem value="transferencia">Banco (Transf.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-9 rounded-xl text-xs font-bold mt-2">
                    Registrar Gasto Real
                  </Button>
                </form>
              ) : (
                <form onSubmit={(e) => handleProgramarGastoSubmit(e, toast)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="prog_concepto" className="text-[10px] font-black uppercase text-muted-foreground">Concepto a Programar</Label>
                    <Input
                      id="prog_concepto"
                      placeholder="Ej: Arriendo del local comercial"
                      value={progConcepto}
                      onChange={(e) => setProgConcepto(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="prog_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto estimado ($)</Label>
                      <Input
                        id="prog_monto"
                        inputMode="numeric"
                        placeholder="Ej: $250.000"
                        value={progMonto}
                        onChange={(e) => setProgMonto(e.target.value.replace(/[^\d.]/g, ''))}
                        onBlur={() => { const v = parseChileanMoneyInput(progMonto); setProgMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                        className="h-9 text-xs rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prog_fecha" className="text-[10px] font-black uppercase text-muted-foreground">Fecha Vencimiento</Label>
                      <Input
                        id="prog_fecha"
                        type="date"
                        value={progFecha}
                        onChange={(e) => setProgFecha(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" className="w-full h-9 rounded-xl text-xs font-bold mt-2">
                    Programar Gasto
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Metas Financieras (Ahorro) */}
          <Card className="border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-indigo-500" />
                Metas de Ahorro / Reinversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {metasFinancieras.map((meta) => {
                  const pct = calcPct(meta.monto_asignado, meta.monto_objetivo);
                  return (
                    <div key={meta.id} className="text-xs border border-border/40 p-3 rounded-xl space-y-1.5 bg-muted/5 relative group">
                      <div className="flex justify-between font-bold">
                        <span className="truncate pr-2">{meta.nombre}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatCLPCurrency(meta.monto_asignado)} / {formatCLPCurrency(meta.monto_objetivo)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground leading-none">
                        <span>Progreso: {pct}%</span>
                        <div className="flex items-center gap-1">
                          {meta.completada && (
                            <Badge className="h-3 text-[7px] bg-emerald-500 text-white font-bold leading-none py-0 px-1 rounded-sm">COMPLETADA</Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEliminarMeta(meta.id, toast)}
                            className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {metasFinancieras.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground py-4">No hay metas de ahorro registradas.</p>
                )}
              </div>

              <form onSubmit={(e) => handleMetaAhorroSubmit(e, toast)} className="border-t border-border/40 pt-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="meta_nombre" className="text-[10px] font-black uppercase text-muted-foreground">Nueva Meta de Ahorro</Label>
                  <Input
                    id="meta_nombre"
                    placeholder="Ej: Vitrina nueva o Camión de reparto"
                    value={metaAhorroNombre}
                    onChange={(e) => setMetaAhorroNombre(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      inputMode="numeric"
                      placeholder="Ej: $500.000"
                      value={metaAhorroMonto}
                      onChange={(e) => setMetaAhorroMonto(e.target.value.replace(/[^\d.]/g, ''))}
                      onBlur={() => { const v = parseChileanMoneyInput(metaAhorroMonto); setMetaAhorroMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                      className="h-8 text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="Fecha límite"
                      value={metaAhorroFecha}
                      onChange={(e) => setMetaAhorroFecha(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="w-full h-8 text-[11px] font-bold rounded-xl">
                  <Plus className="h-3 w-3 mr-1" />
                  Crear Meta de Ahorro
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Listado de Gastos Programados */}
        <div className="lg:col-span-8">
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Gastos Mensuales Estipulados (Vencimientos)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="pl-6 text-[10px] font-bold uppercase">Concepto</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right">Monto Estimado</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Vencimiento</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Estado / Asignación</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastosProgramados.map((gasto) => {
                      const dateObj = gasto.fecha_vencimiento.toDate();
                      const formattedDate = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
                      
                      const ahoraMillis = new Date().setHours(0, 0, 0, 0);
                      const vencMillis = dateObj.setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((vencMillis - ahoraMillis) / (1000 * 60 * 60 * 24));
                      
                      const pct = calcPct(gasto.monto_asignado, gasto.monto);

                      return (
                        <TableRow key={gasto.id} className="hover:bg-muted/5 transition-colors text-xs">
                          <TableCell className="font-bold pl-6">{gasto.concepto}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCLPCurrency(gasto.monto)}</TableCell>
                          <TableCell className="text-center font-medium">
                            <div>{formattedDate}</div>
                            {!gasto.pagado && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${diffDays < 0 ? 'text-red-500 bg-red-500/10 animate-pulse' : diffDays <= 3 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                                {diffDays < 0 ? `Atrasado x ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Vence hoy' : `Faltan ${diffDays}d`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            {gasto.pagado ? (
                              <div className="flex flex-col items-center">
                                <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase py-0.5">PAGADO</Badge>
                                <span className="text-[8px] text-muted-foreground mt-0.5 capitalize">con {gasto.metodo_pago}</span>
                              </div>
                            ) : (
                              <div className="space-y-1 w-28 mx-auto">
                                <div className="flex justify-between text-[9px] font-medium leading-none">
                                  <span>Asignado: {pct}%</span>
                                  <span>{formatCLPCurrency(gasto.monto_asignado)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {!gasto.pagado ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  onClick={() => {
                                    setDistribucionDestinoTipo('gasto');
                                    setDistribucionDestinoId(gasto.id);
                                    setDistribucionDestinoNombre(gasto.concepto);
                                    setDistribucionOrigen('caja');
                                    setDistribucionMonto(formatCLPCurrency(gasto.monto - gasto.monto_asignado));
                                    setDistribucionOpen(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold rounded-lg px-2"
                                >
                                  Asignar
                                </Button>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] font-bold rounded-lg px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Pagar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-xs">
                                    <DialogHeader>
                                      <DialogTitle className="text-sm font-bold uppercase">Confirmar Pago de Gasto</DialogTitle>
                                      <DialogDescription className="text-xs">
                                        ¿Cómo deseas registrar el pago contable para "{gasto.concepto}"?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                      <Button
                                        onClick={() => handlePagarGastoProgramado(gasto.id, 'efectivo', toast)}
                                        className="h-10 text-xs rounded-xl flex items-center justify-center gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20"
                                      >
                                        <DollarSign className="h-4 w-4" />
                                        Caja (Efectivo)
                                      </Button>
                                      <Button
                                        onClick={() => handlePagarGastoProgramado(gasto.id, 'transferencia', toast)}
                                        className="h-10 text-xs rounded-xl flex items-center justify-center gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20"
                                      >
                                        <Send className="h-4 w-4" />
                                        Banco (Transf.)
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Button
                                  onClick={() => handleEliminarGastoProgramado(gasto.id, toast)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic font-medium pr-2">Listo</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {gastosProgramados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                          No hay gastos programados o mensuales registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal de Distribución de Fondos */}
      <Dialog open={distribucionOpen} onOpenChange={setDistribucionOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Distribuir Fondos (Virtual)</DialogTitle>
            <DialogDescription className="text-xs">
              Asigna fondos de forma virtual desde Caja o Banco a un gasto programado o meta de ahorro para asegurar su cumplimiento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleDistribuirFondosSubmit(e, contabilidadKPIs, user, toast)} className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Origen del Dinero</Label>
              <Select
                value={distribucionOrigen}
                onValueChange={(val: any) => setDistribucionOrigen(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold bg-card border border-border">
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caja">Caja (Disponible sin asignar: {formatCLPCurrency(Math.max(0, contabilidadKPIs.caja - fondosAsignados.caja))})</SelectItem>
                  <SelectItem value="banco">Banco (Disponible sin asignar: {formatCLPCurrency(Math.max(0, contabilidadKPIs.banco - fondosAsignados.banco))})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Tipo de Destino</Label>
                <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl h-10 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDistribucionDestinoTipo('gasto');
                      setDistribucionDestinoId('');
                      setDistribucionDestinoNombre('');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all h-8 ${distribucionDestinoTipo === 'gasto' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Gastos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDistribucionDestinoTipo('meta_financiera');
                      setDistribucionDestinoId('');
                      setDistribucionDestinoNombre('');
                    }}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all h-8 ${distribucionDestinoTipo === 'meta_financiera' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Ahorros
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="dist_monto" className="text-[10px] font-black uppercase text-muted-foreground">Monto a Asignar</Label>
                <Input
                  id="dist_monto"
                  inputMode="numeric"
                  placeholder="Ej: $50.000"
                  value={distribucionMonto}
                  onChange={(e) => setDistribucionMonto(e.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={() => { const v = parseChileanMoneyInput(distribucionMonto); setDistribucionMonto(v > 0 ? formatCLPCurrency(v) : ''); }}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Seleccionar Destino</Label>
              <Select
                value={distribucionDestinoId}
                onValueChange={(val) => {
                  setDistribucionDestinoId(val);
                  if (distribucionDestinoTipo === 'gasto') {
                    const item = gastosProgramados.find(g => g.id === val);
                    if (item) setDistribucionDestinoNombre(item.concepto);
                  } else {
                    const item = metasFinancieras.find(m => m.id === val);
                    if (item) setDistribucionDestinoNombre(item.nombre);
                  }
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold bg-card border border-border">
                  <SelectValue placeholder="Selecciona una opción..." />
                </SelectTrigger>
                <SelectContent>
                  {distribucionDestinoTipo === 'gasto' ? (
                    gastosProgramados.filter(g => !g.pagado).map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.concepto} (Falta: {formatCLPCurrency(g.monto - g.monto_asignado)})
                      </SelectItem>
                    ))
                  ) : (
                    metasFinancieras.filter(m => !m.completada).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre} (Falta: {formatCLPCurrency(m.monto_objetivo - m.monto_asignado)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDistribucionOpen(false)}
                disabled={ejecutandoDistribucion}
                className="rounded-xl h-10 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={ejecutandoDistribucion}
                className="rounded-xl h-10 text-xs font-bold"
              >
                {ejecutandoDistribucion ? 'Asignando...' : 'Confirmar Asignación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

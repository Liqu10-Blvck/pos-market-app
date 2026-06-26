'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useContabilidadStore, RowProductoFactura } from '../hooks/useContabilidadStore';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCLPCurrency } from '@/lib/utils';
import { 
  PlusCircle, Tag, Plus, Trash2, ShoppingCart, Eye, 
  ChevronUp, ChevronDown, Camera, Calendar, User, Info, Loader2, AlertCircle, FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FacturaCompra } from '@/lib/types/contabilidad';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FacturasPanel() {
  const {
    facturas,
    productos,
    velocidadesVenta,
    facturaOpen,
    setFacturaOpen,
    tipoDocumento,
    setTipoDocumento,
    numFactura,
    setNumFactura,
    provRut,
    setProvRut,
    provNombre,
    setProvNombre,
    facturaFecha,
    setFacturaFecha,
    facturaMetodo,
    setFacturaMetodo,
    imagenFactura,
    setImagenFactura,
    facturaProductos,
    selProdId,
    setSelProdId,
    selProdQty,
    setSelProdQty,
    selProdCost,
    setSelProdCost,
    handleAddProductToFactura,
    handleRemoveProductFromFactura,
    handleFacturaSubmit,
    selectedFactura,
    setSelectedFactura,
    facturaDetalleOpen,
    setFacturaDetalleOpen,
    subiendoImagenDetalle,
    handleSubirImagenDetalle
  } = useContabilidadStore();

  const { toast } = useToast();
  const fileInputFacturaRef = useRef<HTMLInputElement>(null);
  const fileInputDetalleRef = useRef<HTMLInputElement>(null);

  // Accordion of grouped invoice days
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Group invoices by day
  const facturasAgrupadasPorDia = useMemo(() => {
    const grupos: { [key: string]: { fechaKey: string; fechaDisplay: Date; facturas: FacturaCompra[]; total: number } } = {};
    
    facturas.forEach(f => {
      const dateObj = f.fecha.toDate();
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!grupos[key]) {
        grupos[key] = {
          fechaKey: key,
          fechaDisplay: dateObj,
          facturas: [],
          total: 0
        };
      }
      grupos[key].facturas.push(f);
      grupos[key].total += f.total;
    });

    return Object.values(grupos).sort((a, b) => b.fechaDisplay.getTime() - a.fechaDisplay.getTime());
  }, [facturas]);

  // Autofill unit cost when product is selected in dropdown
  React.useEffect(() => {
    if (selProdId) {
      const p = productos.find(prod => prod.id === selProdId);
      if (p && p.costo_actual) {
        setSelProdCost(p.costo_actual.toString());
      } else {
        setSelProdCost('');
      }
    }
  }, [selProdId, productos, setSelProdCost]);

  // Calculate invoice sums
  const sumNetoFactura = useMemo(() => {
    return facturaProductos.reduce((sum, p) => sum + (p.cantidad * p.costo_unitario), 0);
  }, [facturaProductos]);

  const sumIvaFactura = useMemo(() => {
    if (tipoDocumento === 'factura') {
      return Math.round(sumNetoFactura * 0.19);
    }
    return 0;
  }, [sumNetoFactura, tipoDocumento]);

  const sumTotalFactura = useMemo(() => {
    if (tipoDocumento === 'factura') {
      return sumNetoFactura + sumIvaFactura;
    }
    return sumNetoFactura;
  }, [sumNetoFactura, sumIvaFactura, tipoDocumento]);

  // File trigger for Camera/Files
  const handleTriggerFacturaCamera = () => {
    fileInputFacturaRef.current?.click();
  };

  const handleFileFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setImagenFactura({
        file,
        url: URL.createObjectURL(file)
      });
    }
  };

  const handleRemoveFacturaImage = () => {
    setImagenFactura(null);
  };

  const handleAgregarImagenDetalle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleSubirImagenDetalle(files[0], toast);
    }
  };

  return (
    <div className="mt-0 outline-none space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Registro de Facturas Recibidas</h3>
        
        {/* Dialog modal for purchase invoice registration */}
        <Dialog open={facturaOpen} onOpenChange={setFacturaOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold flex items-center gap-1.5 h-10 px-4 bg-primary text-white hover:bg-primary/95">
              <PlusCircle className="h-4 w-4" />
              Registrar Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[700px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-black uppercase tracking-wide">Registrar Factura de Compra mayorista</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ingresa los datos de la factura. El sistema sumará stock automáticamente y generará el asiento contable de compra.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => handleFacturaSubmit(e, sumNetoFactura, sumIvaFactura, sumTotalFactura, toast)} className="space-y-6">
              {/* Document & Vendor Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="compra_tipo_doc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Comprobante</Label>
                  <Select
                    value={tipoDocumento}
                    onValueChange={(val: any) => setTipoDocumento(val)}
                  >
                    <SelectTrigger id="compra_tipo_doc" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleta">Boleta / Recibo Informal</SelectItem>
                      <SelectItem value="factura">Factura (Con IVA 19%)</SelectItem>
                      <SelectItem value="recibo">Recibo / Ticket</SelectItem>
                      <SelectItem value="guia">Guía de Despacho</SelectItem>
                      <SelectItem value="otro">Otro Documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="num_factura" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">N° Folio / Documento</Label>
                  <Input
                    id="num_factura"
                    placeholder="Ej: 99480"
                    value={numFactura}
                    onChange={(e) => setNumFactura(e.target.value)}
                    className="h-9 text-[16px] md:text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prov_rut" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RUT Proveedor</Label>
                  <Input
                    id="prov_rut"
                    placeholder="Ej: 76.120.340-K"
                    value={provRut}
                    onChange={(e) => setProvRut(e.target.value)}
                    className="h-9 text-[16px] md:text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="prov_nombre" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre Proveedor</Label>
                  <Input
                    id="prov_nombre"
                    placeholder="Ej: Distribuidora Alvi"
                    value={provNombre}
                    onChange={(e) => setProvNombre(e.target.value)}
                    className="h-9 text-[16px] md:text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fact_fecha" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Documento</Label>
                  <Input
                    id="fact_fecha"
                    type="date"
                    value={facturaFecha}
                    onChange={(e) => setFacturaFecha(e.target.value)}
                    className="h-9 text-[16px] md:text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="fact_metodo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medio de Pago</Label>
                  <Select
                    value={facturaMetodo}
                    onValueChange={(val: any) => setFacturaMetodo(val)}
                  >
                    <SelectTrigger id="fact_metodo" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                      <SelectValue placeholder="Selecciona medio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo (Caja)</SelectItem>
                      <SelectItem value="transferencia">Transferencia / Tarjeta (Banco)</SelectItem>
                      <SelectItem value="credito">Crédito (A pagar a Proveedores)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Foto Comprobante (Opcional)</Label>
                  {imagenFactura ? (
                    <div className="relative w-full h-9 rounded-xl overflow-hidden bg-black border border-border flex items-center justify-between px-3">
                      <span className="text-[10px] text-white truncate max-w-[70%] font-semibold">{imagenFactura.file?.name || 'Comprobante cargado'}</span>
                      <button
                        type="button"
                        onClick={handleRemoveFacturaImage}
                        className="text-red-500 hover:text-red-600 font-bold text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={handleTriggerFacturaCamera}
                      className="w-full h-9 border border-dashed border-border/80 rounded-xl flex items-center justify-center text-muted-foreground gap-1.5 bg-background cursor-pointer hover:bg-muted/5 transition-all px-3"
                    >
                      <Camera className="h-4 w-4 text-indigo-500" />
                      <span className="text-[10px] font-bold opacity-75">Tomar o cargar foto</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputFacturaRef}
                    onChange={handleFileFacturaChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Invoice Products Section */}
              <div className="rounded-2xl border p-4 bg-muted/10 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  Cargar Productos de la Factura
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="fact_add_prod" className="text-xs text-muted-foreground font-semibold">Producto</Label>
                    <Select
                      value={selProdId}
                      onValueChange={(val) => setSelProdId(val)}
                    >
                      <SelectTrigger id="fact_add_prod" className="w-full h-9 rounded-xl text-xs font-bold bg-card border border-border">
                        <SelectValue placeholder="-- Seleccionar --" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre} ({p.unidad})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fact_add_qty" className="text-xs text-muted-foreground font-semibold">Cantidad</Label>
                    <Input
                      id="fact_add_qty"
                      type="number"
                      step="any"
                      placeholder="Cant/Kgs"
                      value={selProdQty}
                      onChange={(e) => setSelProdQty(e.target.value)}
                      className="h-9 text-[16px] md:text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fact_add_cost" className="text-xs text-muted-foreground font-semibold">Costo Unit. Neto</Label>
                    <Input
                      id="fact_add_cost"
                      type="number"
                      placeholder="$ Neto"
                      value={selProdCost}
                      onChange={(e) => setSelProdCost(e.target.value)}
                      className="h-9 text-[16px] md:text-xs font-semibold"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleAddProductToFactura(toast)}
                  className="rounded-xl text-xs font-bold h-9 px-4 bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1 w-full justify-center border border-border/40"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Agregar Fila de Producto
                </Button>

                {/* Added products table */}
                {facturaProductos.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden mt-3">
                    <div className="overflow-x-auto w-full max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                      <Table className="min-w-[500px]">
                        <TableHeader>
                          <TableRow className="bg-muted/20 text-[10px]">
                            <TableHead className="py-2 pl-4">Producto</TableHead>
                            <TableHead className="py-2 text-center">Cantidad</TableHead>
                            <TableHead className="py-2 text-right">Costo Unit Neto</TableHead>
                            <TableHead className="py-2 text-right">Total Neto</TableHead>
                            <TableHead className="py-2 text-center pr-4">Eliminar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-[11px]">
                          {facturaProductos.map((item, index) => (
                            <TableRow key={index} className="border-b border-border/5">
                              <TableCell className="font-bold py-1.5 pl-4 whitespace-nowrap">{item.nombre}</TableCell>
                              <TableCell className="text-center py-1.5 font-bold">{item.cantidad}</TableCell>
                              <TableCell className="text-right py-1.5 font-mono">{formatCLPCurrency(item.costo_unitario)}</TableCell>
                              <TableCell className="text-right py-1.5 font-mono font-extrabold">{formatCLPCurrency(item.cantidad * item.costo_unitario)}</TableCell>
                              <TableCell className="text-center py-1.5 pr-4">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveProductFromFactura(item.producto_id)}
                                  className="h-6 w-6 text-red-500 hover:bg-red-500/10 rounded-md"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Summaries */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-muted/20 p-3 rounded-2xl border border-border/10 text-center text-xs">
                <div className="text-center">
                  <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Neto Factura</span>
                  <span className="font-black text-xs sm:text-sm block mt-1">{formatCLPCurrency(sumNetoFactura)}</span>
                </div>
                <div className="text-center border-x border-border/10">
                  <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">IVA (19% Neto)</span>
                  <span className="font-black text-xs sm:text-sm block mt-1">{formatCLPCurrency(sumIvaFactura)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Total Factura</span>
                  <span className="font-black text-xs sm:text-base text-primary block mt-1">{formatCLPCurrency(sumTotalFactura)}</span>
                </div>
              </div>

              {/* Submit Invoice Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFacturaOpen(false)}
                  className="rounded-xl text-xs font-bold h-11 px-5"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl text-xs font-bold h-11 px-6 bg-primary text-white hover:bg-primary/95"
                >
                  Confirmar y Registrar Factura
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {facturasAgrupadasPorDia.length === 0 ? (
        <Card className="border border-dashed border-2 py-12 flex flex-col items-center justify-center text-center bg-card">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <CardTitle className="text-base text-muted-foreground">No hay compras registradas</CardTitle>
          <p className="text-xs text-muted-foreground/70 max-w-sm mt-1">
            Registra una factura o boleta de compra para comenzar.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {facturasAgrupadasPorDia.map((dia) => {
            const isExpanded = !!expandedDays[dia.fechaKey];
            
            const itemsComprados = dia.facturas.flatMap(f => {
              const isFacturado = f.tipo_documento === 'factura';
              return (f.productos || []).map(p => ({
                ...p,
                factura: f,
                isFacturado
              }));
            });

            return (
              <Card key={dia.fechaKey} className="border border-border/50 overflow-hidden">
                <div 
                  onClick={() => {
                    setExpandedDays(prev => ({
                      ...prev,
                      [dia.fechaKey]: !prev[dia.fechaKey]
                    }));
                  }}
                  className="flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/20 cursor-pointer select-none transition-colors border-b border-border/10"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                      {format(dia.fechaDisplay, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      {dia.facturas.length} {dia.facturas.length === 1 ? 'comprobante' : 'comprobantes'} • {itemsComprados.length} {itemsComprados.length === 1 ? 'producto comprado' : 'productos comprados'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Total Comprado</span>
                      <span className="text-sm font-black text-primary block mt-0.5">
                        {formatCLPCurrency(dia.total)}
                      </span>
                    </div>
                    <div className="p-1 rounded-lg bg-muted/60 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[950px]">
                      <TableHeader>
                        <TableRow className="bg-muted/5 text-[10px]">
                          <TableHead className="pl-6 py-2">Producto</TableHead>
                          <TableHead className="py-2">Documento / Folio</TableHead>
                          <TableHead className="py-2">Proveedor</TableHead>
                          <TableHead className="text-center py-2">Cant.</TableHead>
                          <TableHead className="text-right py-2">Costo Unit.</TableHead>
                          <TableHead className="text-right py-2">Total</TableHead>
                          <TableHead className="text-center py-2">Estado</TableHead>
                          <TableHead className="text-right pr-6 py-2">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {itemsComprados.map((item, index) => (
                          <TableRow key={`${item.factura.id}-${index}`} className="hover:bg-muted/5 transition-colors border-b last:border-0 border-border/30">
                            <TableCell className="font-bold pl-6 py-3">
                              {item.nombre}
                            </TableCell>
                            <TableCell className="py-3 font-semibold">
                              <span className="block text-[9px] uppercase tracking-wider opacity-60 font-sans">{item.factura.tipo_documento || 'factura'}</span>
                              N° {item.factura.numero_documento || item.factura.numero_factura}
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="font-bold block">{item.factura.proveedor_nombre}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">RUT: {item.factura.proveedor_rut}</span>
                            </TableCell>
                            <TableCell className="text-center font-bold py-3">
                              {item.cantidad}
                            </TableCell>
                            <TableCell className="text-right font-medium font-mono py-3">
                              {formatCLPCurrency(item.costo_unitario)}
                            </TableCell>
                            <TableCell className="text-right font-black font-mono py-3">
                              {formatCLPCurrency(item.cantidad * item.costo_unitario)}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {item.isFacturado ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider">
                                  Facturado
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-bold text-[9px] uppercase tracking-wider animate-pulse">
                                  No Facturado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFactura(item.factura);
                                  setFacturaDetalleOpen(true);
                                }}
                                className="h-8 rounded-lg text-xs font-bold text-primary flex items-center gap-1 ml-auto"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Doc. Origen
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* DETALLE DE FACTURA / COMPRA DIALOG */}
      <Dialog open={facturaDetalleOpen} onOpenChange={setFacturaDetalleOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[800px] p-0 bg-white dark:bg-card border border-border/85 text-foreground rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {selectedFactura && (
            <>
              <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/40 bg-muted/20 dark:bg-muted/10 text-left">
                <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  Detalle del Comprobante: N° {selectedFactura.numero_documento || selectedFactura.numero_factura}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  Tipo: <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40 font-bold uppercase text-[10px] tracking-wide">{selectedFactura.tipo_documento || 'Factura'}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 opacity-60" />
                    {format(selectedFactura.fecha.toDate(), 'dd/MM/yyyy')}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">Proveedor</span>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs text-foreground font-extrabold truncate">{selectedFactura.proveedor_nombre}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">RUT Proveedor</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs text-foreground font-semibold truncate">{selectedFactura.proveedor_rut || 'S/R'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">Método de Pago</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                        selectedFactura.metodo_pago === 'efectivo'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : selectedFactura.metodo_pago === 'transferencia'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      }`}>
                        {selectedFactura.metodo_pago}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 dark:bg-card border border-border/60 rounded-2xl flex flex-col justify-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-0.5">Total Compra</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs sm:text-sm md:text-base">
                      {formatCLPCurrency(selectedFactura.total)}
                    </span>
                  </div>
                </div>

                {selectedFactura.imagen_factura_url ? (
                  <div className="space-y-2">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Foto del Comprobante Adjunto</span>
                    <div className="relative w-full h-36 sm:h-48 md:h-56 rounded-2xl overflow-hidden bg-muted/20 border border-border flex items-center justify-center group transition-all duration-300 hover:border-primary/20 shadow-lg">
                      <img src={selectedFactura.imagen_factura_url} alt="Comprobante de compra" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                        <span className="text-[10px] text-white/80 font-bold bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md hidden sm:inline-block">Vista Previa del Documento</span>
                        <a
                          href={selectedFactura.imagen_factura_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-lg transition-transform duration-200 hover:scale-105 flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Pantalla Completa
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 hover:bg-muted/20 transition-all">
                    <Camera className="h-8 w-8 text-indigo-500/80" />
                    <div className="flex flex-col gap-1 items-center">
                      <span className="font-bold text-foreground">Sin imagen o archivo de comprobante adjunto</span>
                      <p className="text-[10px] opacity-75">Sube una foto de la boleta o factura para respaldar esta compra.</p>
                    </div>
                    
                    <Button 
                      type="button"
                      disabled={subiendoImagenDetalle}
                      onClick={() => fileInputDetalleRef.current?.click()}
                      className="mt-2 rounded-xl text-[10px] font-bold h-8 px-4 bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5"
                    >
                      {subiendoImagenDetalle ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Adjuntar Comprobante
                        </>
                      )}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputDetalleRef}
                      onChange={handleAgregarImagenDetalle}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Detalle de Artículos y Rendimiento de Stock</span>
                  
                  <div className="rounded-2xl border border-border overflow-hidden bg-card">
                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                      <Table className="min-w-[650px]">
                        <TableHeader>
                          <TableRow className="border-b border-border bg-muted/20 dark:bg-muted/10">
                            <TableHead className="py-3 pl-4 text-muted-foreground font-black uppercase text-[9px] tracking-wider">Producto</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Cantidad Compra</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Costo Unit</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Stock Actual</TableHead>
                            <TableHead className="py-3 text-right text-muted-foreground font-black uppercase text-[9px] tracking-wider">Ventas Diarias (Promedio)</TableHead>
                            <TableHead className="py-3 text-right pr-4 text-muted-foreground font-black uppercase text-[9px] tracking-wider">Duración Estimada</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedFactura.productos && selectedFactura.productos.map((item, idx) => {
                            const catalogProd = productos.find(p => p.id === item.producto_id);
                            const stockActual = catalogProd ? catalogProd.stock_actual : 0;
                            const velVenta = velocidadesVenta[item.producto_id] || 0;
                            const unidad = catalogProd ? catalogProd.unidad : 'unidades';
                            
                            const cantCaja = item.cantidad_por_caja || catalogProd?.cantidad_por_caja;
                            const empaqueLabel = catalogProd?.tipo_empaque || 'Caja';

                            let diasStock = 'Sin ventas';
                            let badgeStyle = 'bg-muted text-muted-foreground border-border/50';
                            let esCritico = false;
                            
                            if (velVenta > 0) {
                              const dias = stockActual / velVenta;
                              diasStock = `${Math.round(dias)} días`;
                              if (dias < 7) {
                                esCritico = true;
                                badgeStyle = 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400 dark:border-red-500/20 animate-pulse';
                              } else if (dias < 15) {
                                badgeStyle = 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
                              } else {
                                badgeStyle = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400';
                              }
                            }

                            return (
                              <TableRow key={idx} className="border-b border-border/50 hover:bg-muted/10 text-xs text-foreground">
                                <TableCell className="font-extrabold py-3.5 pl-4 whitespace-nowrap">{item.nombre}</TableCell>
                                <TableCell className="text-right py-3.5 font-bold">
                                  <div className="flex flex-col items-end">
                                    <span>{unidad === 'kg' ? item.cantidad : Math.round(item.cantidad)} {unidad}</span>
                                    {cantCaja && cantCaja > 1 && (
                                      <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                        {((item.cantidad / cantCaja) % 1 === 0 ? (item.cantidad / cantCaja) : (item.cantidad / cantCaja).toFixed(1))} {empaqueLabel}(s) de {unidad === 'kg' ? (cantCaja % 1 === 0 ? cantCaja : cantCaja.toFixed(2)) : Math.round(cantCaja)} {unidad}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-3.5 font-mono">{formatCLPCurrency(item.costo_unitario)}</TableCell>
                                <TableCell className="text-right py-3.5 font-mono font-bold">{unidad === 'kg' ? stockActual.toFixed(2) : Math.round(stockActual)}</TableCell>
                                <TableCell className="text-right py-3.5 text-muted-foreground">{velVenta > 0 ? `${unidad === 'kg' ? velVenta.toFixed(2) : Math.round(velVenta)}/día` : '-'}</TableCell>
                                <TableCell className="text-right py-3.5 pr-4">
                                  <div className="flex justify-end">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide border ${badgeStyle}`}>
                                      {esCritico && <AlertCircle className="h-3 w-3" />}
                                      {diasStock}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(!selectedFactura.productos || selectedFactura.productos.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs font-semibold">
                                No se encontraron productos registrados en este comprobante.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex justify-end shrink-0 bg-muted/20 dark:bg-muted/10">
                <Button
                  onClick={() => setFacturaDetalleOpen(false)}
                  className="rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs px-4 h-9 border border-border/50 transition-all duration-200"
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

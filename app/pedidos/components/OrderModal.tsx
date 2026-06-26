'use client';

import React, { useState } from 'react';
import { usePedidosStore } from '../hooks/usePedidosStore';
import { useAppStore } from '@/lib/store/useAppStore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCLPCurrency } from '@/lib/utils';
import { Search, ChevronDown, Trash2, ShoppingBag, MapPin, Clipboard, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function OrderModal() {
  const { toast } = useToast();

  // Local state for product search and dropdown open state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [prodSearch, setProdSearch] = useState('');

  // Local state for client search and dropdown open state
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Global Stores
  const productos = useAppStore((state) => state.productos);
  const clientes = useAppStore((state) => state.clientes);

  // Local Pedidos Store
  const createModalOpen = usePedidosStore((state) => state.createModalOpen);
  const setCreateModalOpen = usePedidosStore((state) => state.setCreateModalOpen);
  const clienteId = usePedidosStore((state) => state.clienteId);
  const setClienteId = usePedidosStore((state) => state.setClienteId);
  const clienteNombre = usePedidosStore((state) => state.clienteNombre);
  const setClienteNombre = usePedidosStore((state) => state.setClienteNombre);
  const direccionEntrega = usePedidosStore((state) => state.direccionEntrega);
  const setDireccionEntrega = usePedidosStore((state) => state.setDireccionEntrega);
  const notas = usePedidosStore((state) => state.notas);
  const setNotas = usePedidosStore((state) => state.setNotas);

  const formItems = usePedidosStore((state) => state.formItems);
  const toggleProductInPedido = usePedidosStore((state) => state.toggleProductInPedido);
  const removeItemFromPedido = usePedidosStore((state) => state.removeItemFromPedido);
  const updateItemQty = usePedidosStore((state) => state.updateItemQty);
  const updateItemFormat = usePedidosStore((state) => state.updateItemFormat);
  const updateItemPrice = usePedidosStore((state) => state.updateItemPrice);
  const handleCrearPedido = usePedidosStore((state) => state.handleCrearPedido);
  const guardandoPedido = usePedidosStore((state) => state.guardandoPedido);
  const resetForm = usePedidosStore((state) => state.resetForm);

  const activeCatalog = productos.filter((p) => p.activo !== false && p.es_interes !== true);

  // Filter products for suggestions based on text search
  const filteredProducts = prodSearch.trim() === ''
    ? activeCatalog
    : activeCatalog.filter(p => p.nombre.toLowerCase().includes(prodSearch.toLowerCase()));

  // Filter clients based on search
  const filteredClientes = clientSearchQuery.trim() === ''
    ? clientes.filter(c => c.activo !== false)
    : clientes.filter(c =>
      c.activo !== false &&
      (c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        (c.telefono || '').includes(clientSearchQuery))
    );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleCrearPedido(toast);
    if (success) {
      setProdSearch('');
      setClientSearchQuery('');
    }
  };

  // Calculate order total
  const orderTotal = formItems.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

  // Check if any item in the order exceeds available stock
  const hasStockExceededError = formItems.some((item) => {
    const prod = productos.find((p) => p.id === item.producto_id);
    if (!prod) return false;
    const stockRequerido = item.es_caja && prod.cantidad_por_caja ? (item.cantidad * prod.cantidad_por_caja) : item.cantidad;
    return stockRequerido > prod.stock_actual;
  });

  return (
    <Dialog open={createModalOpen} onOpenChange={(open) => { setCreateModalOpen(open); if (!open) resetForm(); }}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[780px] p-4 sm:p-6 bg-white dark:bg-card border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            Crear Nuevo Pedido
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ingresa los datos para registrar un encargo o pedido de preventa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Cliente & Datos de Envío */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Custom Client Selector popover */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-9 border border-border bg-card text-foreground px-3 rounded-xl text-xs font-bold hover:bg-muted/40 transition-all text-left shadow-sm"
                  >
                    <span className="truncate">{clienteNombre || 'Cliente General (Sin Cuenta)'}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] sm:w-[320px] p-0 bg-white dark:bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden" align="start">
                  <div className="flex items-center border-b border-border/40 px-3 py-2 bg-muted/10">
                    <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50 text-indigo-500" />
                    <input
                      placeholder="Buscar cliente por nombre/telefono..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="flex h-8 w-full bg-transparent text-xs outline-none font-bold text-foreground placeholder:text-muted-foreground/60"
                    />
                    {clientSearchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setClientSearchQuery('')}
                        className="h-6 px-1.5 rounded-lg text-[9px] font-black uppercase text-muted-foreground hover:text-foreground"
                      >
                        Borrar
                      </Button>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setClienteId('');
                        setClienteNombre('Cliente General');
                        setClientPopoverOpen(false);
                        setClientSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors hover:bg-muted flex items-center justify-between ${clienteId === '' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                    >
                      <span>Cliente General (Sin Cuenta)</span>
                      {clienteId === '' && <Check className="h-4 w-4 shrink-0 text-indigo-500" />}
                    </button>
                    {filteredClientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClienteId(c.id);
                          setClienteNombre(c.nombre);
                          setClientPopoverOpen(false);
                          setClientSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors hover:bg-muted flex items-center justify-between ${clienteId === c.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''
                          }`}
                      >
                        <div className="flex flex-col">
                          <span>{c.nombre}</span>
                          {c.telefono && <span className="text-[10px] text-muted-foreground font-semibold">Tel: {c.telefono}</span>}
                        </div>
                        {clienteId === c.id && <Check className="h-4 w-4 shrink-0 text-indigo-500" />}
                      </button>
                    ))}
                    {filteredClientes.length === 0 && (
                      <div className="py-4 text-center text-xs font-semibold text-muted-foreground">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5 text-emerald-500" />
                Dirección de Entrega (Opcional)
              </Label>
              <Input
                placeholder="Ej: Av. Principal 123, Depto 4"
                value={direccionEntrega}
                onChange={(e) => setDireccionEntrega(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clipboard className="size-3.5 text-indigo-500" />
              Notas / Instrucciones Especiales
            </Label>
            <Input
              placeholder="Ej: Entregar después de las 18:00 hrs. Dejar en conserjería."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Selector de Productos */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Seleccionar Productos del Pedido
            </Label>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-11 border border-border bg-card text-foreground px-4 rounded-xl text-xs font-bold hover:bg-muted/40 transition-all shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-indigo-500" />
                    {formItems.length === 0
                      ? "Buscar y añadir productos..."
                      : `${formItems.length} producto(s) seleccionado(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(95vw-24px)] sm:w-[720px] p-0 bg-white dark:bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden" align="start">
                {/* Search box inside popover */}
                <div className="flex items-center border-b border-border/40 px-3 py-2 bg-muted/10">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-indigo-500" />
                  <input
                    placeholder="Escribe para buscar productos..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="flex h-9 w-full bg-transparent py-3 text-xs outline-none font-bold text-foreground placeholder:text-muted-foreground/60"
                  />
                  {prodSearch && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setProdSearch('')}
                      className="h-7 px-2 rounded-lg text-[10px] font-black uppercase text-muted-foreground hover:text-foreground"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>

                {/* Product List */}
                <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                  {filteredProducts.length === 0 ? (
                    <div className="py-6 text-center text-xs font-bold text-muted-foreground">
                      No se encontraron productos
                    </div>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isSelected = formItems.some(item => item.producto_id === prod.id);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => toggleProductInPedido(prod)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${isSelected
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'hover:bg-muted border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProductInPedido(prod)}
                              className="pointer-events-none"
                            />
                            <div className="space-y-0.5">
                              <span className="text-foreground">{prod.nombre}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground block">
                                Stock: {prod.stock_actual} {prod.unidad}
                                {prod.cantidad_por_caja && prod.cantidad_por_caja > 0 ? (() => {
                                  const ratio = prod.stock_actual / prod.cantidad_por_caja;
                                  const formattedRatio = ratio % 1 === 0 ? ratio.toFixed(0) : ratio.toFixed(1);
                                  const empaqueLabel = prod.tipo_empaque || 'Caja';
                                  return ` (~${formattedRatio} ${empaqueLabel}s) | Empaque: ${empaqueLabel} (${prod.cantidad_por_caja} ${prod.unidad})`;
                                })() : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="text-foreground block">{formatCLPCurrency(prod.precio)} / {prod.unidad}</span>
                            {prod.precio_caja && (
                              <span className="text-[10px] font-semibold text-muted-foreground block">
                                Caja: {formatCLPCurrency(prod.precio_caja)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tabla de Items Agregados */}
          {formItems.length > 0 && (
            <div className="border border-border/40 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="text-xs font-bold pl-4">Producto</TableHead>
                    <TableHead className="text-xs font-bold text-center w-36">Formato</TableHead>
                    <TableHead className="text-xs font-bold text-center w-24">Cant.</TableHead>
                    <TableHead className="text-xs font-bold text-right w-28">Precio Unit.</TableHead>
                    <TableHead className="text-xs font-bold text-right w-24">Subtotal</TableHead>
                    <TableHead className="text-xs font-bold text-right pr-4 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formItems.map((item) => {
                    const originalProduct = productos.find(p => p.id === item.producto_id);
                    if (!originalProduct) return null;

                    const stockRequerido = item.es_caja && originalProduct.cantidad_por_caja
                      ? (item.cantidad * originalProduct.cantidad_por_caja)
                      : item.cantidad;
                    const stockExceeded = stockRequerido > originalProduct.stock_actual;

                    return (
                      <TableRow key={item.producto_id} className="text-xs hover:bg-muted/5">
                        <TableCell className="font-bold pl-4">
                          <span className="block">{item.nombre}</span>
                          <span className="text-[9px] font-semibold text-muted-foreground block">
                            Disp: {originalProduct.stock_actual} {originalProduct.unidad}
                          </span>
                        </TableCell>

                        {/* Format Select Custom Popover Dropdown */}
                        <TableCell className="text-center">
                          {originalProduct.cantidad_por_caja ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between h-8 border border-border bg-card text-foreground px-2 rounded-lg text-[10px] font-bold hover:bg-muted/40 transition-all text-left shadow-sm"
                                >
                                  <span className="truncate">
                                    {item.es_caja
                                      ? `${originalProduct.tipo_empaque || 'Caja'} (${originalProduct.cantidad_por_caja} ${originalProduct.unidad})`
                                      : (originalProduct.unidad === 'kg' ? 'Kilo (kg)' : 'Unidad (un)')}
                                  </span>
                                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0 ml-1.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1 bg-white dark:bg-card border border-border/50 rounded-xl shadow-xl space-y-0.5" align="center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateItemFormat(item.producto_id, false, originalProduct.precio, originalProduct.unidad);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors hover:bg-muted flex items-center justify-between ${!item.es_caja ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''
                                    }`}
                                >
                                  <span>{originalProduct.unidad === 'kg' ? 'Kilo (kg)' : 'Unidad (un)'}</span>
                                  {!item.es_caja && <Check className="h-3 w-3 shrink-0 text-indigo-500" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const boxPrice = originalProduct.precio_caja || (originalProduct.precio * originalProduct.cantidad_por_caja!);
                                    updateItemFormat(item.producto_id, true, boxPrice, 'unid');
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors hover:bg-muted flex items-center justify-between ${item.es_caja ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''
                                    }`}
                                >
                                  <span>{originalProduct.tipo_empaque || 'Caja'} ({originalProduct.cantidad_por_caja} {originalProduct.unidad})</span>
                                  {item.es_caja && <Check className="h-3 w-3 shrink-0 text-indigo-500" />}
                                </button>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground block py-1 bg-muted/40 rounded-lg text-center border border-border/20">
                              {originalProduct.unidad === 'kg' ? 'Kilo (kg)' : 'Unidad (un)'}
                            </span>
                          )}
                        </TableCell>

                        {/* Quantity input */}
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            step="any"
                            value={item.cantidad || ''}
                            onChange={(e) => updateItemQty(item.producto_id, parseFloat(e.target.value) || 0)}
                            className={`h-8 text-xs text-center font-mono font-bold rounded-lg w-20 mx-auto ${stockExceeded
                                ? 'border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400'
                                : 'border-border/80'
                              }`}
                          />
                        </TableCell>

                        {/* Unit price input */}
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.precio_unitario || ''}
                            onChange={(e) => updateItemPrice(item.producto_id, Math.round(parseFloat(e.target.value)) || 0)}
                            className="h-8 text-xs text-right font-mono font-bold rounded-lg border-border/80 w-24 ml-auto"
                          />
                        </TableCell>

                        {/* Subtotal */}
                        <TableCell className="text-right font-mono font-black text-foreground">
                          {formatCLPCurrency(Math.round(item.cantidad * item.precio_unitario))}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemFromPedido(item.producto_id)}
                            className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Detalle del Total */}
          <div className="flex justify-between items-center bg-muted/10 px-4 py-3 rounded-2xl border border-border/30">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Total del Pedido</span>
            <span className="text-lg font-black text-primary">{formatCLPCurrency(orderTotal)}</span>
          </div>

          {/* Form Actions */}
          <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between gap-4">
            <div>
              {hasStockExceededError && (
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Revisa los productos con stock excedido.
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardandoPedido || formItems.length === 0 || hasStockExceededError}
                className="rounded-xl text-xs font-bold h-10 px-5 bg-primary text-white hover:bg-primary/90"
              >
                {guardandoPedido ? 'Creando...' : 'Crear Pedido'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

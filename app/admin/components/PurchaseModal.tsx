import React, { useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { useToast } from '../../../hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useAdminStore } from '../hooks/useAdminStore';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput, compressImage } from '../../../lib/utils';
import { 
  ShoppingBag, 
  Percent, 
  Package, 
  Coins, 
  Receipt, 
  Camera, 
  Trash2, 
  Loader2 
} from 'lucide-react';

export const PurchaseModal: React.FC = () => {
  const { toast } = useToast();
  const fileInputCompraRef = useRef<HTMLInputElement>(null);

  const modalCompraOpen = useAdminStore((state) => state.modalCompraOpen);
  const setModalCompraOpen = useAdminStore((state) => state.setModalCompraOpen);
  const productoCompra = useAdminStore((state) => state.productoCompra);
  const guardando = useAdminStore((state) => state.guardando);
  const compraData = useAdminStore((state) => state.compraData);
  const setCompraData = useAdminStore((state) => state.setCompraData);
  const compraImagen = useAdminStore((state) => state.compraImagen);
  const setCompraImage = useAdminStore((state) => state.setCompraImage);
  const removeCompraImage = useAdminStore((state) => state.removeCompraImage);

  // Store actions
  const handleCompraCajaChange = useAdminStore((state) => state.handleCompraCajaChange);
  const handleGuardarCompra = useAdminStore((state) => state.handleGuardarCompra);

  const handleTriggerCompraCamera = () => {
    fileInputCompraRef.current?.click();
  };

  const handleFileCompraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawUrl = reader.result as string;
      try {
        const compressedUrl = await compressImage(rawUrl, 1024, 0.75);
        setCompraImage(file, compressedUrl);
      } catch (err) {
        console.warn('Error al comprimir imagen de compra, usando original:', err);
        setCompraImage(file, rawUrl);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputCompraRef.current) {
      fileInputCompraRef.current.value = '';
    }
  };

  if (!productoCompra) return null;

  const empaqueLabel = productoCompra.tipo_empaque || 'Caja';
  const cantCaja = parseFloat(compraData.cantidad_por_caja) || 0;
  const cajasCompradas = parseFloat(compraData.cajas_compradas) || 0;
  const costCaja = parseFloat(compraData.costo_caja) || 0;

  return (
    <Dialog open={modalCompraOpen} onOpenChange={(open) => !guardando && setModalCompraOpen(open)}>
      <DialogContent className="max-h-[95vh] overflow-y-auto w-[96vw] max-w-xl rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            Comprar / Abastecer Inventario
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registra el stock recibido y actualiza el costo y precios del producto en el catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-xl bg-muted/30 p-3.5 border border-border/40 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-foreground">{productoCompra.nombre}</h4>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                Unidad: {productoCompra.unidad === 'kg' ? 'Kilo' : 'Unidad'}
              </p>
            </div>
            <Badge variant="secondary" className="font-bold text-xs h-7 px-2.5">
              Stock actual: {productoCompra.unidad === 'kg' ? productoCompra.stock_actual.toFixed(2) : Math.round(productoCompra.stock_actual)}
            </Badge>
          </div>

          {/* Box info & Purchase quantity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cantidad_por_caja" className="text-xs font-bold text-foreground">Cant. por {empaqueLabel} ({productoCompra.unidad})</Label>
              <Input
                id="cantidad_por_caja"
                type="number"
                value={compraData.cantidad_por_caja}
                onChange={(e) => handleCompraCajaChange('cantidad_por_caja', e.target.value)}
                className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cajas_compradas" className="text-xs font-bold text-foreground">{empaqueLabel}s Recibidos</Label>
              <Input
                id="cajas_compradas"
                type="number"
                min="1"
                placeholder="Ej: 5"
                value={compraData.cajas_compradas}
                onChange={(e) => handleCompraCajaChange('cajas_compradas', e.target.value)}
                className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo_caja" className="text-xs font-bold text-foreground">Costo por {empaqueLabel} ($)</Label>
              <Input
                id="costo_caja"
                type="number"
                min="0"
                placeholder="Ej: 10000"
                value={compraData.costo_caja}
                onChange={(e) => handleCompraCajaChange('costo_caja', e.target.value)}
                className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70 bg-background"
              />
            </div>
          </div>

          {/* Suggested unit calculations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-3.5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/15">
            <div className="space-y-1.5">
              <Label htmlFor="compra_margen" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                Margen Unidad (%)
              </Label>
              <div className="relative">
                <Input
                  id="compra_margen"
                  type="number"
                  value={compraData.margen_deseado}
                  onChange={(e) => handleCompraCajaChange('margen_deseado', e.target.value)}
                  className="pr-7 h-10 rounded-xl text-[16px] md:text-xs font-bold text-center border-indigo-500/20 bg-background"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precio_venta_unidad" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Precio Venta por {productoCompra.unidad === 'kg' ? 'Kilo' : 'Unidad'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="precio_venta_unidad"
                  value={compraData.precio_venta_unidad}
                  onChange={(e) => setCompraData({ precio_venta_unidad: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setCompraData({ precio_venta_unidad: compraData.precio_venta_unidad ? formatCLPCurrency(parseChileanMoneyInput(compraData.precio_venta_unidad)) : '' })}
                  onFocus={() => setCompraData({ precio_venta_unidad: normalizeMoneyInput(compraData.precio_venta_unidad) })}
                  className="pl-6 h-10 rounded-xl text-[16px] md:text-xs font-bold border-indigo-500/20 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Box pricing calculations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-3.5 bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl border border-purple-500/15">
            <div className="space-y-1.5">
              <Label htmlFor="compra_margen_caja" className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                Margen {empaqueLabel} (%) (Opcional)
              </Label>
              <div className="relative">
                <Input
                  id="compra_margen_caja"
                  type="number"
                  value={compraData.margen_caja}
                  onChange={(e) => handleCompraCajaChange('margen_caja', e.target.value)}
                  className="pr-7 h-10 rounded-xl text-[16px] md:text-xs font-bold text-center border-purple-500/20 bg-background"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precio_venta_caja" className="text-xs font-bold text-purple-600 dark:text-purple-400">
                Precio Venta por {empaqueLabel}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="precio_venta_caja"
                  value={compraData.precio_venta_caja}
                  onChange={(e) => setCompraData({ precio_venta_caja: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setCompraData({ precio_venta_caja: compraData.precio_venta_caja ? formatCLPCurrency(parseChileanMoneyInput(compraData.precio_venta_caja)) : '' })}
                  onFocus={() => setCompraData({ precio_venta_caja: normalizeMoneyInput(compraData.precio_venta_caja) })}
                  className="pl-6 h-10 rounded-xl text-[16px] md:text-xs font-bold border-purple-500/20 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Equivalency note */}
          {cajasCompradas > 0 && cantCaja > 0 && costCaja > 0 && (
            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  Stock ingresado:
                </span>
                <span>{productoCompra.unidad === 'kg' ? (cajasCompradas * cantCaja).toFixed(2) : Math.round(cajasCompradas * cantCaja)} {productoCompra.unidad}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  Costo por {productoCompra.unidad === 'kg' ? 'kg' : 'unidad'}:
                </span>
                <span>{formatCLPCurrency(Math.round(costCaja / cantCaja))}/{productoCompra.unidad}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-indigo-500/15">
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Total compra ({cajasCompradas} {productoCompra.tipo_empaque || 'caja'}s):
                </span>
                <span>{formatCLPCurrency(Math.round(cajasCompradas * costCaja))}</span>
              </div>
            </div>
          )}

          {/* Document details & Receipt Image Upload */}
          <div className="p-3.5 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 space-y-3">
            <h5 className="text-xs font-black text-foreground uppercase tracking-wider">Detalles del Documento de Compra</h5>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="compra_tipo_doc" className="text-xs font-bold text-foreground">Tipo de Comprobante</Label>
                <Select
                  value={compraData.tipo_documento}
                  onValueChange={(val: any) => setCompraData({ tipo_documento: val })}
                >
                  <SelectTrigger id="compra_tipo_doc" className="h-11 w-full rounded-xl border border-input bg-background text-sm border-border/70 font-semibold">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleta">Boleta / Recibo Informal</SelectItem>
                    <SelectItem value="factura">Factura (Con IVA Crédito 19%)</SelectItem>
                    <SelectItem value="recibo">Recibo / Ticket</SelectItem>
                    <SelectItem value="guia">Guía de Despacho</SelectItem>
                    <SelectItem value="otro">Otro Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="compra_num_doc" className="text-xs font-bold text-foreground">Número de Folio / Documento</Label>
                <Input
                  id="compra_num_doc"
                  placeholder="Ej: 4829"
                  value={compraData.numero_documento}
                  onChange={(e) => setCompraData({ numero_documento: e.target.value })}
                  className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="compra_proveedor_nombre" className="text-xs font-bold text-foreground">Nombre Proveedor</Label>
                <Input
                  id="compra_proveedor_nombre"
                  placeholder="Ej: Mayorista Alvi"
                  value={compraData.proveedor_nombre}
                  onChange={(e) => setCompraData({ proveedor_nombre: e.target.value })}
                  className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="compra_proveedor_rut" className="text-xs font-bold text-foreground">RUT Proveedor</Label>
                <Input
                  id="compra_proveedor_rut"
                  placeholder="Ej: 76.123.456-7"
                  value={compraData.proveedor_rut}
                  onChange={(e) => setCompraData({ proveedor_rut: e.target.value })}
                  className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="compra_fecha" className="text-xs font-bold text-foreground">Fecha Emisión</Label>
                <Input
                  id="compra_fecha"
                  type="date"
                  value={compraData.fecha}
                  onChange={(e) => setCompraData({ fecha: e.target.value })}
                  className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/70"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="compra_metodo_pago" className="text-xs font-bold text-foreground">Método de Pago</Label>
                <Select
                  value={compraData.metodo_pago}
                  onValueChange={(val: any) => setCompraData({ metodo_pago: val })}
                >
                  <SelectTrigger id="compra_metodo_pago" className="h-11 w-full rounded-xl border border-input bg-background text-sm border-border/70 font-semibold">
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia / Tarjeta</SelectItem>
                    <SelectItem value="credito">Fiado / Crédito Proveedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Document image upload */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-foreground">Foto del Comprobante / Factura (Opcional)</Label>
              
              {compraImagen ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black border border-border group">
                  <img src={compraImagen.url} alt="Comprobante" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={removeCompraImage}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow transition-transform active:scale-95"
                    title="Eliminar comprobante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={handleTriggerCompraCamera}
                  className="w-full h-20 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-1.5 bg-background cursor-pointer hover:bg-muted/5 transition-all"
                >
                  <Camera className="h-6 w-6 text-indigo-500" />
                  <span className="text-[10px] font-bold opacity-75">Toma o carga foto del comprobante de compra</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputCompraRef}
                onChange={handleFileCompraChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row mt-3">
          <Button 
            variant="outline" 
            onClick={() => setModalCompraOpen(false)}
            disabled={guardando}
            className="rounded-xl text-xs h-11 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => handleGuardarCompra(toast)}
            disabled={guardando}
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-11 w-full sm:w-auto font-bold"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Finalizar Compra y Activar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

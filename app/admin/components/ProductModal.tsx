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
import { useToast } from '../../../hooks/use-toast';
import { useAdminStore } from '../hooks/useAdminStore';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput, compressImage } from '../../../lib/utils';
import { 
  Plus, 
  Camera, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Barcode, 
  TrendingUp, 
  Percent, 
  Calendar, 
  Info, 
  Scale, 
  Hash 
} from 'lucide-react';

export const ProductModal: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read admin store values and actions
  const modalOpen = useAdminStore((state) => state.modalOpen);
  const setModalOpen = useAdminStore((state) => state.setModalOpen);
  const editando = useAdminStore((state) => state.editando);
  const guardando = useAdminStore((state) => state.guardando);
  const analizandoIA = useAdminStore((state) => state.analizandoIA);
  const formData = useAdminStore((state) => state.formData);
  const setFormData = useAdminStore((state) => state.setFormData);
  const localImages = useAdminStore((state) => state.localImages);
  const addLocalImages = useAdminStore((state) => state.addLocalImages);
  const removeLocalImage = useAdminStore((state) => state.removeLocalImage);

  // Form field triggers
  const handleCostoChange = useAdminStore((state) => state.handleCostoChange);
  const handleCostoCajaChange = useAdminStore((state) => state.handleCostoCajaChange);
  const handleCantidadCajaChange = useAdminStore((state) => state.handleCantidadCajaChange);
  const handleMargenChange = useAdminStore((state) => state.handleMargenChange);
  const handleAutocompletarIA = useAdminStore((state) => state.handleAutocompletarIA);
  const handleGuardar = useAdminStore((state) => state.handleGuardar);

  const handleTriggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const incomingFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (localImages.length + incomingFiles.length > 4) {
      toast({
        title: 'Límite de fotos superado',
        description: 'Puedes agregar hasta 4 imágenes por producto.',
        variant: 'destructive',
      });
      return;
    }

    const promises = incomingFiles.map(file => {
      return new Promise<{ file: File; url: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawUrl = reader.result as string;
          try {
            const compressedUrl = await compressImage(rawUrl, 1024, 0.75);
            resolve({ file, url: compressedUrl });
          } catch (err) {
            console.warn('Error al comprimir imagen, usando original:', err);
            resolve({ file, url: rawUrl });
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((results) => {
      addLocalImages(results);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !guardando && !analizandoIA && setModalOpen(open)}>
      <DialogContent className="max-h-[95vh] overflow-y-auto w-[96vw] max-w-xl rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            {editando ? 'Editar Producto' : (formData.es_interes ? 'Nueva Cotización / Interés' : 'Crear Producto')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Saca fotos del envase para autocompletar con Gemini. Puedes guardar como interés para cotizar y comprar después.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          
          {/* Save as Interest / Cotización Switch */}
          <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/15 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="es_interes" className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  ¿Guardar como Interés / Cotización?
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  No aparecerá en el POS hasta que registres una compra de stock.
                </p>
              </div>
              <input
                id="es_interes"
                type="checkbox"
                checked={formData.es_interes}
                onChange={(e) => setFormData({ es_interes: e.target.checked })}
                className="w-5 h-5 accent-indigo-600 border-border rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={guardando || analizandoIA || editando !== null}
              />
            </div>
            {editando !== null && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold leading-tight pt-1 border-t border-indigo-500/10">
                No se puede cambiar el tipo de registro (Catálogo vs Interés) una vez creado.
              </p>
            )}
          </div>

          {/* Facturable Switch */}
          <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/15 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="facturable" className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                ¿Producto Facturable (Afecto a IVA)?
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Las ventas pagarán IVA (19%) y se declararán en la boleta. Si se desmarca, se considerará exento.
              </p>
            </div>
            <input
              id="facturable"
              type="checkbox"
              checked={formData.facturable}
              onChange={(e) => setFormData({ facturable: e.target.checked })}
              className="w-5 h-5 accent-emerald-600 border-border rounded cursor-pointer"
              disabled={guardando || analizandoIA}
            />
          </div>

          {/* Camera Multi-capture Panel */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Fotos del Producto ({localImages.length}/4)</Label>
            
            <div className="p-3 border border-border/70 rounded-2xl bg-muted/10 space-y-3">
              {localImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {localImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-border/80 group">
                      <img src={img.url} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeLocalImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-transform active:scale-95"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {localImages.length < 4 && (
                    <button
                      type="button"
                      onClick={handleTriggerCamera}
                      className="aspect-square rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground bg-background hover:bg-muted/10 active:scale-95 transition-all"
                    >
                      <Camera className="h-5 w-5 text-indigo-500 mb-1" />
                      <span className="text-[8px] font-bold">Añadir</span>
                    </button>
                  )}
                </div>
              ) : (
                <div 
                  onClick={handleTriggerCamera}
                  className="w-full h-24 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-1.5 bg-background cursor-pointer hover:bg-muted/5 transition-all"
                >
                  <Camera className="h-7 w-7 text-indigo-500/80" />
                  <span className="text-[10px] font-bold opacity-70">Presiona para tomar fotos del producto</span>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
              />

              {localImages.length > 0 && (
                <Button
                  type="button"
                  onClick={() => handleAutocompletarIA(toast)}
                  disabled={analizandoIA || guardando || editando !== null}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-xs font-bold shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={editando !== null ? "El autocompletado por IA está desactivado durante la edición del producto" : ""}
                >
                  {analizandoIA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gemini analizando {localImages.filter(img => img.url.startsWith('data:')).length} fotos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Autocompletar Datos con IA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-xs font-bold text-foreground">Nombre del Producto</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ nombre: e.target.value })}
              placeholder="Ej: Tomate Larga Vida"
              className="rounded-xl h-11 text-[16px] md:text-sm font-medium border-border/70"
              disabled={guardando || analizandoIA}
            />
          </div>

          {/* Barcode SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="sku" className="text-xs font-bold text-foreground">Código SKU / Barra (Opcional)</Label>
            <div className="relative">
              <Barcode className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ sku: e.target.value })}
                placeholder="Ej: 7891234567890"
                className="pl-10 rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/77"
                disabled={guardando || analizandoIA}
              />
            </div>
          </div>

          {/* Cost and Margin input - AUTO CALCULATES SELLING PRICE */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-3.5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/15">
            <div className="space-y-1.5">
              <Label htmlFor="costo" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {formData.tipo_empaque && formData.cantidad_por_caja
                  ? `Costo por ${formData.tipo_empaque} ($ Compra)`
                  : `Costo Mayorista ($ Compra)`
                }
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="costo"
                  type="text"
                  inputMode="decimal"
                  value={formData.tipo_empaque && formData.cantidad_por_caja ? formData.costo_caja : formData.costo}
                  onChange={(e) => {
                    if (formData.tipo_empaque && formData.cantidad_por_caja) {
                      handleCostoCajaChange(e.target.value);
                    } else {
                      handleCostoChange(e.target.value);
                    }
                  }}
                  className="pl-6 h-10 rounded-xl text-[16px] md:text-xs font-bold border-indigo-500/20 bg-background"
                  placeholder="0"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="margen" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                Margen de Ganancia (%)
              </Label>
              <div className="relative">
                <Input
                  id="margen"
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.margen}
                  onChange={(e) => handleMargenChange(e.target.value)}
                  className="pr-7 pl-3 h-10 rounded-xl text-[16px] md:text-xs font-bold text-center border-indigo-500/20 bg-background"
                  placeholder="30"
                  disabled={guardando || analizandoIA}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">%</span>
              </div>
            </div>
          </div>

          {/* Price and Expiration grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
            {/* Selling Price */}
            <div className="space-y-1.5">
              <Label htmlFor="precio" className="text-xs font-bold text-foreground block min-h-[2rem] flex items-end">
                Precio de Venta Sugerido/Final {formData.es_interes && '(Opcional)'}
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="precio"
                  type="text"
                  inputMode="decimal"
                  value={formData.precio}
                  onChange={(e) => setFormData({ precio: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setFormData({ precio: formData.precio ? formatCLPCurrency(parseChileanMoneyInput(formData.precio)) : '' })}
                  onFocus={() => setFormData({ precio: normalizeMoneyInput(formData.precio) })}
                  className="pl-7 h-11 rounded-xl text-[16px] md:text-sm font-black border-border/77 bg-background shadow-sm w-full"
                  placeholder="0"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>

            {/* Expiration Date */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha_caducidad" className="text-xs font-bold text-foreground flex items-end gap-1.5 min-h-[2rem]">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Fecha de Caducidad (Opcional)
              </Label>
              <Input
                id="fecha_caducidad"
                type="date"
                value={formData.fecha_caducidad}
                onChange={(e) => setFormData({ fecha_caducidad: e.target.value })}
                className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/77 w-full"
                disabled={guardando || analizandoIA}
              />
            </div>
          </div>

          {/* Box configurations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end p-3.5 bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl border border-purple-500/15">
            <div className="space-y-1.5">
              <Label htmlFor="tipo_empaque_form" className="text-xs font-bold text-purple-600 dark:text-purple-400 block min-h-[2rem] flex items-end">
                Tipo Empaque / Contenedor
              </Label>
              <Input
                id="tipo_empaque_form"
                placeholder="Ej: Caja, Saco, Malla, Bandeja"
                value={formData.tipo_empaque}
                onChange={(e) => setFormData({ tipo_empaque: e.target.value })}
                className="h-11 rounded-xl text-[16px] md:text-xs font-semibold border-purple-500/20 bg-background w-full"
                disabled={guardando || analizandoIA}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cantidad_por_caja_form" className="text-xs font-bold text-purple-600 dark:text-purple-400 block min-h-[2rem] flex items-end">
                Cant. por {formData.tipo_empaque || 'Caja'} ({formData.unidad})
              </Label>
              <Input
                id="cantidad_por_caja_form"
                type="number"
                placeholder="Ej: 12"
                value={formData.cantidad_por_caja}
                onChange={(e) => handleCantidadCajaChange(e.target.value)}
                className="h-11 rounded-xl text-[16px] md:text-xs font-semibold border-purple-500/20 bg-background w-full"
                disabled={guardando || analizandoIA}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precio_caja_form" className="text-xs font-bold text-purple-600 dark:text-purple-400 block min-h-[2rem] flex items-end">
                Precio Venta {formData.tipo_empaque || 'Caja'} ($)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  id="precio_caja_form"
                  value={formData.precio_caja}
                  onChange={(e) => setFormData({ precio_caja: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setFormData({ precio_caja: formData.precio_caja ? formatCLPCurrency(parseChileanMoneyInput(formData.precio_caja)) : '' })}
                  onFocus={() => setFormData({ precio_caja: normalizeMoneyInput(formData.precio_caja) })}
                  className="pl-6 h-11 rounded-xl text-[16px] md:text-xs font-semibold border-purple-500/20 bg-background w-full"
                  placeholder="Ej: 15000"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>
          </div>

          {formData.tipo_empaque && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed flex items-start gap-2 shadow-sm">
              <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-bold text-xs mb-0.5">💡 Tip de Inventario & Venta al Detalle:</p>
                <p className="opacity-90">
                  Si compras este producto por empaque completo (como {formData.tipo_empaque || 'Malla'} de {formData.cantidad_por_caja || '25'} {formData.unidad === 'kg' ? 'kg' : 'unid'}) pero lo vendes **fraccionado por kilo**, selecciona **"Por Peso"** en la sección Tipo de Venta más abajo.
                </p>
                <p className="mt-1.5 opacity-75">
                  Esto permitirá ingresar compras por empaques completos, sumando el total automáticamente en kilogramos, y realizar ventas por peso exacto al detalle (o la malla completa con precio especial en caja).
                </p>
              </div>
            </div>
          )}

          {/* Type of Sale */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Tipo de Venta</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ unidad: 'kg' })}
                disabled={guardando || analizandoIA || editando !== null}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all ${
                  formData.unidad === 'kg'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-background hover:border-primary/40'
                } ${editando !== null ? 'opacity-65 cursor-not-allowed' : ''}`}
              >
                <Scale className={`h-5 w-5 ${formData.unidad === 'kg' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className="text-xs font-bold">Por Peso</p>
                  <p className="text-[9px] opacity-70">Kilógramos (Fruta)</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ unidad: 'unid' })}
                disabled={guardando || analizandoIA || editando !== null}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all ${
                  formData.unidad === 'unid'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-border bg-background hover:border-primary/40'
                } ${editando !== null ? 'opacity-65 cursor-not-allowed' : ''}`}
              >
                <Hash className={`h-5 w-5 ${formData.unidad === 'unid' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className="text-xs font-bold">Por Unidad</p>
                  <p className="text-[9px] opacity-70">Abarrotes / Envases</p>
                </div>
              </button>
            </div>
            {editando !== null && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-tight mt-1.5">
                La unidad de medida no se puede modificar una vez creado el producto para mantener la integridad del historial de ventas y stock.
              </p>
            )}
          </div>

          {/* Stock Initial / Actual */}
          {!formData.es_interes && (
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-xs font-bold text-foreground">
                {editando ? 'Stock Actual' : (formData.unidad === 'kg' ? 'Stock Inicial (kg)' : 'Stock Inicial (unidades)')}
              </Label>
              <Input
                id="stock"
                type="number"
                step={formData.unidad === 'kg' ? '0.01' : '1'}
                min="0"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ stock_actual: e.target.value })}
                placeholder={formData.unidad === 'kg' ? '0.00' : '0'}
                className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/77"
                disabled={guardando || analizandoIA || editando !== null}
              />
              {editando !== null && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-tight mt-1">
                  El stock no se puede modificar directamente en la edición para asegurar trazabilidad. Por favor, usa el botón "Comprar / Abastecer" en la tarjeta del producto.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row mt-3">
          <Button 
            variant="outline" 
            onClick={() => setModalOpen(false)}
            disabled={guardando || analizandoIA}
            className="rounded-xl text-xs h-11 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => handleGuardar(toast)}
            disabled={guardando || analizandoIA}
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-11 w-full sm:w-auto font-bold"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              editando ? 'Actualizar' : (formData.es_interes ? 'Registrar Cotización' : 'Crear Producto')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

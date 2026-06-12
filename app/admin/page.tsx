'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, addDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImage } from '@/lib/firebase/storage';
import { Producto } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Package, 
  Scale, 
  Hash, 
  Camera, 
  Sparkles, 
  Calendar, 
  Barcode, 
  Clock, 
  Loader2, 
  AlertTriangle,
  FileImage,
  Trash2,
  Percent,
  TrendingUp
} from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/protected-route';

interface LocalImage {
  file: File | null;
  url: string;
}

function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    costo: '',
    margen: '30',
    precio: '',
    unidad: 'kg' as 'kg' | 'unid',
    stock_actual: '',
    sku: '',
    fecha_caducidad: '',
  });

  // Multiple captured images
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Load products in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];
      setProductos(productosData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });

    return () => unsubscribe();
  }, []);

  const handleAbrirModal = (producto?: Producto) => {
    if (producto) {
      setEditando(producto);
      setFormData({
        nombre: producto.nombre,
        costo: producto.costo_actual ? producto.costo_actual.toString() : '',
        margen: producto.margen_deseado ? producto.margen_deseado.toString() : '30',
        precio: formatCLPCurrency(producto.precio),
        unidad: producto.unidad,
        stock_actual: producto.stock_actual.toString(),
        sku: producto.sku || '',
        fecha_caducidad: producto.fecha_caducidad || '',
      });
      // Load current product image if it has one
      setLocalImages(producto.imagen_url ? [{ file: null, url: producto.imagen_url }] : []);
    } else {
      setEditando(null);
      setFormData({ 
        nombre: '', 
        costo: '',
        margen: '30',
        precio: '', 
        unidad: 'kg', 
        stock_actual: '', 
        sku: '', 
        fecha_caducidad: '' 
      });
      setLocalImages([]);
    }
    setModalOpen(true);
  };

  // Live price calculation helpers
  const handleCostoChange = (val: string) => {
    const cleanVal = normalizeMoneyInput(val);
    const costoNum = parseFloat(cleanVal) || 0;
    const margenNum = parseFloat(formData.margen) || 0;
    const precioSugerido = Math.round(costoNum * (1 + margenNum / 100));
    
    setFormData(prev => ({
      ...prev,
      costo: cleanVal,
      precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : ''
    }));
  };

  const handleMargenChange = (val: string) => {
    const margenNum = parseFloat(val) || 0;
    const costoNum = parseFloat(formData.costo) || 0;
    const precioSugerido = Math.round(costoNum * (1 + margenNum / 100));

    setFormData(prev => ({
      ...prev,
      margen: val,
      precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : ''
    }));
  };

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
        variant: 'destructive'
      });
      return;
    }

    incomingFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImages(prev => [...prev, { file, url: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setLocalImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Gemini Vision auto-fill
  const handleAutocompletarIA = async () => {
    const base64List = localImages
      .map(img => img.url)
      .filter(url => url.startsWith('data:'));

    if (base64List.length === 0) {
      toast({
        title: 'Imagen requerida',
        description: 'Toma o carga al menos una foto nueva para analizar con Gemini.',
        variant: 'destructive'
      });
      return;
    }

    setAnalizandoIA(true);
    try {
      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: base64List }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el análisis.');
      }

      setFormData(prev => ({
        ...prev,
        nombre: data.nombre || prev.nombre,
        sku: data.sku || prev.sku,
        fecha_caducidad: data.fecha_caducidad || prev.fecha_caducidad,
      }));

      toast({
        title: '¡Auto-completado exitoso!',
        description: `Gemini analizó ${base64List.length} fotos y completó los datos.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudieron procesar las imágenes.',
        variant: 'destructive'
      });
    } finally {
      setAnalizandoIA(false);
    }
  };

  const handleGuardar = async () => {
    console.log('handleGuardar: Iniciando guardado...', formData);
    if (!formData.nombre || !formData.precio || !formData.stock_actual) {
      console.log('handleGuardar: Campos obligatorios incompletos!');
      toast({
        title: 'Campos incompletos',
        description: 'El nombre, precio (venta) y stock son requeridos.',
        variant: 'destructive'
      });
      return;
    }

    setGuardando(true);
    try {
      let productoId = editando?.id;
      const isNew = !productoId;
      console.log('handleGuardar: Modo:', isNew ? 'NUEVO' : 'EDICIÓN', 'ID:', productoId);

      // Conversión y saneamiento seguro
      const parsedPrecio = parseChileanMoneyInput(formData.precio);
      const parsedStock = parseFloat(formData.stock_actual) || 0;
      const parsedCosto = formData.costo ? parseFloat(formData.costo) : null;
      const parsedMargen = formData.margen ? parseFloat(formData.margen) : null;
      const cleanSku = (formData.sku || '').trim() || null;
      const cleanFecha = formData.fecha_caducidad || null;

      console.log('handleGuardar: Parámetros saneados:', { parsedPrecio, parsedStock, parsedCosto, parsedMargen, cleanSku, cleanFecha });

      const productoData = {
        nombre: formData.nombre,
        precio: parsedPrecio,
        unidad: formData.unidad,
        stock_actual: parsedStock,
        sku: cleanSku,
        fecha_caducidad: cleanFecha,
        costo_actual: parsedCosto,
        margen_deseado: parsedMargen,
        activo: true,
        updatedAt: Timestamp.now()
      };

      if (isNew) {
        console.log('handleGuardar: Creando producto en Firestore...');
        // 1. Crear documento primero (sin await para evitar bloqueos por red/persistencia offline)
        addDoc(collection(db, 'productos'), {
          ...productoData,
          imagen_url: null,
          createdAt: Timestamp.now()
        }).then((docRef) => {
          console.log('handleGuardar: Documento creado con éxito. ID:', docRef.id);
        }).catch((err) => {
          console.error('Error al guardar producto nuevo en segundo plano:', err);
          toast({
            title: 'Error de sincronización',
            description: 'El producto se guardó localmente pero falló al sincronizar: ' + err.message,
            variant: 'destructive'
          });
        });
        toast({ title: 'Producto creado' });
      } else {
        if (!productoId) {
          throw new Error('ID de producto no encontrado para actualizar.');
        }
        console.log('handleGuardar: Actualizando producto en Firestore. ID:', productoId);
        const docRef = doc(db, 'productos', productoId);
        
        let finalImageUrl = editando?.imagen_url || '';
        // 2. Subir imagen para edición (Desactivado de momento a petición del usuario)
        /*
        const newLocalImage = localImages.find(img => img.file !== null);
        if (newLocalImage && newLocalImage.file) {
          console.log('handleGuardar: Subiendo nueva imagen para producto existente...');
          finalImageUrl = await uploadImage(`productos/${productoId}/imagen.jpg`, newLocalImage.file);
          console.log('handleGuardar: Imagen actualizada con éxito:', finalImageUrl);
        } else if (localImages.length === 0) {
          console.log('handleGuardar: El usuario eliminó la imagen.');
          finalImageUrl = '';
        }
        */

        // Actualizar documento (sin await para evitar bloqueos por red/persistencia offline)
        updateDoc(docRef, {
          ...productoData,
          imagen_url: finalImageUrl || null
        }).then(() => {
          console.log('handleGuardar: Documento actualizado con éxito.');
        }).catch((err) => {
          console.error('Error al actualizar producto en segundo plano:', err);
          toast({
            title: 'Error de sincronización',
            description: 'El producto se actualizó localmente pero falló al sincronizar: ' + err.message,
            variant: 'destructive'
          });
        });
        toast({ title: 'Producto actualizado' });
      }

      console.log('handleGuardar: Finalizado exitosamente.');
      setModalOpen(false);
    } catch (error: any) {
      console.error('handleGuardar: ERROR al guardar:', error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'Error desconocido al guardar.',
        variant: 'destructive'
      });
    } finally {
      setGuardando(false);
    }
  };

  const obtenerDiasParaVencer = (fechaCaducidad: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaCaducidad + 'T00:00:00');
    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              <Package className="h-7 w-7 text-primary shrink-0" />
              Administración de Productos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Gestiona el catálogo. Toma fotos con tu celular y autocompleta con Inteligencia Artificial.
            </p>
          </div>
          <Button onClick={() => handleAbrirModal()} size="lg" className="w-full sm:w-auto rounded-2xl font-bold shadow-md h-12">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Producto
          </Button>
        </div>

        {/* Grid of Products */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => {
            const diasRestantes = producto.fecha_caducidad ? obtenerDiasParaVencer(producto.fecha_caducidad) : null;
            const estaVencido = diasRestantes !== null && diasRestantes < 0;
            const proximoAVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

            return (
              <Card key={producto.id} className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <div>
                  {producto.imagen_url ? (
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      <img 
                        src={producto.imagen_url} 
                        alt={producto.nombre} 
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {producto.sku && (
                        <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Barcode className="h-3.5 w-3.5" />
                          {producto.sku}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-48 w-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                      <Package className="h-10 w-10 opacity-20" />
                      {producto.sku && (
                        <span className="absolute bottom-3 left-3 bg-muted border border-border text-foreground text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Barcode className="h-3.5 w-3.5" />
                          {producto.sku}
                        </span>
                      )}
                    </div>
                  )}

                  <CardHeader className="space-y-1 pt-5">
                    <CardTitle className="flex items-start justify-between gap-3">
                      <span className="truncate text-lg font-black tracking-tight text-foreground" title={producto.nombre}>
                        {producto.nombre}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAbrirModal(producto)}
                        className="h-9 w-9 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-6">
                    {producto.fecha_caducidad && (
                      <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                        estaVencido ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                        proximoAVencer ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {estaVencido ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
                        <div className="flex-1 truncate">
                          Vence: <span className="font-bold">{producto.fecha_caducidad}</span>
                          <span className="ml-1 text-[10px] opacity-80">
                            ({estaVencido ? 'Vencido' : `${diasRestantes} días`})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                        <span className="text-muted-foreground">Precio de Venta:</span>
                        <span className="font-bold text-foreground text-sm">{formatCLPCurrency(producto.precio)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                        <span className="text-muted-foreground">Stock Actual:</span>
                        <span className={`font-bold ${
                          producto.stock_actual < 5 ? 'text-red-500 font-black' :
                          producto.stock_actual < 15 ? 'text-amber-500' :
                          'text-emerald-500'
                        }`}>
                          {producto.stock_actual.toFixed(2)} {producto.unidad}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>

        {productos.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-[2rem] bg-card/30">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-bold mb-1">Catálogo Vacío</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Comienza agregando productos a tu catálogo.
            </p>
            <Button onClick={() => handleAbrirModal()} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Crear Producto
            </Button>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={(open) => !guardando && !analizandoIA && setModalOpen(open)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto w-[96vw] max-w-xl rounded-[2rem] border-border/80 shadow-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              {editando ? 'Editar Producto' : 'Crear Producto'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Saca fotos del envase para autocompletar con Gemini, o ingresa el costo y margen para calcular el precio automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            
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
                          onClick={() => handleRemoveImage(idx)}
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
                    onClick={handleAutocompletarIA}
                    disabled={analizandoIA || guardando}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-xs font-bold shadow-md shadow-indigo-500/10"
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
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
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
                  Costo Mayorista ($ Compra)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    id="costo"
                    type="text"
                    inputMode="decimal"
                    value={formData.costo}
                    onChange={(e) => handleCostoChange(e.target.value)}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Selling Price */}
              <div className="space-y-1.5">
                <Label htmlFor="precio" className="text-xs font-bold text-foreground">Precio de Venta Sugerido/Final</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    id="precio"
                    type="text"
                    inputMode="decimal"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: normalizeMoneyInput(e.target.value) })}
                    onBlur={() => setFormData((current) => ({ ...current, precio: current.precio ? formatCLPCurrency(parseChileanMoneyInput(current.precio)) : '' }))}
                    onFocus={() => setFormData((current) => ({ ...current, precio: normalizeMoneyInput(current.precio) }))}
                    className="pl-7 h-11 rounded-xl text-[16px] md:text-sm font-black border-border/77 bg-background shadow-sm"
                    placeholder="0"
                    disabled={guardando || analizandoIA}
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div className="space-y-1.5">
                <Label htmlFor="fecha_caducidad" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha de Caducidad (Opcional)
                </Label>
                <Input
                  id="fecha_caducidad"
                  type="date"
                  value={formData.fecha_caducidad}
                  onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
                  className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/77"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>

            {/* Type of Sale */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Tipo de Venta</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, unidad: 'kg' })}
                  disabled={guardando || analizandoIA}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all ${
                    formData.unidad === 'kg'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <Scale className={`h-5 w-5 ${formData.unidad === 'kg' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="text-xs font-bold">Por Peso</p>
                    <p className="text-[9px] opacity-70">Kilógramos (Fruta)</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, unidad: 'unid' })}
                  disabled={guardando || analizandoIA}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all ${
                    formData.unidad === 'unid'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <Hash className={`h-5 w-5 ${formData.unidad === 'unid' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className="text-xs font-bold">Por Unidad</p>
                    <p className="text-[9px] opacity-70">Abarrotes / Envases</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Stock Initial */}
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-xs font-bold text-foreground">
                {formData.unidad === 'kg' ? 'Stock Inicial (kg)' : 'Stock Inicial (unidades)'}
              </Label>
              <Input
                id="stock"
                type="number"
                step={formData.unidad === 'kg' ? '0.01' : '1'}
                min="0"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                placeholder={formData.unidad === 'kg' ? '0.00' : '0'}
                className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/77"
                disabled={guardando || analizandoIA}
              />
            </div>
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
              onClick={handleGuardar}
              disabled={guardando || analizandoIA}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-11 w-full sm:w-auto font-bold"
            >
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editando ? 'Actualizar' : 'Crear Producto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  );
}

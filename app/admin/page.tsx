'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
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
  CheckCircle,
  FileImage
} from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/protected-route';

function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    unidad: 'kg' as 'kg' | 'unid',
    stock_actual: '',
    sku: '',
    fecha_caducidad: '',
  });

  // Camera and Image uploading state
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
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
        precio: formatCLPCurrency(producto.precio),
        unidad: producto.unidad,
        stock_actual: producto.stock_actual.toString(),
        sku: producto.sku || '',
        fecha_caducidad: producto.fecha_caducidad || '',
      });
      setLocalImageUrl(producto.imagen_url || null);
    } else {
      setEditando(null);
      setFormData({ 
        nombre: '', 
        precio: '', 
        unidad: 'kg', 
        stock_actual: '', 
        sku: '', 
        fecha_caducidad: '' 
      });
      setLocalImageUrl(null);
    }
    setLocalImageFile(null);
    setModalOpen(true);
  };

  // Open native camera/file explorer
  const handleTriggerCamera = () => {
    fileInputRef.current?.click();
  };

  // Process captured/selected file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Archivo no válido',
          description: 'Por favor selecciona un archivo de imagen',
          variant: 'destructive'
        });
        return;
      }

      setLocalImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Call Gemini Vision to auto-complete product fields
  const handleAutocompletarIA = async () => {
    if (!localImageUrl) {
      toast({
        title: 'Imagen requerida',
        description: 'Toma una foto del producto o carga una imagen primero.',
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
        body: JSON.stringify({ image: localImageUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en análisis IA.');
      }

      setFormData(prev => ({
        ...prev,
        nombre: data.nombre || prev.nombre,
        sku: data.sku || prev.sku,
        fecha_caducidad: data.fecha_caducidad || prev.fecha_caducidad,
      }));

      toast({
        title: '¡Auto-completado con éxito!',
        description: `Gemini reconoció: ${data.nombre || 'Producto'}.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo analizar la imagen.',
        variant: 'destructive'
      });
    } finally {
      setAnalizandoIA(false);
    }
  };

  // Save product details and upload image if present
  const handleGuardar = async () => {
    if (!formData.nombre || !formData.precio || !formData.stock_actual) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor completa el nombre, precio y stock',
        variant: 'destructive'
      });
      return;
    }

    setGuardando(true);
    try {
      let productoId = editando?.id;
      let isNew = false;
      let productRef;

      if (!productoId) {
        isNew = true;
        // Generate a new ref to get the ID beforehand
        const newRef = doc(collection(db, 'productos'));
        productoId = newRef.id;
        productRef = newRef;
      } else {
        productRef = doc(db, 'productos', productoId);
      }

      // 1. Upload image to Storage if a new file was chosen locally
      let finalImageUrl = editando?.imagen_url || '';
      if (localImageFile) {
        finalImageUrl = await uploadImage(`productos/${productoId}/imagen.jpg`, localImageFile);
      }

      // 2. Prepare product schema
      const productoData = {
        nombre: formData.nombre,
        precio: parseChileanMoneyInput(formData.precio),
        unidad: formData.unidad,
        stock_actual: parseFloat(formData.stock_actual),
        sku: formData.sku.trim() || null,
        fecha_caducidad: formData.fecha_caducidad || null,
        imagen_url: finalImageUrl || null,
        activo: true,
        updatedAt: Timestamp.now()
      };

      // 3. Save to Firestore
      if (isNew) {
        await setDoc(productRef, {
          ...productoData,
          createdAt: Timestamp.now()
        });
        toast({ title: 'Producto creado exitosamente' });
      } else {
        await updateDoc(productRef, productoData);
        toast({ title: 'Producto actualizado exitosamente' });
      }

      setModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGuardando(false);
    }
  };

  // Expiration helper formatting
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
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl tracking-tight">
              <Package className="h-7 w-7 shrink-0 text-primary" />
              Administración de Productos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Gestiona el inventario, carga fotos con la cámara y autocompleta abarrotes con Gemini.
            </p>
          </div>
          <Button onClick={() => handleAbrirModal()} size="lg" className="w-full sm:w-auto rounded-2xl font-bold shadow-md">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Producto
          </Button>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => {
            const diasRestantes = producto.fecha_caducidad ? obtenerDiasParaVencer(producto.fecha_caducidad) : null;
            const estaVencido = diasRestantes !== null && diasRestantes < 0;
            const proximoAVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

            return (
              <Card key={producto.id} className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/10">
                <div>
                  {/* Product Image section */}
                  {producto.imagen_url ? (
                    <div className="relative h-44 w-full overflow-hidden bg-muted">
                      <img 
                        src={producto.imagen_url} 
                        alt={producto.nombre} 
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {producto.sku && (
                        <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-black tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {producto.sku}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-44 w-full overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground">
                      <Package className="h-10 w-10 opacity-20" />
                      {producto.sku && (
                        <span className="absolute bottom-3 left-3 bg-muted border border-border text-foreground text-[9px] font-black tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
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
                        className="h-8 w-8 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Expiration date highlights */}
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
                            ({estaVencido ? 'Vencido' : `${diasRestantes} días restantes`})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* General Specs */}
                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                        <span className="text-muted-foreground">Precio de Venta:</span>
                        <span className="font-bold text-foreground text-sm">{formatCLPCurrency(producto.precio)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                        <span className="text-muted-foreground">Inventario Disponible:</span>
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
          <div className="text-center py-16 border-2 border-dashed border-border rounded-[2rem] bg-card/40">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-bold mb-1">Catálogo Vacío</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              No hay productos registrados. Presiona "Nuevo Producto" para añadir tus primeros productos.
            </p>
            <Button onClick={() => handleAbrirModal()} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Crear Producto
            </Button>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL DIALOG */}
      <Dialog open={modalOpen} onOpenChange={(open) => !guardando && !analizandoIA && setModalOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl rounded-[2rem] border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              {editando ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Completa la información del producto. Si es un abarrote, puedes tomarle una foto para autocompletar el SKU, nombre y caducidad automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            
            {/* Visual Capture / Camera Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Foto del Producto</Label>
              <div className="flex flex-col items-center gap-3 p-4 border border-border/80 rounded-2xl bg-muted/20">
                {localImageUrl ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <img src={localImageUrl} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setLocalImageFile(null);
                        setLocalImageUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold px-2 py-1 shadow"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-28 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-1.5 bg-background">
                    <FileImage className="h-8 w-8 opacity-30" />
                    <span className="text-[10px] font-semibold opacity-60">Sin imagen de producto</span>
                  </div>
                )}

                {/* Camera Trigger Inputs */}
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTriggerCamera}
                    disabled={guardando || analizandoIA}
                    className="flex-1 rounded-xl h-10 text-xs font-bold"
                  >
                    <Camera className="mr-2 h-4 w-4 text-indigo-500" />
                    Tomar Foto / Cargar
                  </Button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {localImageUrl && (
                    <Button
                      type="button"
                      onClick={handleAutocompletarIA}
                      disabled={analizandoIA || guardando}
                      className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-10 text-xs font-bold"
                    >
                      {analizandoIA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Autocompletar con IA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-xs font-bold">Nombre del Producto</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Tomate Larga Vida o Fideos Carozzi 400g"
                className="rounded-xl h-10 text-xs"
                disabled={guardando || analizandoIA}
              />
            </div>

            {/* Barcode SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-xs font-bold">Código SKU / Barra (Opcional)</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ej: 7891234567890"
                  className="pl-9 rounded-xl h-10 text-xs font-semibold"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Selling Price */}
              <div className="space-y-2">
                <Label htmlFor="precio" className="text-xs font-bold">Precio de Venta</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    id="precio"
                    type="text"
                    inputMode="decimal"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: normalizeMoneyInput(e.target.value) })}
                    onBlur={() => setFormData((current) => ({ ...current, precio: current.precio ? formatCLPCurrency(parseChileanMoneyInput(current.precio)) : '' }))}
                    onFocus={() => setFormData((current) => ({ ...current, precio: normalizeMoneyInput(current.precio) }))}
                    className="pl-7 h-10 rounded-xl text-xs font-bold"
                    placeholder="0"
                    disabled={guardando || analizandoIA}
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div className="space-y-2">
                <Label htmlFor="fecha_caducidad" className="text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha de Caducidad (Opcional)
                </Label>
                <Input
                  id="fecha_caducidad"
                  type="date"
                  value={formData.fecha_caducidad}
                  onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
                  className="h-10 rounded-xl text-xs font-semibold"
                  disabled={guardando || analizandoIA}
                />
              </div>
            </div>

            {/* Type of Sale */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Tipo de Venta</Label>
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
                    <p className="text-[9px] opacity-70">Kilógramos (Ej: Frutas)</p>
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
                    <p className="text-[9px] opacity-70">Abarrotes / Paquetes</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Stock field */}
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-xs font-bold">
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
                className="h-10 rounded-xl text-xs font-semibold"
                disabled={guardando || analizandoIA}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setModalOpen(false)}
              disabled={guardando || analizandoIA}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardar}
              disabled={guardando || analizandoIA}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Guardando...
                </>
              ) : (
                editando ? 'Actualizar Producto' : 'Crear Producto'
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

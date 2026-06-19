'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImage } from '@/lib/firebase/storage';
import { Producto } from '@/lib/types/pos';
import { CostosService } from '@/lib/services/costos.service';
import { ContabilidadService } from '@/lib/services/contabilidad.service';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput, roundToChileanDecena, compressImage } from '@/lib/utils';
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
  Trash2,
  Percent,
  TrendingUp,
  ShoppingBag,
  Info,
  Coins,
  Receipt
} from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Badge } from '@/components/ui/badge';

interface LocalImage {
  file: File | null;
  url: string;
}

function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tabActiva, setTabActiva] = useState<'catalogo' | 'interes'>('catalogo');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [productoCompra, setProductoCompra] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    costo: '',
    margen: '30',
    precio: '',
    unidad: 'kg' as 'kg' | 'unid',
    stock_actual: '',
    sku: '',
    fecha_caducidad: '',
    es_interes: false,
    cantidad_por_caja: '',
    costo_caja: '',
    precio_caja: '',
    tipo_empaque: '',
    facturable: true,
  });

  // Form state for purchasing / receiving stock
  const [compraData, setCompraData] = useState({
    cantidad_por_caja: '12',
    cajas_compradas: '1',
    costo_caja: '',
    margen_deseado: '30',
    precio_venta_unidad: '',
    margen_caja: '30',
    precio_venta_caja: '',
    tipo_documento: 'boleta' as 'factura' | 'boleta' | 'recibo' | 'guia' | 'otro',
    numero_documento: '',
    proveedor_rut: '',
    proveedor_nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'efectivo' as 'efectivo' | 'transferencia' | 'credito'
  });

  // Multiple captured images
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restock invoice image state
  const [compraImagen, setCompraImagen] = useState<LocalImage | null>(null);
  const fileInputCompraRef = useRef<HTMLInputElement>(null);

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
        precio: producto.precio ? formatCLPCurrency(producto.precio) : '',
        unidad: producto.unidad,
        stock_actual: producto.stock_actual.toString(),
        sku: producto.sku || '',
        fecha_caducidad: producto.fecha_caducidad || '',
        es_interes: producto.es_interes || false,
        cantidad_por_caja: producto.cantidad_por_caja ? producto.cantidad_por_caja.toString() : '',
        costo_caja: (producto.costo_actual && producto.cantidad_por_caja) ? Math.round(producto.costo_actual * producto.cantidad_por_caja).toString() : '',
        precio_caja: producto.precio_caja ? formatCLPCurrency(producto.precio_caja) : '',
        tipo_empaque: producto.tipo_empaque || '',
        facturable: producto.facturable !== false,
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
        fecha_caducidad: '',
        es_interes: tabActiva === 'interes', // default to active tab state
        cantidad_por_caja: '',
        costo_caja: '',
        precio_caja: '',
        tipo_empaque: '',
        facturable: true,
      });
      setLocalImages([]);
    }
    setModalOpen(true);
  };

  const handleAbrirModalCompra = (producto: Producto) => {
    setProductoCompra(producto);
    const cantCaja = producto.cantidad_por_caja || 12;

    const sugeridoUnidad = producto.precio || 0;

    setCompraData({
      cantidad_por_caja: cantCaja.toString(),
      cajas_compradas: '1',
      costo_caja: '',
      margen_deseado: producto.margen_deseado ? producto.margen_deseado.toString() : '30',
      precio_venta_unidad: sugeridoUnidad > 0 ? formatCLPCurrency(sugeridoUnidad) : '',
      margen_caja: '30',
      precio_venta_caja: '',
      tipo_documento: 'boleta',
      numero_documento: '',
      proveedor_rut: '',
      proveedor_nombre: '',
      fecha: new Date().toISOString().split('T')[0],
      metodo_pago: 'efectivo'
    });
    setCompraImagen(null);
    setModalCompraOpen(true);
  };

  // Live price calculation helpers for admin dialog
  const handleCostoChange = (val: string) => {
    const cleanVal = normalizeMoneyInput(val);
    const costoNum = parseFloat(cleanVal) || 0;
    const margenNum = parseFloat(formData.margen) || 0;
    const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));
    
    setFormData(prev => {
      const next = {
        ...prev,
        costo: cleanVal,
        precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : ''
      };
      
      const cantCaja = parseFloat(next.cantidad_por_caja) || 0;
      if (cantCaja > 0) {
        next.costo_caja = Math.round(costoNum * cantCaja).toString();
      }
      return next;
    });
  };

  const handleCostoCajaChange = (val: string) => {
    const cleanVal = normalizeMoneyInput(val);
    const costCajaNum = parseFloat(cleanVal) || 0;
    const cantCaja = parseFloat(formData.cantidad_por_caja) || 0;
    const margenNum = parseFloat(formData.margen) || 0;
    
    setFormData(prev => {
      const next = {
        ...prev,
        costo_caja: cleanVal,
      };
      
      if (cantCaja > 0) {
        const costoNum = costCajaNum / cantCaja;
        next.costo = costoNum > 0 ? Math.round(costoNum).toString() : '';
        const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));
        next.precio = precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '';
      }
      return next;
    });
  };

  const handleCantidadCajaChange = (val: string) => {
    const cantCaja = parseFloat(val) || 0;
    setFormData(prev => {
      const next = {
        ...prev,
        cantidad_por_caja: val,
      };
      
      const costoNum = parseFloat(next.costo) || 0;
      const costCajaNum = parseFloat(next.costo_caja) || 0;
      const margenNum = parseFloat(next.margen) || 0;
      
      if (costoNum > 0 && cantCaja > 0) {
        next.costo_caja = Math.round(costoNum * cantCaja).toString();
      } else if (costCajaNum > 0 && cantCaja > 0) {
        const calculatedCosto = costCajaNum / cantCaja;
        next.costo = calculatedCosto > 0 ? Math.round(calculatedCosto).toString() : '';
        const precioSugerido = roundToChileanDecena(Math.round(calculatedCosto * (1 + margenNum / 100)));
        next.precio = precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '';
      }
      return next;
    });
  };

  const handleMargenChange = (val: string) => {
    const margenNum = parseFloat(val) || 0;
    const costoNum = parseFloat(formData.costo) || 0;
    const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));

    setFormData(prev => {
      const next = {
        ...prev,
        margen: val,
        precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : ''
      };
      // Recalculate price box suggested if applicable
      const costCaja = parseFloat(next.costo_caja) || 0;
      if (costCaja > 0) {
        const precioCajaSugerido = roundToChileanDecena(Math.round(costCaja * (1 + margenNum / 100)));
        next.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
      }
      return next;
    });
  };

  // Live calculation helpers for purchase/abastecer dialog
  const handleCompraCajaChange = (field: string, val: string) => {
    setCompraData(prev => {
      const updated = { ...prev, [field]: val };
      
      const cantCaja = parseFloat(updated.cantidad_por_caja) || 1;
      const costCaja = parseFloat(updated.costo_caja) || 0;
      
      if (field === 'costo_caja' || field === 'cantidad_por_caja' || field === 'margen_deseado') {
        const costUnit = cantCaja > 0 ? (costCaja / cantCaja) : 0;
        const margUnit = parseFloat(updated.margen_deseado) || 0;
        const sugUnit = roundToChileanDecena(Math.round(costUnit * (1 + margUnit / 100)));
        updated.precio_venta_unidad = sugUnit > 0 ? formatCLPCurrency(sugUnit) : '';
      }
      
      if (field === 'costo_caja' || field === 'margen_caja') {
        const margCaja = parseFloat(updated.margen_caja) || 0;
        const sugCaja = roundToChileanDecena(Math.round(costCaja * (1 + margCaja / 100)));
        updated.precio_venta_caja = sugCaja > 0 ? formatCLPCurrency(sugCaja) : '';
      }
      
      return updated;
    });
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
      reader.onloadend = async () => {
        const rawUrl = reader.result as string;
        try {
          const compressedUrl = await compressImage(rawUrl, 1024, 0.75);
          setLocalImages(prev => [...prev, { file, url: compressedUrl }]);
        } catch (err) {
          console.warn('Error al comprimir imagen, usando original:', err);
          setLocalImages(prev => [...prev, { file, url: rawUrl }]);
        }
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

      setFormData(prev => {
        const next = { ...prev };
        if (data.nombre) next.nombre = data.nombre;
        if (data.sku) next.sku = data.sku;
        if (data.fecha_caducidad) next.fecha_caducidad = data.fecha_caducidad;
        if (data.tipo_empaque) next.tipo_empaque = data.tipo_empaque;
        if (data.cantidad_por_caja) next.cantidad_por_caja = data.cantidad_por_caja.toString();
        
        if (data.costo_unitario) {
          next.costo = data.costo_unitario.toString();
          const costoNum = parseFloat(data.costo_unitario) || 0;
          const margenNum = parseFloat(next.margen) || 0;
          const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));
          next.precio = precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '';
        }
        
        if (data.precio_sugerido_unidad) {
          next.precio = formatCLPCurrency(data.precio_sugerido_unidad);
          const costoNum = parseFloat(next.costo) || 0;
          const precioNum = data.precio_sugerido_unidad;
          if (costoNum > 0 && precioNum > 0) {
            const calculatedMargin = Math.round(((precioNum - costoNum) / costoNum) * 100);
            next.margen = calculatedMargin.toString();
          }
        }
        
        if (data.costo_caja) {
          const costCaja = parseFloat(data.costo_caja) || 0;
          const margenNum = parseFloat(next.margen) || 30;
          const precioCajaSugerido = roundToChileanDecena(Math.round(costCaja * (1 + margenNum / 100)));
          next.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
        } else if (data.costo_unitario && data.cantidad_por_caja) {
          const calculatedCostoCaja = (parseFloat(data.costo_unitario) || 0) * (parseFloat(data.cantidad_por_caja) || 0);
          const margenNum = parseFloat(next.margen) || 30;
          const precioCajaSugerido = roundToChileanDecena(Math.round(calculatedCostoCaja * (1 + margenNum / 100)));
          next.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
        }
        
        return next;
      });

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
    if (!formData.nombre || (!formData.es_interes && (!formData.precio || !formData.stock_actual))) {
      console.log('handleGuardar: Campos obligatorios incompletos!');
      toast({
        title: 'Campos incompletos',
        description: formData.es_interes 
          ? 'El nombre del producto es requerido para clasificarlo como Interés.'
          : 'El nombre, precio (venta) y stock son requeridos.',
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
      const parsedPrecio = formData.precio ? parseChileanMoneyInput(formData.precio) : 0;
      const parsedStock = parseFloat(formData.stock_actual) || 0;
      const parsedCosto = formData.costo ? parseFloat(formData.costo) : null;
      const parsedMargen = formData.margen ? parseFloat(formData.margen) : null;
      const cleanSku = (formData.sku || '').trim() || null;
      const cleanFecha = formData.fecha_caducidad || null;
      const parsedCantidadCaja = formData.cantidad_por_caja ? parseFloat(formData.cantidad_por_caja) : null;
      const parsedPrecioCaja = formData.precio_caja ? parseChileanMoneyInput(formData.precio_caja) : null;

      console.log('handleGuardar: Parámetros saneados:', { parsedPrecio, parsedStock, parsedCosto, parsedMargen, cleanSku, cleanFecha });

      // Generate document reference and target ID
      let docRef;
      let targetId;
      if (isNew) {
        docRef = doc(collection(db, 'productos'));
        targetId = docRef.id;
      } else {
        targetId = productoId!;
        docRef = doc(db, 'productos', targetId);
      }

      let finalImageUrl = editando?.imagen_url || '';

      // Upload image to Firebase Storage if a new file is chosen
      const newImageObj = localImages[0];
      if (newImageObj) {
        if (newImageObj.file) {
          console.log('handleGuardar: Detectada nueva imagen local, subiendo a Firebase Storage...', newImageObj.file.name);
          const storagePath = `productos/${targetId}/main_${Date.now()}.jpg`;
          finalImageUrl = await uploadImage(storagePath, newImageObj.file);
          console.log('handleGuardar: Imagen subida correctamente. URL:', finalImageUrl);
        }
      } else {
        // Image was removed by user
        finalImageUrl = '';
      }

      const productoData = {
        nombre: formData.nombre,
        precio: parsedPrecio,
        unidad: formData.unidad,
        stock_actual: parsedStock,
        sku: cleanSku,
        fecha_caducidad: cleanFecha,
        costo_actual: parsedCosto,
        margen_deseado: parsedMargen,
        es_interes: formData.es_interes,
        cantidad_por_caja: parsedCantidadCaja,
        precio_caja: parsedPrecioCaja,
        tipo_empaque: formData.tipo_empaque ? formData.tipo_empaque.trim() : null,
        facturable: formData.facturable,
        activo: true,
        imagen_url: finalImageUrl || null,
        updatedAt: Timestamp.now()
      };

      if (isNew) {
        console.log('handleGuardar: Creando producto en Firestore...');
        await setDoc(docRef, {
          ...productoData,
          createdAt: Timestamp.now()
        });
        toast({ title: formData.es_interes ? 'Producto de Interés creado' : 'Producto creado' });
      } else {
        console.log('handleGuardar: Actualizando producto en Firestore. ID:', targetId);
        await updateDoc(docRef, productoData);
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
        setCompraImagen({ file, url: compressedUrl });
      } catch (err) {
        console.warn('Error al comprimir imagen de compra:', err);
        setCompraImagen({ file, url: rawUrl });
      }
    };
    reader.readAsDataURL(file);

    if (fileInputCompraRef.current) {
      fileInputCompraRef.current.value = '';
    }
  };

  const handleRemoveCompraImage = () => {
    setCompraImagen(null);
  };

  const handleGuardarCompra = async () => {
    if (!productoCompra) return;
    
    const cantCaja = parseFloat(compraData.cantidad_por_caja) || 0;
    const cajasCompradas = parseFloat(compraData.cajas_compradas) || 0;
    const costCaja = parseFloat(compraData.costo_caja) || 0;
    
    const empaqueLabel = productoCompra.tipo_empaque || 'Caja';
    if (cantCaja <= 0 || cajasCompradas <= 0 || costCaja <= 0) {
      toast({
        title: 'Valores inválidos',
        description: `La cantidad por ${empaqueLabel.toLowerCase()}, ${empaqueLabel.toLowerCase()}s recibidos y costo por ${empaqueLabel.toLowerCase()} deben ser mayores a 0.`,
        variant: 'destructive'
      });
      return;
    }

    setGuardando(true);
    try {
      let finalInvoiceUrl = '';
      if (compraImagen && compraImagen.file) {
        const storagePath = `facturas/${productoCompra.id}_${Date.now()}.jpg`;
        finalInvoiceUrl = await uploadImage(storagePath, compraImagen.file);
      }

      const totalCompra = costCaja * cajasCompradas;
      const isFactura = compraData.tipo_documento === 'factura';
      const netoCompra = isFactura ? Math.round(totalCompra / 1.19) : totalCompra;
      const ivaCompra = isFactura ? (totalCompra - netoCompra) : 0;
      const stockAIngresar = cajasCompradas * cantCaja;
      const costoUnidad = isFactura 
        ? Math.round((costCaja / 1.19) / cantCaja) 
        : Math.round(costCaja / cantCaja);

      const margenUnidad = parseFloat(compraData.margen_deseado) || 0;
      const precioUnidad = parseChileanMoneyInput(compraData.precio_venta_unidad);
      const precioCaja = parseChileanMoneyInput(compraData.precio_venta_caja);

      const fechaDoc = new Date(compraData.fecha + 'T12:00:00');

      await ContabilidadService.registrarFacturaCompra({
        tipoDocumento: compraData.tipo_documento,
        numeroDocumento: compraData.numero_documento || `DOC-${Date.now()}`,
        numeroFactura: compraData.numero_documento || `DOC-${Date.now()}`,
        proveedorRut: compraData.proveedor_rut,
        proveedorNombre: compraData.proveedor_nombre,
        fecha: fechaDoc,
        neto: netoCompra,
        iva: ivaCompra,
        total: totalCompra,
        metodoPago: compraData.metodo_pago,
        productos: [{
          producto_id: productoCompra.id,
          nombre: productoCompra.nombre,
          cantidad: stockAIngresar,
          costo_unitario: costoUnidad,
          precio_venta: precioUnidad,
          precio_caja: precioCaja > 0 ? precioCaja : null,
          margen_deseado: margenUnidad,
          cantidad_por_caja: cantCaja,
          es_interes: false
        }],
        imagenFacturaUrl: finalInvoiceUrl || undefined
      });

      toast({
        title: 'Compra registrada',
        description: `Ingresados ${stockAIngresar.toFixed(2)} ${productoCompra.unidad} al inventario.`
      });
      setModalCompraOpen(false);
    } catch (err: any) {
      console.error('Error al registrar compra:', err);
      toast({
        title: 'Error al registrar compra',
        description: err.message || 'Error desconocido al registrar la compra.',
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

  // Filter products based on active tab
  const productosFiltrados = productos.filter(p => {
    if (tabActiva === 'catalogo') {
      return p.es_interes !== true;
    } else {
      return p.es_interes === true;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        
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
          <Button onClick={() => handleAbrirModal()} size="lg" className="w-full sm:w-auto rounded-2xl font-bold shadow-md h-12 bg-primary hover:bg-primary/90 text-white">
            <Plus className="mr-2 h-5 w-5" />
            {tabActiva === 'interes' ? 'Nueva Cotización / Interés' : 'Nuevo Producto'}
          </Button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border/50 mb-6 gap-6">
          <button
            onClick={() => setTabActiva('catalogo')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
              tabActiva === 'catalogo'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Catálogo Activo ({productos.filter(p => p.es_interes !== true).length})
          </button>
          
          <button
            onClick={() => setTabActiva('interes')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 relative ${
              tabActiva === 'interes'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lista de Interés / Cotizaciones ({productos.filter(p => p.es_interes === true).length})
          </button>
        </div>

        {/* Grid of Products */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {productosFiltrados.map((producto) => {
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
                      {!producto.es_interes && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                          <span className="text-muted-foreground">Precio de Venta:</span>
                          <span className="font-bold text-foreground text-sm">{formatCLPCurrency(producto.precio)}</span>
                        </div>
                      )}
                      
                      {!producto.es_interes && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                          <span className="text-muted-foreground">Impuesto:</span>
                          <span className={`font-bold ${producto.facturable !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {producto.facturable !== false ? 'Afecto a IVA (19%)' : 'Exento (Sin IVA)'}
                          </span>
                        </div>
                      )}
                      
                      {producto.precio_caja && producto.precio_caja > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                          <span className="text-muted-foreground">Precio {producto.tipo_empaque || 'Caja'}:</span>
                          <span className="font-bold text-indigo-500 text-sm">{formatCLPCurrency(producto.precio_caja)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-2.5">
                        <span className="text-muted-foreground">{producto.es_interes ? 'Costo Cotizado:' : 'Costo Compra:'}</span>
                        <span className="font-semibold text-foreground">
                          {producto.costo_actual ? `${formatCLPCurrency(producto.costo_actual)}/${producto.unidad}` : 'Sin registrar'}
                        </span>
                      </div>

                      {!producto.es_interes ? (
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
                      ) : (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-2.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Estado:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">COTIZACIÓN</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-6 pb-6 pt-0">
                  <Button
                    onClick={() => handleAbrirModalCompra(producto)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-11 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Comprar / Abastecer {producto.tipo_empaque || 'Caja'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-[2rem] bg-card/30">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-bold mb-1">
              {tabActiva === 'interes' ? 'No hay Cotizaciones' : 'Catálogo Vacío'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {tabActiva === 'interes' 
                ? 'Agrega productos en lista de interés para cotizar y comprar más adelante.' 
                : 'Comienza agregando productos a tu catálogo activo.'}
            </p>
            <Button onClick={() => handleAbrirModal()} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              {tabActiva === 'interes' ? 'Nueva Cotización' : 'Crear Producto'}
            </Button>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
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
                  onChange={(e) => setFormData({ ...formData, es_interes: e.target.checked })}
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
                onChange={(e) => setFormData({ ...formData, facturable: e.target.checked })}
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
                    onChange={(e) => setFormData({ ...formData, precio: normalizeMoneyInput(e.target.value) })}
                    onBlur={() => setFormData((current) => ({ ...current, precio: current.precio ? formatCLPCurrency(parseChileanMoneyInput(current.precio)) : '' }))}
                    onFocus={() => setFormData((current) => ({ ...current, precio: normalizeMoneyInput(current.precio) }))}
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
                  onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, tipo_empaque: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, precio_caja: normalizeMoneyInput(e.target.value) })}
                    onBlur={() => setFormData((current) => ({ ...current, precio_caja: current.precio_caja ? formatCLPCurrency(parseChileanMoneyInput(current.precio_caja)) : '' }))}
                    onFocus={() => setFormData((current) => ({ ...current, precio_caja: normalizeMoneyInput(current.precio_caja) }))}
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
                  onClick={() => setFormData({ ...formData, unidad: 'kg' })}
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
                  onClick={() => setFormData({ ...formData, unidad: 'unid' })}
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
                  onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
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
                editando ? 'Actualizar' : (formData.es_interes ? 'Registrar Cotización' : 'Crear Producto')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPRAR / ABASTECER MODAL */}
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

          {productoCompra && (() => {
            const empaqueLabel = productoCompra.tipo_empaque || 'Caja';
            return (
              <div className="space-y-4 py-3">
                <div className="rounded-xl bg-muted/30 p-3.5 border border-border/40 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{productoCompra.nombre}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                      Unidad: {productoCompra.unidad === 'kg' ? 'Kilo' : 'Unidad'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-bold text-xs h-7 px-2.5">
                    Stock actual: {productoCompra.stock_actual.toFixed(2)}
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
                        onChange={(e) => setCompraData({ ...compraData, precio_venta_unidad: normalizeMoneyInput(e.target.value) })}
                        onBlur={() => setCompraData(c => ({ ...c, precio_venta_unidad: c.precio_venta_unidad ? formatCLPCurrency(parseChileanMoneyInput(c.precio_venta_unidad)) : '' }))}
                        onFocus={() => setCompraData(c => ({ ...c, precio_venta_unidad: normalizeMoneyInput(c.precio_venta_unidad) }))}
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
                        onChange={(e) => setCompraData({ ...compraData, precio_venta_caja: normalizeMoneyInput(e.target.value) })}
                        onBlur={() => setCompraData(c => ({ ...c, precio_venta_caja: c.precio_venta_caja ? formatCLPCurrency(parseChileanMoneyInput(c.precio_venta_caja)) : '' }))}
                        onFocus={() => setCompraData(c => ({ ...c, precio_venta_caja: normalizeMoneyInput(c.precio_venta_caja) }))}
                        className="pl-6 h-10 rounded-xl text-[16px] md:text-xs font-bold border-purple-500/20 bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Equivalency note */}
                {parseFloat(compraData.cajas_compradas) > 0 && parseFloat(compraData.cantidad_por_caja) > 0 && parseFloat(compraData.costo_caja) > 0 && (
                  <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        Stock ingresado:
                      </span>
                      <span>{(parseFloat(compraData.cajas_compradas) * parseFloat(compraData.cantidad_por_caja)).toFixed(2)} {productoCompra.unidad}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        Costo por {productoCompra.unidad === 'kg' ? 'kg' : 'unidad'}:
                      </span>
                      <span>{formatCLPCurrency(Math.round(parseFloat(compraData.costo_caja) / parseFloat(compraData.cantidad_por_caja)))}/{productoCompra.unidad}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-indigo-500/15">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        Total compra ({compraData.cajas_compradas} {productoCompra.tipo_empaque || 'caja'}s):
                      </span>
                      <span>{formatCLPCurrency(Math.round(parseFloat(compraData.cajas_compradas) * parseFloat(compraData.costo_caja)))}</span>
                    </div>
                  </div>
                )}

                {/* Document details & Receipt Image Upload */}
                <div className="p-3.5 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 space-y-3">
                  <h5 className="text-xs font-black text-foreground uppercase tracking-wider">Detalles del Documento de Compra</h5>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="compra_tipo_doc" className="text-xs font-bold text-foreground">Tipo de Comprobante</Label>
                      <select
                        id="compra_tipo_doc"
                        value={compraData.tipo_documento}
                        onChange={(e) => setCompraData({ ...compraData, tipo_documento: e.target.value as any })}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm border-border/70 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="boleta">Boleta / Recibo Informal</option>
                        <option value="factura">Factura (Con IVA Crédito 19%)</option>
                        <option value="recibo">Recibo / Ticket</option>
                        <option value="guia">Guía de Despacho</option>
                        <option value="otro">Otro Documento</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="compra_num_doc" className="text-xs font-bold text-foreground">Número de Folio / Documento</Label>
                      <Input
                        id="compra_num_doc"
                        placeholder="Ej: 4829"
                        value={compraData.numero_documento}
                        onChange={(e) => setCompraData({ ...compraData, numero_documento: e.target.value })}
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
                        onChange={(e) => setCompraData({ ...compraData, proveedor_nombre: e.target.value })}
                        className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="compra_proveedor_rut" className="text-xs font-bold text-foreground">RUT Proveedor</Label>
                      <Input
                        id="compra_proveedor_rut"
                        placeholder="Ej: 76.123.456-7"
                        value={compraData.proveedor_rut}
                        onChange={(e) => setCompraData({ ...compraData, proveedor_rut: e.target.value })}
                        className="rounded-xl h-11 text-[16px] md:text-sm font-semibold border-border/70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="compra_fecha" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Fecha de la Compra
                      </Label>
                      <Input
                        id="compra_fecha"
                        type="date"
                        value={compraData.fecha}
                        onChange={(e) => setCompraData({ ...compraData, fecha: e.target.value })}
                        className="h-11 rounded-xl text-[16px] md:text-sm font-semibold border-border/70"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="compra_metodo_pago" className="text-xs font-bold text-foreground">Método de Pago</Label>
                      <select
                        id="compra_metodo_pago"
                        value={compraData.metodo_pago}
                        onChange={(e) => setCompraData({ ...compraData, metodo_pago: e.target.value as any })}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm border-border/70 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia / Tarjeta</option>
                        <option value="credito">Fiado / Crédito Proveedor</option>
                      </select>
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
                          onClick={handleRemoveCompraImage}
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
            );
          })()}

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
              onClick={handleGuardarCompra}
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

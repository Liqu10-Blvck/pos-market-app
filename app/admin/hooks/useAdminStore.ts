import { create } from 'zustand';
import { Producto, UnidadMedida } from '../../../lib/types/pos';
import { ProductosService } from '../../../lib/services/productos.service';
import { AIService } from '../../../lib/services/ai.service';
import { ContabilidadService } from '../../../lib/services/contabilidad.service';
import { 
  formatCLPCurrency, 
  normalizeMoneyInput, 
  parseChileanMoneyInput, 
  roundToChileanDecena, 
  compressImage 
} from '../../../lib/utils';

export interface LocalImage {
  file: File | null;
  url: string;
}

interface FormDataState {
  nombre: string;
  costo: string;
  margen: string;
  precio: string;
  unidad: UnidadMedida;
  stock_actual: string;
  sku: string;
  fecha_caducidad: string;
  es_interes: boolean;
  cantidad_por_caja: string;
  costo_caja: string;
  precio_caja: string;
  tipo_empaque: string;
  categoria: string;
  calidad: string;
  facturable: boolean;
}

interface CompraDataState {
  cantidad_por_caja: string;
  cajas_compradas: string;
  costo_caja: string;
  margen_deseado: string;
  precio_venta_unidad: string;
  margen_caja: string;
  precio_venta_caja: string;
  tipo_documento: 'boleta' | 'factura' | 'recibo' | 'guia' | 'otro';
  numero_documento: string;
  proveedor_rut: string;
  proveedor_nombre: string;
  fecha: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'credito';
}

interface AdminState {
  tabActiva: 'catalogo' | 'interes';
  modalOpen: boolean;
  modalCompraOpen: boolean;
  editando: Producto | null;
  productoCompra: Producto | null;
  guardando: boolean;
  analizandoIA: boolean;
  
  formData: FormDataState;
  compraData: CompraDataState;
  localImages: LocalImage[];
  compraImagen: LocalImage | null;

  // Setters
  setTabActiva: (tab: 'catalogo' | 'interes') => void;
  setModalOpen: (open: boolean) => void;
  setModalCompraOpen: (open: boolean) => void;
  setFormData: (data: Partial<FormDataState>) => void;
  setCompraData: (data: Partial<CompraDataState>) => void;

  // Actions
  handleAbrirModal: (producto?: Producto) => void;
  handleAbrirModalCompra: (producto: Producto) => void;
  
  // Form updates with calculations
  handleCostoChange: (val: string) => void;
  handleCostoCajaChange: (val: string) => void;
  handleCantidadCajaChange: (val: string) => void;
  handleMargenChange: (val: string) => void;
  handlePrecioChange: (val: string) => void;
  handleCompraCajaChange: (field: keyof CompraDataState, val: string) => void;

  // Images
  addLocalImages: (files: LocalImage[]) => void;
  removeLocalImage: (index: number) => void;
  setCompraImage: (file: File | null, url: string) => void;
  removeCompraImage: () => void;

  // Server integrations
  handleAutocompletarIA: (toast: any) => Promise<void>;
  handleGuardar: (toast: any) => Promise<boolean>;
  handleGuardarCompra: (toast: any) => Promise<boolean>;
}

const initialFormData = (tabActiva: 'catalogo' | 'interes' = 'catalogo'): FormDataState => ({
  nombre: '',
  costo: '',
  margen: '30',
  precio: '',
  unidad: 'kg',
  stock_actual: '',
  sku: '',
  fecha_caducidad: '',
  es_interes: tabActiva === 'interes',
  cantidad_por_caja: '',
  costo_caja: '',
  precio_caja: '',
  tipo_empaque: '',
  categoria: 'otros',
  calidad: '',
  facturable: true,
});

const initialCompraData = (producto: Producto | null = null): CompraDataState => {
  const cantCaja = producto?.cantidad_por_caja || 12;
  const sugeridoUnidad = producto?.precio || 0;
  
  return {
    cantidad_por_caja: cantCaja.toString(),
    cajas_compradas: '1',
    costo_caja: '',
    margen_deseado: producto?.margen_deseado ? producto.margen_deseado.toString() : '30',
    precio_venta_unidad: sugeridoUnidad > 0 ? formatCLPCurrency(sugeridoUnidad) : '',
    margen_caja: '30',
    precio_venta_caja: '',
    tipo_documento: 'boleta',
    numero_documento: '',
    proveedor_rut: '',
    proveedor_nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'efectivo',
  };
};

export const useAdminStore = create<AdminState>((set, get) => ({
  tabActiva: 'catalogo',
  modalOpen: false,
  modalCompraOpen: false,
  editando: null,
  productoCompra: null,
  guardando: false,
  analizandoIA: false,
  
  formData: initialFormData(),
  compraData: initialCompraData(),
  localImages: [],
  compraImagen: null,

  setTabActiva: (tabActiva) => set({ tabActiva }),
  setModalOpen: (modalOpen) => set({ modalOpen }),
  setModalCompraOpen: (modalCompraOpen) => set({ modalCompraOpen }),
  setFormData: (fields) => set((state) => ({ formData: { ...state.formData, ...fields } })),
  setCompraData: (fields) => set((state) => ({ compraData: { ...state.compraData, ...fields } })),

  handleAbrirModal: (producto) => {
    if (producto) {
      const costoCaja = (producto.costo_actual !== undefined && producto.costo_actual !== null && producto.cantidad_por_caja)
        ? Math.round(producto.costo_actual * producto.cantidad_por_caja).toString()
        : '';
        
      set({
        editando: producto,
        formData: {
          nombre: producto.nombre,
          costo: (producto.costo_actual !== undefined && producto.costo_actual !== null) ? producto.costo_actual.toString() : '',
          margen: (producto.margen_deseado !== undefined && producto.margen_deseado !== null) ? producto.margen_deseado.toString() : '30',
          precio: producto.precio ? formatCLPCurrency(producto.precio) : '',
          unidad: producto.unidad,
          stock_actual: producto.stock_actual.toString(),
          sku: producto.sku || '',
          fecha_caducidad: producto.fecha_caducidad || '',
          es_interes: producto.es_interes || false,
          cantidad_por_caja: (producto.cantidad_por_caja !== undefined && producto.cantidad_por_caja !== null) ? producto.cantidad_por_caja.toString() : '',
          costo_caja: costoCaja,
          precio_caja: producto.precio_caja ? formatCLPCurrency(producto.precio_caja) : '',
          tipo_empaque: producto.tipo_empaque || '',
          categoria: producto.categoria || 'otros',
          calidad: producto.calidad || '',
          facturable: producto.facturable !== false,
        },
        localImages: producto.imagen_url ? [{ file: null, url: producto.imagen_url }] : [],
        modalOpen: true,
      });
    } else {
      set({
        editando: null,
        formData: initialFormData(get().tabActiva),
        localImages: [],
        modalOpen: true,
      });
    }
  },

  handleAbrirModalCompra: (producto) => {
    set({
      productoCompra: producto,
      compraData: initialCompraData(producto),
      compraImagen: null,
      modalCompraOpen: true,
    });
  },

  handleCostoChange: (val) => {
    const cleanVal = normalizeMoneyInput(val);
    const costoNum = parseFloat(cleanVal) || 0;
    const margenNum = parseFloat(get().formData.margen) || 0;
    const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));
    
    set((state) => {
      const nextForm = {
        ...state.formData,
        costo: cleanVal,
        precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '',
      };
      
      const cantCaja = parseFloat(nextForm.cantidad_por_caja) || 0;
      if (cantCaja > 0) {
        nextForm.costo_caja = Math.round(costoNum * cantCaja).toString();
      }
      return { formData: nextForm };
    });
  },

  handleCostoCajaChange: (val) => {
    const cleanVal = normalizeMoneyInput(val);
    const costCajaNum = parseFloat(cleanVal) || 0;
    const cantCaja = parseFloat(get().formData.cantidad_por_caja) || 0;
    const margenNum = parseFloat(get().formData.margen) || 0;
    
    set((state) => {
      const nextForm = {
        ...state.formData,
        costo_caja: cleanVal,
      };
      
      if (cantCaja > 0) {
        const costoNum = costCajaNum / cantCaja;
        nextForm.costo = costoNum > 0 ? Math.round(costoNum).toString() : '';
        const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));
        nextForm.precio = precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '';
      }
      return { formData: nextForm };
    });
  },

  handleCantidadCajaChange: (val) => {
    const cantCaja = parseFloat(val) || 0;
    set((state) => {
      const nextForm = {
        ...state.formData,
        cantidad_por_caja: val,
      };
      
      const costoNum = parseFloat(nextForm.costo) || 0;
      const costCajaNum = parseFloat(nextForm.costo_caja) || 0;
      const margenNum = parseFloat(nextForm.margen) || 0;
      
      if (costoNum > 0 && cantCaja > 0) {
        nextForm.costo_caja = Math.round(costoNum * cantCaja).toString();
      } else if (costCajaNum > 0 && cantCaja > 0) {
        const calculatedCosto = costCajaNum / cantCaja;
        nextForm.costo = calculatedCosto > 0 ? Math.round(calculatedCosto).toString() : '';
        const precioSugerido = roundToChileanDecena(Math.round(calculatedCosto * (1 + margenNum / 100)));
        nextForm.precio = precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '';
      }
      return { formData: nextForm };
    });
  },

  handleMargenChange: (val) => {
    const margenNum = parseFloat(val) || 0;
    const costoNum = parseFloat(get().formData.costo) || 0;
    const precioSugerido = roundToChileanDecena(Math.round(costoNum * (1 + margenNum / 100)));

    set((state) => {
      const nextForm = {
        ...state.formData,
        margen: val,
        precio: precioSugerido > 0 ? formatCLPCurrency(precioSugerido) : '',
      };
      const costCaja = parseFloat(nextForm.costo_caja) || 0;
      if (costCaja > 0) {
        const precioCajaSugerido = roundToChileanDecena(Math.round(costCaja * (1 + margenNum / 100)));
        nextForm.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
      }
      return { formData: nextForm };
    });
  },

  handlePrecioChange: (val) => {
    const cleanVal = normalizeMoneyInput(val);
    const precioNum = parseChileanMoneyInput(cleanVal);
    const costoNum = parseFloat(get().formData.costo) || 0;

    set((state) => {
      const nextForm = {
        ...state.formData,
        precio: cleanVal,
      };

      if (costoNum > 0) {
        const calculatedMargin = Math.round(((precioNum - costoNum) / costoNum) * 100);
        nextForm.margen = calculatedMargin.toString();
      }
      return { formData: nextForm };
    });
  },

  handleCompraCajaChange: (field, val) => {
    set((state) => {
      const updated = { ...state.compraData, [field]: val };
      
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
      
      return { compraData: updated };
    });
  },

  addLocalImages: (newImages) => {
    set((state) => ({
      localImages: [...state.localImages, ...newImages],
    }));
  },

  removeLocalImage: (idx) => {
    set((state) => ({
      localImages: state.localImages.filter((_, i) => i !== idx),
    }));
  },

  setCompraImage: (file, url) => {
    set({ compraImagen: { file, url } });
  },

  removeCompraImage: () => {
    set({ compraImagen: null });
  },

  handleAutocompletarIA: async (toast) => {
    const base64List = get().localImages
      .map(img => img.url)
      .filter(url => url.startsWith('data:'));

    if (base64List.length === 0) {
      toast({
        title: 'Imagen requerida',
        description: 'Toma o carga al menos una foto nueva para analizar con Gemini.',
        variant: 'destructive',
      });
      return;
    }

    set({ analizandoIA: true });
    try {
      const data = await AIService.analizarProductoConGemini(base64List);
      
      set((state) => {
        const next = { ...state.formData };
        if (data.nombre) next.nombre = data.nombre;
        if (data.sku) next.sku = data.sku;
        if (data.fecha_caducidad) next.fecha_caducidad = data.fecha_caducidad;
        if (data.tipo_empaque) next.tipo_empaque = data.tipo_empaque;
        if (data.cantidad_por_caja) next.cantidad_por_caja = data.cantidad_por_caja.toString();
        
        if (data.costo_unitario) {
          next.costo = data.costo_unitario.toString();
          const costoNum = data.costo_unitario || 0;
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
          const costCaja = data.costo_caja || 0;
          const margenNum = parseFloat(next.margen) || 30;
          const precioCajaSugerido = roundToChileanDecena(Math.round(costCaja * (1 + margenNum / 100)));
          next.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
        } else if (data.costo_unitario && data.cantidad_por_caja) {
          const calculatedCostoCaja = (data.costo_unitario || 0) * (data.cantidad_por_caja || 0);
          const margenNum = parseFloat(next.margen) || 30;
          const precioCajaSugerido = roundToChileanDecena(Math.round(calculatedCostoCaja * (1 + margenNum / 100)));
          next.precio_caja = precioCajaSugerido > 0 ? formatCLPCurrency(precioCajaSugerido) : '';
        }
        
        return { formData: next };
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
        variant: 'destructive',
      });
    } finally {
      set({ analizandoIA: false });
    }
  },

  handleGuardar: async (toast) => {
    const { formData, editando, localImages } = get();
    
    if (!formData.nombre || (!formData.es_interes && (!formData.precio || !formData.stock_actual))) {
      toast({
        title: 'Campos incompletos',
        description: formData.es_interes 
          ? 'El nombre del producto es requerido para clasificarlo como Interés.'
          : 'El nombre, precio (venta) y stock son requeridos.',
        variant: 'destructive',
      });
      return false;
    }

    set({ guardando: true });
    try {
      const isNew = !editando;
      const parsedPrecio = formData.precio ? parseChileanMoneyInput(formData.precio) : 0;
      const parsedStock = parseFloat(formData.stock_actual) || 0;
      const parsedCosto = formData.costo ? parseFloat(formData.costo) : undefined;
      const parsedMargen = formData.margen ? parseFloat(formData.margen) : undefined;
      const parsedCantidadCaja = formData.cantidad_por_caja ? parseFloat(formData.cantidad_por_caja) : undefined;
      const parsedPrecioCaja = formData.precio_caja ? parseChileanMoneyInput(formData.precio_caja) : undefined;

      const imageFile = localImages[0]?.file || null;
      const removedImage = localImages.length === 0;

      await ProductosService.guardarProducto(
        editando?.id,
        {
          nombre: formData.nombre,
          precio: parsedPrecio,
          unidad: formData.unidad,
          stock_actual: parsedStock,
          sku: formData.sku,
          fecha_caducidad: formData.fecha_caducidad,
          costo_actual: parsedCosto,
          margen_deseado: parsedMargen,
          es_interes: formData.es_interes,
          cantidad_por_caja: parsedCantidadCaja,
          precio_caja: parsedPrecioCaja,
          tipo_empaque: formData.tipo_empaque,
          categoria: formData.categoria,
          calidad: formData.calidad || undefined,
          facturable: formData.facturable,
          imagen_url: editando?.imagen_url || null,
        },
        imageFile,
        removedImage
      );

      toast({ 
        title: isNew 
          ? (formData.es_interes ? 'Producto de Interés creado' : 'Producto creado') 
          : 'Producto actualizado' 
      });
      
      set({ modalOpen: false });
      return true;
    } catch (error: any) {
      console.error('Error al guardar:', error);
      toast({
        title: 'Error al guardar',
        description: error.message || 'Error desconocido al guardar.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardando: false });
    }
  },

  handleGuardarCompra: async (toast) => {
    const { productoCompra, compraData, compraImagen } = get();
    if (!productoCompra) return false;
    
    const cantCaja = parseFloat(compraData.cantidad_por_caja) || 0;
    const cajasCompradas = parseFloat(compraData.cajas_compradas) || 0;
    const costCaja = parseFloat(compraData.costo_caja) || 0;
    
    const empaqueLabel = productoCompra.tipo_empaque || 'Caja';
    if (cantCaja <= 0 || cajasCompradas <= 0 || costCaja <= 0) {
      toast({
        title: 'Valores inválidos',
        description: `La cantidad por ${empaqueLabel.toLowerCase()}, ${empaqueLabel.toLowerCase()}s recibidos y costo por ${empaqueLabel.toLowerCase()} deben ser mayores a 0.`,
        variant: 'destructive',
      });
      return false;
    }

    set({ guardando: true });
    try {
      let finalInvoiceUrl = '';
      if (compraImagen && compraImagen.file) {
        const { uploadImage } = await import('../../../lib/firebase/storage');
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
        imagenFacturaUrl: finalInvoiceUrl || undefined,
      });

      toast({
        title: 'Compra registrada',
        description: `Ingresados ${productoCompra.unidad === 'kg' ? stockAIngresar.toFixed(2) : Math.round(stockAIngresar)} ${productoCompra.unidad} al inventario.`,
      });
      
      set({ modalCompraOpen: false });
      return true;
    } catch (err: any) {
      console.error('Error al registrar compra:', err);
      toast({
        title: 'Error al registrar compra',
        description: err.message || 'Error desconocido al registrar la compra.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardando: false });
    }
  },
}));

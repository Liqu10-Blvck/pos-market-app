'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Edit, Package, Scale, Hash, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    unidad: 'kg' as 'kg' | 'unid',
    stock_actual: '',
    variedades: '',
    calibres: '',
    costo_referencia: '',
  });
  const { toast } = useToast();

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
        unidad: producto.unidad as 'kg' | 'unid',
        stock_actual: producto.stock_actual.toString(),
        variedades: (producto.variedades || []).join(', '),
        calibres: (producto.calibres || []).join(', '),
        costo_referencia: producto.costo_referencia ? formatCLPCurrency(producto.costo_referencia) : '',
      });
    } else {
      setEditando(null);
      setFormData({ 
        nombre: '', 
        precio: '', 
        unidad: 'kg', 
        stock_actual: '',
        variedades: '',
        calibres: '',
        costo_referencia: ''
      });
    }
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.precio || !formData.stock_actual) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    try {
      const productoData = {
        nombre: formData.nombre,
        precio: parseChileanMoneyInput(formData.precio),
        unidad: formData.unidad,
        stock_actual: parseFloat(formData.stock_actual),
        variedades: formData.variedades.split(',').map(v => v.trim()).filter(v => v !== ''),
        calibres: formData.calibres.split(',').map(c => c.trim()).filter(c => c !== ''),
        costo_referencia: formData.costo_referencia ? parseChileanMoneyInput(formData.costo_referencia) : null,
        activo: true,
        updatedAt: Timestamp.now()
      };

      if (editando) {
        await updateDoc(doc(db, 'productos', editando.id), productoData);
        toast({ title: 'Producto actualizado' });
      } else {
        await addDoc(collection(db, 'productos'), {
          ...productoData,
          createdAt: Timestamp.now()
        });
        toast({ title: 'Producto creado' });
      }

      setModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Package className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
              Administración de Productos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Gestiona el inventario y precios
            </p>
          </div>
          <Button onClick={() => handleAbrirModal()} size="lg" className="w-full sm:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Producto
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {productos.map((producto) => (
            <Card key={producto.id} className="rounded-2xl border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate pr-2 text-lg sm:text-xl">{producto.nombre}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAbrirModal(producto)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary uppercase tracking-tighter">
                    {producto.unidad === 'kg' ? 'Venta por peso' : 'Venta por unidad'}
                  </span>
                  {producto.variedades && producto.variedades.length > 0 && (
                    <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[10px] font-black uppercase">
                      {producto.variedades.length} Variedades
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm sm:text-base mb-4">
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3 border border-border/40">
                    <span className="text-muted-foreground text-xs uppercase font-bold opacity-60">Precio Sugerido</span>
                    <span className="font-black text-foreground">{formatCLPCurrency(producto.precio)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3 border border-border/40">
                    <span className="text-muted-foreground text-xs uppercase font-bold opacity-60">Stock Catálogo</span>
                    <span className={`font-black ${
                      producto.stock_actual < 10 ? 'text-red-500' :
                      producto.stock_actual < 30 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {producto.stock_actual} {producto.unidad === 'kg' ? 'kg' : 'unid'}
                    </span>
                  </div>
                </div>

                {(producto.calibres && producto.calibres.length > 0) && (
                  <div className="pt-3 border-t border-border/40">
                    <span className="text-[10px] font-black text-muted-foreground uppercase mb-2 block opacity-40">Calibres Disponibles</span>
                    <div className="flex flex-wrap gap-1">
                      {producto.calibres.slice(0, 5).map((c, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-bold py-0 h-4 border-muted-foreground/20">
                          {c}
                        </Badge>
                      ))}
                      {producto.calibres.length > 5 && <span className="text-[9px] text-muted-foreground font-black">+{producto.calibres.length - 5}</span>}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-border/40 grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-10 font-bold border-primary/20 hover:bg-primary/5 text-primary"
                    asChild
                  >
                    <Link href={`/logistica/ingreso?productoId=${producto.id}`}>
                      <Truck className="h-4 w-4 mr-2" />
                      Ingresar
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl h-10 font-bold"
                    onClick={() => handleAbrirModal(producto)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {productos.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
            <p className="text-muted-foreground mb-4">
              Comienza agregando tu primer producto
            </p>
            <Button onClick={() => handleAbrirModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Producto
            </Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editando ? 'Modifica los detalles del producto seleccionado.' : 'Completa la información para agregar un nuevo producto al catálogo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary opacity-60">Datos Básicos</h3>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Palta Hass"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio de Venta sugerido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="precio"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: normalizeMoneyInput(e.target.value) })}
                      className="pl-7 h-11 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costo">Costo de Referencia</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="costo"
                      value={formData.costo_referencia}
                      onChange={(e) => setFormData({ ...formData, costo_referencia: normalizeMoneyInput(e.target.value) })}
                      className="pl-7 h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary opacity-60">Configuración Mayorista</h3>
              
              <div className="space-y-2">
                <Label htmlFor="variedades">Variedades (Separadas por coma)</Label>
                <Input
                  id="variedades"
                  value={formData.variedades}
                  onChange={(e) => setFormData({ ...formData, variedades: e.target.value })}
                  placeholder="Hass, Edranol, Ester..."
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calibres">Calibres disponibles (Separados por coma)</Label>
                <Input
                  id="calibres"
                  value={formData.calibres}
                  onChange={(e) => setFormData({ ...formData, calibres: e.target.value })}
                  placeholder="Extra, 1ra, 18, 20..."
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-3">
                <Label>Tipo de Venta</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unidad: 'kg' })}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                      formData.unidad === 'kg' ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                    }`}
                  >
                    <Scale className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase">Por Peso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unidad: 'unid' })}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                      formData.unidad === 'unid' ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                    }`}
                  >
                    <Hash className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase">Por Unidad</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Actual Inicial</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row bg-muted/10 -mx-6 -mb-6 p-6">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl h-12 flex-1">
              Cancelar
            </Button>
            <Button onClick={handleGuardar} className="rounded-xl h-12 flex-1 font-bold">
              {editando ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

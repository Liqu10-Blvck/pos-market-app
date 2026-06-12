'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto, UnidadMedida } from '@/lib/types/pos';
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
    unidad: 'kg' as UnidadMedida,
    unidades_permitidas: ['kg'] as UnidadMedida[],
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
        precio: producto.precio.toString(),
        unidad: producto.unidad,
        unidades_permitidas: producto.unidades_permitidas || [producto.unidad],
        costo_referencia: (producto.costo_referencia || 0).toString(),
      });
    } else {
      setEditando(null);
      setFormData({
        nombre: '',
        precio: '',
        unidad: 'kg',
        unidades_permitidas: ['kg'],
        costo_referencia: '',
      });
    }
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.precio) {
      toast({
        title: 'Campos incompletos',
        description: 'El nombre y precio son obligatorios',
        variant: 'destructive'
      });
      return;
    }

    try {
      const productoData = {
        nombre: formData.nombre,
        precio: parseChileanMoneyInput(formData.precio),
        unidad: formData.unidad,
        unidades_permitidas: formData.unidades_permitidas,
        stock_actual: editando ? editando.stock_actual : 0,
        activo: true,
        costo_referencia: parseChileanMoneyInput(formData.costo_referencia),
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
    <div className="w-full pb-20">
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl -mx-4 -mt-6 sm:-mx-8 sm:-mt-6 mb-8">
        <div className="w-full px-4 py-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-primary tracking-tight sm:text-4xl uppercase">PRODUCTOS <span className="text-foreground/20">&</span> CATÁLOGO</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1 opacity-70">
                Maestro de artículos y control de precios masivos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setModalOpen(true)} className="h-12 rounded-2xl gap-2 font-bold px-6 shadow-soft">
                <Plus className="h-5 w-5" /> Nuevo Producto
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full">
        <div className="mb-8 flex flex-col md:flex-row gap-4">
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
                </div>

                <div className="space-y-3 text-sm sm:text-base mb-4">
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3 border border-border/40">
                    <span className="text-muted-foreground text-xs uppercase font-bold opacity-60">Precio Sugerido</span>
                    <span className="font-black text-foreground">{formatCLPCurrency(producto.precio)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3 border border-border/40">
                    <span className="text-muted-foreground text-xs uppercase font-bold opacity-60">Stock Total (Lotes)</span>
                    <div className="text-right flex flex-col items-end">
                      <span className={`font-black ${
                        (producto.unidad === 'kg' ? producto.stock_actual : (producto.stock_cajas || 0)) < 10 ? 'text-red-500' :
                        (producto.unidad === 'kg' ? producto.stock_actual : (producto.stock_cajas || 0)) < 30 ? 'text-yellow-500' :
                          'text-green-500'
                      }`}>
                        {producto.unidad === 'kg'
                          ? `${producto.stock_actual.toFixed(1)} kg`
                          : `${producto.stock_cajas || 0} cajas`}
                      </span>
                      {producto.unidad === 'kg' && (
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">
                          {producto.stock_cajas || 0} CAJAS
                        </span>
                      )}
                      {producto.unidad !== 'kg' && producto.stock_actual > 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground opacity-60">
                          {producto.stock_actual.toFixed(1)} KG
                        </span>
                      )}
                    </div>
                  </div>
                </div>

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
              <h3 className="text-xs font-black uppercase tracking-widest text-primary opacity-60">Configuración de Venta</h3>

              <div className="space-y-3">
                <Label>Tipo de Venta (Puedes seleccionar varios)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'kg', label: 'Por Peso (KG)', icon: Scale },
                    { id: 'unid', label: 'Por Unidad', icon: Hash },
                    { id: 'caja', label: 'Por Caja', icon: Package },
                  ].map((unit) => {
                    const isSelected = formData.unidades_permitidas.includes(unit.id as UnidadMedida);
                    const isPrimary = formData.unidad === unit.id;
                    const Icon = unit.icon;

                    return (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          let nuevas = [...formData.unidades_permitidas];
                          if (isSelected) {
                            if (nuevas.length > 1) {
                              nuevas = nuevas.filter(u => u !== unit.id);
                              // Si quitamos la primaria, poner otra como primaria
                              if (isPrimary) {
                                setFormData({ ...formData, unidades_permitidas: nuevas, unidad: nuevas[0] });
                              } else {
                                setFormData({ ...formData, unidades_permitidas: nuevas });
                              }
                            }
                          } else {
                            nuevas.push(unit.id as UnidadMedida);
                            setFormData({ ...formData, unidades_permitidas: nuevas });
                          }
                        }}
                        onDoubleClick={() => {
                          // Doble click para marcar como principal
                          if (isSelected) {
                            setFormData({ ...formData, unidad: unit.id as UnidadMedida });
                          }
                        }}
                        className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                          } ${isPrimary ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase">{unit.label}</span>
                        {isPrimary && (
                          <span className="absolute -top-2 -right-2 bg-primary text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase">Principal</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                  * Doble click para marcar una unidad como **Principal** por defecto al ingresar.
                </p>
              </div>
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

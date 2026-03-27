'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto, Lote, LoteCalibre } from '@/lib/types/pos';
import { TIPOS_ENVASES } from '@/lib/constants/envases';
import { LoteService } from '@/lib/services/lote.service';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Box, Package, Plus, Trash2, Printer, Save, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IngresoMercaderiaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [variedad, setVariedad] = useState<string>('');
  const [origen, setOrigen] = useState<'nacional' | 'internacional'>('nacional');
  const [tipoBulto, setTipoBulto] = useState<'pallet' | 'bin'>('pallet');
  const [envaseId, setEnvaseId] = useState<string>('');
  const [pesoTotal, setPesoTotal] = useState<string>('');
  const [costoUnidad, setCostoUnidad] = useState<string>('');
  const [precioSugerido, setPrecioSugerido] = useState<string>('');
  const [cantidadBultos, setCantidadBultos] = useState<number>(1);
  
  const [calibres, setCalibres] = useState<LoteCalibre[]>([]);
  const [nuevoCalibre, setNuevoCalibre] = useState<string>('');
  const [nuevaCantidadCajas, setNuevaCantidadCajas] = useState<string>('');
  
  const [procesando, setProcesando] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialProductoId = searchParams?.get('productoId');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Producto[];
      setProductos(prods);
      
      if (initialProductoId && prods.length > 0) {
        setProductoSeleccionado(initialProductoId);
      }
    });
    return () => unsub();
  }, [initialProductoId]);

  useEffect(() => {
    const prod = productos.find(p => p.id === productoSeleccionado);
    if (prod) {
      if (!variedad) setVariedad((prod.variedades || [])[0] || '');
      if (calibres.length === 0 && prod.calibres) {
        setCalibres(prod.calibres.map(c => ({ calibre: c, cantidad_cajas: 0 })));
      }
      if (prod.precio && !precioSugerido) setPrecioSugerido(prod.precio.toString());
    }
  }, [productoSeleccionado, productos]);

  const agregarCalibre = () => {
    if (!nuevoCalibre || !nuevaCantidadCajas) return;
    setCalibres([...calibres, { calibre: nuevoCalibre, cantidad_cajas: parseInt(nuevaCantidadCajas) }]);
    setNuevoCalibre('');
    setNuevaCantidadCajas('');
  };

  const actualizarCantidadCalibre = (index: number, cantidad: string) => {
    const newCalibres = [...calibres];
    newCalibres[index].cantidad_cajas = parseInt(cantidad) || 0;
    setCalibres(newCalibres);
  };

  const eliminarCalibre = (index: number) => {
    setCalibres(calibres.filter((_, i) => i !== index));
  };

  const totalCajas = calibres.reduce((sum, c) => sum + c.cantidad_cajas, 0);

  const handleGuardar = async () => {
    if (!productoSeleccionado || !variedad || !pesoTotal || !precioSugerido) {
      toast({ title: 'Error', description: 'Completa todos los campos obligatorios', variant: 'destructive' });
      return;
    }

    setProcesando(true);
    try {
      const prod = productos.find(p => p.id === productoSeleccionado);
      
      // Registrar "n" lotes idénticos (Masivo)
      for (let i = 0; i < cantidadBultos; i++) {
        await LoteService.registrarLote({
          producto_id: productoSeleccionado,
          nombre_producto: prod?.nombre || '',
          variedad,
          origen,
          calibres,
          peso_total: parseFloat(pesoTotal) / cantidadBultos, // Dividimos peso total entre bultos? O cada uno pesa eso?
          // Nota: El usuario usualmente ingresa "Peso por Pallet" si es masivo.
          costo_unidad: parseFloat(costoUnidad),
          precio_sugerido: parseFloat(precioSugerido),
          tipo_bulto: tipoBulto,
          envase_id: envaseId || undefined,
          envase_cantidad_total: totalCajas
        });
      }

      toast({ title: 'Éxito', description: `${cantidadBultos} Bultos registrados correctamente` });
      router.push('/logistica');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppNav />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" className="mb-2 p-0 h-auto hover:bg-transparent text-muted-foreground" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <h1 className="text-3xl font-black text-foreground">Ingreso de Mercadería</h1>
            <p className="text-muted-foreground">Registra la llegada de nuevos lotes y pallets.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold h-12" onClick={handleGuardar} disabled={procesando}>
               <Printer className="h-4 w-4 mr-2" /> Solo Ticket
            </Button>
            <Button className="rounded-xl font-bold h-12 bg-primary text-white" onClick={handleGuardar} disabled={procesando}>
               <Save className="h-4 w-4 mr-2" /> Registrar Todo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna Izquierda: Información General */}
          <div className="space-y-6">
            <div className="bg-card/50 border border-border/40 p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                <Package className="h-4 w-4" /> Datos del Producto
              </h3>
              
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={productoSeleccionado} onValueChange={setProductoSeleccionado}>
                  <SelectTrigger className="rounded-xl h-12 text-sm font-bold bg-background">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {productos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Variedad (Hass, Edranol...)</Label>
                  <Input 
                    placeholder="Ej: Hass" 
                    className="rounded-xl h-12 bg-background font-bold" 
                    value={variedad} 
                    onChange={e => setVariedad(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Select value={origen} onValueChange={(v: any) => setOrigen(v)}>
                    <SelectTrigger className="rounded-xl h-12 bg-background font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border/40 p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                <Box className="h-4 w-4" /> Logística de Carga
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formato de Carga</Label>
                  <Select value={tipoBulto} onValueChange={(v: any) => setTipoBulto(v)}>
                    <SelectTrigger className="rounded-xl h-12 bg-background font-bold capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pallet">Pallet</SelectItem>
                      <SelectItem value="bin">Bin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Envase</Label>
                  <Select value={envaseId} onValueChange={setEnvaseId}>
                    <SelectTrigger className="rounded-xl h-12 bg-background font-bold">
                      <SelectValue placeholder="Tipo de caja" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TIPOS_ENVASES.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cant. de {tipoBulto}s (Masivo)</Label>
                  <Input 
                    type="number" 
                    className="rounded-xl h-12 bg-background font-bold" 
                    value={cantidadBultos} 
                    onChange={e => setCantidadBultos(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Peso x {tipoBulto} (KG)</Label>
                    {productos.find(p => p.id === productoSeleccionado)?.nombre.toLowerCase().includes('palta') && (
                      <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                        Manual x Regla Palta
                      </span>
                    )}
                  </div>
                  <Input 
                    type="number" 
                    className="rounded-xl h-12 bg-background font-black text-lg border-amber-200/50" 
                    placeholder="0.000"
                    value={pesoTotal}
                    onChange={e => setPesoTotal(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Calibres y Precios */}
          <div className="space-y-6">
            <div className="bg-card/50 border border-border/40 p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                Calibres (Detalle x Pallet)
              </h3>
              
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Tipo/Nro</Label>
                  <Input 
                    placeholder="Extra, 18, 20..." 
                    className="rounded-xl h-10 bg-background" 
                    value={nuevoCalibre}
                    onChange={e => setNuevoCalibre(e.target.value)}
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Cajas</Label>
                  <Input 
                    type="number" 
                    placeholder="45" 
                    className="rounded-xl h-10 bg-background" 
                    value={nuevaCantidadCajas}
                    onChange={e => setNuevaCantidadCajas(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button size="icon" className="h-10 w-10 rounded-xl" onClick={agregarCalibre}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mt-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {calibres.map((c, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/20 group">
                    <div className="flex-1">
                      <span className="text-[10px] font-black opacity-40 uppercase mr-2 block leading-none mb-1">Calibre {c.calibre}</span>
                      <Input
                        type="number"
                        className="h-8 w-24 bg-muted/20 border-none font-black text-sm"
                        value={c.cantidad_cajas || ''}
                        onChange={(e) => actualizarCantidadCalibre(index, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Cajas</span>
                      <button onClick={() => eliminarCalibre(index)} className="text-destructive p-1 hover:bg-destructive/10 rounded-lg transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {calibres.length > 0 && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center mt-4">
                    <span className="text-xs font-black uppercase text-primary">Total Cajas Calculadas</span>
                    <span className="text-xl font-black text-primary">{totalCajas}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary opacity-60">
                Finanzas y Precios
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Costo Unit. (KG)</Label>
                  <Input 
                    type="number" 
                    className="rounded-xl h-12 bg-background font-bold text-primary" 
                    placeholder="$ 0"
                    value={costoUnidad}
                    onChange={e => setCostoUnidad(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>P. Sugerido (KG)</Label>
                  <Input 
                    type="number" 
                    className="rounded-xl h-12 bg-background font-black text-lg text-primary" 
                    placeholder="$ 0"
                    value={precioSugerido}
                    onChange={e => setPrecioSugerido(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-primary/10 flex justify-between items-center text-primary">
                <span className="text-xs font-bold uppercase">Total Cajas x Pallet</span>
                <span className="text-2xl font-black">{totalCajas}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

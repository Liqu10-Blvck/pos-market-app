'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConfigService } from '@/lib/services/config.service';
import { SeedService } from '@/lib/services/seed.service';
import { Tenant, Sucursal } from '@/lib/types/pos';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  MapPin, 
  Users, 
  Settings2, 
  Plus, 
  ShieldCheck, 
  Save,
  Store,
  CreditCard,
  Scale,
  Lock,
  Smartphone,
  CheckCircle2,
  Database,
  Rocket,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AjustesPage() {
  const [activeTab, setActiveTab] = useState('empresa');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedSucursal = useMemo(() => 
    sucursales.find(s => s.id === selectedSucursalId) || sucursales[0], 
  [sucursales, selectedSucursalId]);

  useEffect(() => {
    if (user?.tenantId) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    if (!user?.tenantId) return;
    setCargando(true);
    try {
      const [tenantData, sucursalesData, usuariosData] = await Promise.all([
        ConfigService.obtenerTenant(user.tenantId),
        ConfigService.obtenerSucursales(user.tenantId),
        ConfigService.obtenerUsuarios(user.tenantId)
      ]);
      setTenant(tenantData);
      setSucursales(sucursalesData);
      setUsuarios(usuariosData);
      if (sucursalesData.length > 0 && !selectedSucursalId) {
        setSelectedSucursalId(sucursalesData[0].id);
      }
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarEmpresa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenant) return;

    try {
      await ConfigService.guardarTenant(tenant);
      toast({ title: 'Empresa actualizada', description: 'Los datos legales se han guardado.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' });
    }
  };

  const handleUpdateSucursalConfig = (field: keyof Sucursal['configuracion'], value: any) => {
    if (!selectedSucursal) return;
    const updatedSucursales = sucursales.map(s => 
      s.id === selectedSucursal.id 
        ? { ...s, configuracion: { ...s.configuracion, [field]: value } }
        : s
    );
    setSucursales(updatedSucursales);
  };

  const handleGuardarSucursal = async () => {
    if (!selectedSucursal) return;
    try {
      await ConfigService.guardarSucursal(selectedSucursal);
      toast({ title: 'Configuración guardada', description: `Reglas de ${selectedSucursal.nombre} actualizadas.` });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la sucursal.', variant: 'destructive' });
    }
  };

  const handleSeedData = async () => {
    if (!user?.tenantId || !selectedSucursalId) {
      toast({ 
        title: 'Error', 
        description: 'Falta Tenant o Sucursal para cargar datos.', 
        variant: 'destructive' 
      });
      return;
    }
    setCargando(true);
    try {
      await SeedService.seed(user.tenantId, selectedSucursalId);
      await cargarDatos();
      toast({ 
        title: 'Datos cargados con éxito', 
        description: 'Se han generado productos, lotes y clientes de prueba.',
        className: "bg-green-600 text-white border-none font-black uppercase text-[10px]"
      });
    } catch (error) {
      console.error('Error seeding:', error);
      toast({ title: 'Error al sembrar datos', variant: 'destructive' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0 -mx-4 -mt-6 sm:-mx-8 sm:-mt-6 border-b border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            PANEL DE <span className="text-primary">CONTROL</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
            CONFIGURACIÓN MAESTRA · MULTI-SUCURSAL
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 -mr-2 pb-20">
        <div className="w-full">

          <Tabs defaultValue="empresa" className="space-y-8" onValueChange={setActiveTab}>
            <TabsList className="bg-card border-2 border-border h-16 p-2 rounded-[2rem] shadow-xl shadow-primary/5 w-full flex">
              <TabsTrigger value="empresa" className="flex-1 rounded-3xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black uppercase text-[10px] gap-2 transition-all">
                <Building2 className="h-4 w-4" /> Empresa
              </TabsTrigger>
              <TabsTrigger value="sucursales" className="flex-1 rounded-3xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black uppercase text-[10px] gap-2 transition-all">
                <Store className="h-4 w-4" /> Sucursales
              </TabsTrigger>
              <TabsTrigger value="equipo" className="flex-1 rounded-3xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black uppercase text-[10px] gap-2 transition-all">
                <Users className="h-4 w-4" /> Equipo
              </TabsTrigger>
              <TabsTrigger value="reglas" className="flex-1 rounded-3xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black uppercase text-[10px] gap-2 transition-all">
                <Settings2 className="h-4 w-4" /> Operación
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="empresa" key="empresa">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-4 space-y-6">
                    <Card className="rounded-[2.5rem] border-2 border-border overflow-hidden shadow-sm">
                      <div className="h-32 bg-primary/5 flex items-center justify-center border-b-2 border-border">
                         <div className="h-20 w-20 bg-card rounded-3xl shadow-xl flex items-center justify-center border-2 border-primary/20">
                            <Building2 className="h-10 w-10 text-primary" />
                         </div>
                      </div>
                      <CardContent className="p-6 space-y-4">
                         <div className="text-center">
                            <h3 className="font-black uppercase text-lg mb-1">{tenant?.razonSocial || 'Mi Empresa'}</h3>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">Tenant ID: {tenant?.id || 'CARGANDO...'}</p>
                            <Button variant="outline" className="mt-6 w-full rounded-2xl border-2 font-black uppercase text-[10px] h-11">Cambiar Logo</Button>
                         </div>
                         
                         {/* Maintenance Section */}
                         <div className="pt-6 border-t-2 border-border space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                               <Database className="size-3.5 text-primary" />
                               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mantenimiento</span>
                            </div>
                            <Button 
                              onClick={handleSeedData}
                              disabled={cargando}
                              variant="secondary" 
                              className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 group active:scale-95"
                            >
                               {cargando ? (
                                 <RefreshCw className="size-4 animate-spin text-primary" />
                               ) : (
                                 <>
                                   <div className="flex items-center gap-2">
                                      <Rocket className="size-4 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                      <span className="text-[10px] font-black uppercase tracking-tight">Cargar Datos Reales</span>
                                   </div>
                                   <span className="text-[8px] font-bold text-muted-foreground uppercase">Frutas, Lotes y Clientes</span>
                                 </>
                               )}
                            </Button>
                         </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="md:col-span-8">
                    <Card className="rounded-[3rem] border-2 border-border shadow-sm overflow-hidden">
                      <CardHeader className="bg-muted/30 p-8 border-b-2 border-border">
                        <CardTitle className="text-xl font-black uppercase">Datos Legales y Facturación</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase">Información para vales y documentos tributarios</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <form onSubmit={handleGuardarEmpresa} className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Razón Social</Label>
                               <Input 
                                 value={tenant?.razonSocial || ''} 
                                 onChange={e => setTenant(prev => prev ? { ...prev, razonSocial: e.target.value } : null)}
                                 placeholder="Comercializadora de Frutas Ltda" 
                                 className="h-12 rounded-2xl border-2 border-border focus:border-primary font-bold shadow-sm" 
                               />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase ml-1 opacity-60">RUT Empresa</Label>
                               <Input 
                                 value={tenant?.rut || ''} 
                                 onChange={e => setTenant(prev => prev ? { ...prev, rut: e.target.value } : null)}
                                 placeholder="76.123.456-K" 
                                 className="h-12 rounded-2xl border-2 border-border focus:border-primary font-bold shadow-sm" 
                               />
                            </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Dirección Casa Matriz</Label>
                             <Input 
                               value={tenant?.direccion || ''} 
                               onChange={e => setTenant(prev => prev ? { ...prev, direccion: e.target.value } : null)}
                               placeholder="Av. Soberanía #1234, Santiago" 
                               className="h-12 rounded-2xl border-2 border-zinc-200 focus:border-primary font-bold shadow-sm" 
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Giro Comercial</Label>
                               <Input 
                                 value={tenant?.giro || ''} 
                                 onChange={e => setTenant(prev => prev ? { ...prev, giro: e.target.value } : null)}
                                 placeholder="Venta al por mayor de frutas" 
                                 className="h-12 rounded-2xl border-2 border-border focus:border-primary font-bold shadow-sm" 
                               />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase ml-1 opacity-60">Correo Representante</Label>
                               <Input 
                                 type="email" 
                                 value={tenant?.correoRepresentante || ''} 
                                 onChange={e => setTenant(prev => prev ? { ...prev, correoRepresentante: e.target.value } : null)}
                                 placeholder="administracion@fruteriacentral.cl" 
                                 className="h-12 rounded-2xl border-2 border-border focus:border-primary font-bold shadow-sm" 
                               />
                            </div>
                          </div>
                          <div className="pt-6 flex justify-end">
                             <Button type="submit" className="h-14 px-10 rounded-2xl font-black uppercase text-xs gap-3 shadow-xl shadow-primary/30">
                                <Save className="h-5 w-5" /> Guardar Cambios
                             </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="sucursales" key="sucursales">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  <div className="flex justify-between items-center">
                     <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Mis Sucursales</h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Gestiona tus puntos de venta y locales</p>
                     </div>
                     <Button 
                        onClick={async () => {
                          const id = await ConfigService.guardarSucursal({
                            tenantId: user?.tenantId || 'default-tenant',
                            nombre: 'Nueva Sucursal',
                            direccion: 'Dirección pendiente',
                            activa: false,
                            configuracion: {
                              permitirGastoEnvases: true,
                              modoDefault: 'retail',
                              permitirVentaNegativa: false,
                              precioBloqueadoDefault: true,
                              permitirPallets: false,
                              permitirBins: false
                            },
                            createdAt: new Date() as any
                          });
                          await cargarDatos();
                          setSelectedSucursalId(id);
                          toast({ title: 'Sucursal creada', description: 'Configure los detalles ahora.' });
                        }}
                        className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] gap-2 bg-foreground text-background hover:opacity-90 shadow-xl shadow-foreground/10"
                      >
                        <Plus className="h-5 w-5" /> Nueva Sucursal
                     </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {sucursales.map((suc, i) => (
                      <Card key={suc.id} className="group rounded-[2.5rem] border-2 border-border hover:border-primary transition-all shadow-sm">
                        <CardContent className="p-8">
                           <div className="flex justify-between items-start mb-6">
                              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                 <Store className="h-6 w-6" />
                              </div>
                              <Badge className={`rounded-lg uppercase text-[9px] font-black ${suc.activa ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {suc.activa ? 'activa' : 'inactiva'}
                              </Badge>
                           </div>
                           <h4 className="font-black uppercase text-sm mb-2">{suc.nombre}</h4>
                           <div className="space-y-2 mb-6">
                              <div className="flex items-center gap-2 text-muted-foreground/60">
                                 <MapPin className="h-3.5 w-3.5" />
                                 <span className="text-[10px] font-bold">{suc.direccion}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                 <Users className="h-3.5 w-3.5" />
                                 <span className="text-[10px] font-bold">Sucursal ID: {suc.id}</span>
                              </div>
                           </div>
                             <Button variant="ghost" className="w-full flex justify-between h-10 px-4 rounded-xl font-black uppercase text-[9px] bg-muted/50 hover:bg-muted">
                                Configurar Local <ArrowRight className="h-3 w-3" />
                             </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="reglas" key="reglas">
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Reglas de Stock */}
                     <Card className="rounded-[3rem] border-2 border-border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 p-8 border-b-2 border-border">
                           <div className="flex items-center gap-3 mb-2">
                              <Scale className="h-5 w-5 text-primary" />
                              <CardTitle className="text-sm font-black uppercase">Inventario y Pesaje</CardTitle>
                           </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <Label className="text-xs font-black uppercase">Permitir Gasto de Envases</Label>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase">Para cajas de madera/plástico</p>
                              </div>
                              <Switch 
                                checked={selectedSucursal?.configuracion?.permitirGastoEnvases}
                                onCheckedChange={val => handleUpdateSucursalConfig('permitirGastoEnvases', val)}
                              />
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <Label className="text-xs font-black uppercase">Venta en Negativo</Label>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase">Permitir vender sin stock</p>
                              </div>
                              <Switch 
                                checked={selectedSucursal?.configuracion?.permitirVentaNegativa}
                                onCheckedChange={val => handleUpdateSucursalConfig('permitirVentaNegativa', val)}
                              />
                           </div>
                           <div className="pt-4 border-t-2 border-border space-y-4">
                              <Label className="text-[10px] font-black uppercase opacity-60">Soportes Disponibles</Label>
                              <div className="flex flex-wrap gap-2">
                                 <Badge 
                                   variant={selectedSucursal?.configuracion?.permitirPallets ? 'default' : 'secondary'} 
                                   onClick={() => handleUpdateSucursalConfig('permitirPallets', !selectedSucursal?.configuracion?.permitirPallets)}
                                   className="rounded-xl px-4 py-2 font-black uppercase text-[9px] cursor-pointer"
                                 >
                                   Pallets
                                 </Badge>
                                 <Badge 
                                   variant={selectedSucursal?.configuracion?.permitirBins ? 'default' : 'secondary'} 
                                   onClick={() => handleUpdateSucursalConfig('permitirBins', !selectedSucursal?.configuracion?.permitirBins)}
                                   className="rounded-xl px-4 py-2 font-black uppercase text-[9px] cursor-pointer"
                                 >
                                   Bines
                                 </Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     {/* Reglas de Precios */}
                     <Card className="rounded-[3rem] border-2 border-border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 p-8 border-b-2 border-border">
                           <div className="flex items-center gap-3 mb-2">
                              <Lock className="h-5 w-5 text-amber-500" />
                              <CardTitle className="text-sm font-black uppercase">Precios y Bloqueos</CardTitle>
                           </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <Label className="text-xs font-black uppercase">Bloqueo Maestro de Precio</Label>
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Vendedor no puede cambiar precio</p>
                              </div>
                              <Switch 
                                 checked={selectedSucursal?.configuracion?.precioBloqueadoDefault}
                                 onCheckedChange={val => handleUpdateSucursalConfig('precioBloqueadoDefault', val)}
                               />
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                 <Label className="text-xs font-black uppercase">Dualidad KG/CAJA</Label>
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Activar doble precio simultáneo</p>
                              </div>
                              <Switch 
                                 checked={selectedSucursal?.configuracion?.modoDefault === 'wholesale'}
                                 onCheckedChange={val => handleUpdateSucursalConfig('modoDefault', val ? 'wholesale' : 'retail')}
                               />
                           </div>
                           <div className="pt-4 border-t-2 border-border space-y-4">
                              <Label className="text-[10px] font-black uppercase opacity-60">Excepción de Bloqueo</Label>
                              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border-2 border-amber-500/20 flex items-center gap-4">
                                 <ShieldCheck className="h-6 w-6 text-amber-500" />
                                 <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase leading-relaxed">Solo el Administrador/Dueño podrá saltarse el bloqueo de precio en el Carrito.</p>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                   </div>
                   <div className="flex justify-end pt-8">
                      <Button 
                        onClick={handleGuardarSucursal}
                        className="h-14 px-12 rounded-2xl font-black uppercase text-xs gap-3 bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Guardar Reglas Operativas <Save className="h-4 w-4" />
                      </Button>
                   </div>
                 </motion.div>
              </TabsContent>

              <TabsContent value="equipo" key="equipo">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <Card className="rounded-[3rem] border-2 border-border shadow-sm overflow-hidden">
                      <div className="p-8 flex justify-between items-center border-b-2 border-border">
                         <CardTitle className="text-xl font-black uppercase">Registro de Usuarios</CardTitle>
                         <Button className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] bg-foreground text-background hover:opacity-90 shadow-xl shadow-foreground/10">Invitar Miembro</Button>
                      </div>
                      <div className="divide-y-2 divide-border">
                            {usuarios.length > 0 ? (
                              usuarios.map((u, i) => (
                                <div key={u.id || i} className="p-8 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                   <div className="flex items-center gap-4">
                                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary">{u.nombre?.[0] || 'U'}{u.nombre?.split(' ')[1]?.[0] || ''}</div>
                                      <div>
                                         <p className="font-black uppercase text-sm leading-tight">{u.nombre || 'Usuario sin nombre'}</p>
                                         <p className="text-[10px] font-bold text-muted-foreground/60">{u.email || u.correo}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-12">
                                      <div className="text-right">
                                         <p className="text-[10px] font-black uppercase opacity-60 mb-1">Rol</p>
                                         <Badge variant="outline" className={`rounded-lg uppercase text-[9px] font-black px-3 py-1 ${u.role === 'admin' ? 'border-primary text-primary bg-primary/5' : ''}`}>{u.role}</Badge>
                                      </div>
                                      <div className="text-right w-32">
                                         <p className="text-[10px] font-black uppercase opacity-60 mb-1">Sucursal</p>
                                         <p className="text-xs font-black uppercase leading-tight">{u.sucursalNombre || 'Asignada'}</p>
                                      </div>
                                      <Button variant="ghost" className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                                         <Settings2 className="h-4 w-4" />
                                      </Button>
                                   </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-12 text-center">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-xs font-black uppercase text-muted-foreground opacity-60">No hay otros miembros registrados aún</p>
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase mt-1">Invita a tu equipo para empezar a colaborar</p>
                              </div>
                            )}
                          </div>
                   </Card>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>

        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

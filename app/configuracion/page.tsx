'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useConfigStore } from './hooks/useConfigStore';

import { AppNav } from '@/components/layout/app-nav';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, parseChileanMoneyInput } from '@/lib/utils';
import { 
  Users, 
  User, 
  Target, 
  UserPlus, 
  Shield, 
  Loader2, 
  Settings,
  Coins
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function ConfiguracionPageContent() {
  const { user, actualizarPerfil } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = user?.role === 'admin';

  // Read config store values
  const tabActiva = useConfigStore((state) => state.tabActiva);
  const nombrePerfil = useConfigStore((state) => state.nombrePerfil);
  const rolPerfil = useConfigStore((state) => state.rolPerfil);
  const guardandoPerfil = useConfigStore((state) => state.guardandoPerfil);
  const usuarios = useConfigStore((state) => state.usuarios);
  const cargandoUsuarios = useConfigStore((state) => state.cargandoUsuarios);
  const creandoUsuario = useConfigStore((state) => state.creandoUsuario);
  const userForm = useConfigStore((state) => state.userForm);
  const metaDiariaInput = useConfigStore((state) => state.metaDiariaInput);
  const guardandoMeta = useConfigStore((state) => state.guardandoMeta);

  // Read config store actions
  const setTabActiva = useConfigStore((state) => state.setTabActiva);
  const setNombrePerfil = useConfigStore((state) => state.setNombrePerfil);
  const setRolPerfil = useConfigStore((state) => state.setRolPerfil);
  const setMetaDiariaInput = useConfigStore((state) => state.setMetaDiariaInput);
  const setUserForm = useConfigStore((state) => state.setUserForm);
  const cargarUsuarios = useConfigStore((state) => state.cargarUsuarios);
  const cargarMetaDiaria = useConfigStore((state) => state.cargarMetaDiaria);
  
  const handleActualizarPerfilStore = useConfigStore((state) => state.handleActualizarPerfil);
  const handleCrearUsuarioStore = useConfigStore((state) => state.handleCrearUsuario);
  const handleToggleEstadoUsuarioStore = useConfigStore((state) => state.handleToggleEstadoUsuario);
  const handleGuardarMetaStore = useConfigStore((state) => state.handleGuardarMeta);

  // Set default tab on load based on role
  useEffect(() => {
    if (isAdmin) {
      setTabActiva('usuarios');
    } else {
      setTabActiva('perfil');
    }
  }, [isAdmin, setTabActiva]);

  // Sync profile form when user context changes
  useEffect(() => {
    if (user) {
      setNombrePerfil(user.name || '');
      setRolPerfil(user.role || 'cashier');
    }
  }, [user, setNombrePerfil, setRolPerfil]);

  // Load Data
  useEffect(() => {
    if (isAdmin) {
      cargarUsuarios(toast);
      cargarMetaDiaria();
    }
  }, [isAdmin, cargarUsuarios, cargarMetaDiaria, toast]);

  // UI Handlers
  const handleActualizarPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    handleActualizarPerfilStore(actualizarPerfil, toast);
  };

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    handleCrearUsuarioStore(toast);
  };

  const handleToggleEstadoUsuario = (uid: string, activoActual: boolean) => {
    handleToggleEstadoUsuarioStore(uid, activoActual, toast);
  };

  const handleGuardarMeta = (e: React.FormEvent) => {
    e.preventDefault();
    handleGuardarMetaStore(user?.id, toast);
  };

  const handleMetaDiariaChange = (val: string) => {
    const clean = val.replace(/[^\d.]/g, '');
    setMetaDiariaInput(clean);
  };

  const handleMetaDiariaBlur = () => {
    const monto = parseChileanMoneyInput(metaDiariaInput);
    setMetaDiariaInput(monto > 0 ? formatCLPCurrency(monto) : '');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
            <Settings className="h-7 w-7 text-indigo-500 shrink-0" />
            Configuración del Sistema
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Administra cuentas de personal, actualiza tu perfil de acceso y define objetivos comerciales.
          </p>
        </div>

        {/* Tab Selection Layout */}
        <div className="flex border-b border-border/50 mb-6 gap-6 overflow-x-auto">
          {isAdmin && (
            <button
              onClick={() => setTabActiva('usuarios')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === 'usuarios'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Personal / Colaboradores ({usuarios.length})
            </button>
          )}

          <button
            onClick={() => setTabActiva('perfil')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
              tabActiva === 'perfil'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            Mi Perfil
          </button>

          {isAdmin && (
            <button
              onClick={() => setTabActiva('metas')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                tabActiva === 'metas'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target className="h-4 w-4" />
              Metas del Negocio
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 gap-6">

          {/* TAB 1: GESTION DE PERSONAL */}
          {tabActiva === 'usuarios' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form card to register new collaborator */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-1 shadow-sm h-fit bg-card">
                <CardHeader className="bg-muted/5 border-b border-border/20 px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-indigo-500" />
                    Registrar Colaborador
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Crea un nuevo usuario de acceso para el POS sin cerrar tu sesión actual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleCrearUsuario} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg_nombre" className="text-[10px] font-black uppercase text-muted-foreground">Nombre Completo</Label>
                      <Input
                        id="reg_nombre"
                        placeholder="Ej: Carmen Gloria"
                        value={userForm.nombre}
                        onChange={(e) => setUserForm({ nombre: e.target.value })}
                        className="h-10 rounded-xl text-xs font-bold border-border/70 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg_email" className="text-[10px] font-black uppercase text-muted-foreground">Correo Electrónico</Label>
                      <Input
                        id="reg_email"
                        type="email"
                        placeholder="Ej: carmen@negocio.com"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ email: e.target.value })}
                        className="h-10 rounded-xl text-xs font-bold border-border/70 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg_password" className="text-[10px] font-black uppercase text-muted-foreground">Contraseña de Acceso</Label>
                      <Input
                        id="reg_password"
                        type="password"
                        placeholder="Min. 6 caracteres"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ password: e.target.value })}
                        className="h-10 rounded-xl text-xs font-bold border-border/70 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg_role" className="text-[10px] font-black uppercase text-muted-foreground">Rol Asignado</Label>
                      <Select
                      value={userForm.role}
                      onValueChange={(val: any) => setUserForm({ role: val })}
                    >
                      <SelectTrigger id="reg_role" className="h-10 w-full rounded-xl border border-border bg-background text-xs font-bold border-border/70">
                        <SelectValue placeholder="Selecciona rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashier">Cajero (Operación y Ventas únicamente)</SelectItem>
                        <SelectItem value="admin">Administrador (Control Total del POS)</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                    <Button
                      type="submit"
                      disabled={creandoUsuario}
                      className="w-full rounded-2xl h-11 bg-primary hover:bg-primary/90 text-white font-bold text-xs mt-2 active:scale-95 transition-all shadow-md shadow-primary/10"
                    >
                      {creandoUsuario ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando Cuenta...
                        </>
                      ) : (
                        'Registrar Colaborador'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Table list card of collaborators */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-2 shadow-sm bg-card">
                <CardHeader className="bg-muted/5 border-b border-border/20 px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    Lista de Colaboradores
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visualiza y administra los accesos del personal al sistema POS.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {cargandoUsuarios ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                      <span className="text-xs font-bold">Recuperando registros...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="min-w-[600px] w-full text-xs font-semibold">
                        <thead>
                          <tr className="bg-muted/10 border-b border-border/40">
                            <th className="pl-6 py-3.5 text-left font-black uppercase text-[10px] text-muted-foreground">Nombre</th>
                            <th className="py-3.5 text-left font-black uppercase text-[10px] text-muted-foreground">Correo / Email</th>
                            <th className="py-3.5 text-center font-black uppercase text-[10px] text-muted-foreground">Rol</th>
                            <th className="py-3.5 text-center font-black uppercase text-[10px] text-muted-foreground">Acceso</th>
                            <th className="py-3.5 text-right pr-6 font-black uppercase text-[10px] text-muted-foreground">Operaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map((usr) => (
                            <tr key={usr.uid} className="hover:bg-muted/5 transition-colors border-b border-border/20">
                              <td className="font-extrabold pl-6 py-4 text-sm text-foreground">{usr.nombre}</td>
                              <td className="font-bold text-muted-foreground py-4">{usr.email}</td>
                              <td className="text-center py-4">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${usr.role === 'admin' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-muted text-muted-foreground'}`}>
                                  {usr.role === 'admin' ? 'Administrador' : 'Cajero'}
                                </span>
                              </td>
                              <td className="text-center py-4">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${usr.activo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                  {usr.activo ? 'Habilitado' : 'Inactivo'}
                                </span>
                              </td>
                              <td className="text-right pr-6 py-4">
                                {user?.id !== usr.uid ? (
                                  <Button
                                    onClick={() => handleToggleEstadoUsuario(usr.uid, usr.activo)}
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 text-[10px] font-bold rounded-xl px-3 transition-colors active:scale-95 ${
                                      usr.activo 
                                        ? 'text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600' 
                                        : 'text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600'
                                    }`}
                                  >
                                    {usr.activo ? 'Suspender' : 'Reactivar'}
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic font-medium pr-3">Tu Cuenta Activa</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {usuarios.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                                No se encontraron colaboradores registrados en Firestore.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: MI PERFIL */}
          {tabActiva === 'perfil' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form profile updates */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-2 shadow-sm bg-card">
                <CardHeader className="bg-muted/5 border-b border-border/20 px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-500" />
                    Editar Mis Datos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Actualiza tu nombre visible en las boletas de venta y el rol de tu cuenta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleActualizarPerfil} className="space-y-4 text-xs font-semibold">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">ID de Usuario (UID)</Label>
                        <Input
                          value={user?.id || ''}
                          disabled
                          className="h-10 rounded-xl text-xs font-bold border-border/50 bg-muted/40 text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Correo Registrado</Label>
                        <Input
                          value={user?.email || ''}
                          disabled
                          className="h-10 rounded-xl text-xs font-bold border-border/50 bg-muted/40 text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="perf_nombre" className="text-[10px] font-black uppercase text-muted-foreground">Nombre de Perfil</Label>
                        <Input
                          id="perf_nombre"
                          placeholder="Tu nombre completo"
                          value={nombrePerfil}
                          onChange={(e) => setNombrePerfil(e.target.value)}
                          className="h-10 rounded-xl text-xs font-bold border-border/70 focus-visible:ring-indigo-500"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="perf_rol" className="text-[10px] font-black uppercase text-muted-foreground">Rol / Nivel de Acceso</Label>
                        <Select
                          value={rolPerfil}
                          onValueChange={(val: any) => setRolPerfil(val)}
                        >
                          <SelectTrigger id="perf_rol" className="h-10 w-full rounded-xl border border-border bg-background text-xs font-bold border-border/70">
                            <SelectValue placeholder="Selecciona rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador (Permisos Totales)</SelectItem>
                            <SelectItem value="cashier">Cajero (Ventas y Operación)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={guardandoPerfil}
                      className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6 active:scale-95 transition-all shadow-md shadow-primary/10"
                    >
                      {guardandoPerfil ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando Cambios...
                        </>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Informative panel about roles */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-1 shadow-sm bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 bg-card">
                <CardHeader className="px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    Permisos de Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4 text-xs font-medium">
                  <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-1">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block uppercase text-[10px] tracking-wider">Administradores</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Poseen control total de la tienda. Pueden ver estadísticas, cotizar productos, registrar facturas de compras, y modificar metas financieras diarias.
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-2xl border border-border/40 space-y-1">
                    <span className="font-extrabold text-muted-foreground block uppercase text-[10px] tracking-wider">Cajeros / Operadores</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Acceso exclusivo al módulo de caja POS para realizar ventas. No pueden visualizar costos, facturación, estadísticas financieras ni administrar otros usuarios.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: METAS DEL NEGOCIO */}
          {tabActiva === 'metas' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Sales Target Config */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-2 shadow-sm bg-card">
                <CardHeader className="bg-muted/5 border-b border-border/20 px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-500" />
                    Objetivo Diario de Ventas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configura la meta de ventas del día. Los valores semanales y mensuales del dashboard se calcularán en base a este objetivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleGuardarMeta} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1.5 max-w-sm">
                      <Label htmlFor="meta_diaria" className="text-[10px] font-black uppercase text-muted-foreground">Meta de Ventas Diaria (CLP)</Label>
                      <div className="relative">
                        <Input
                          id="meta_diaria"
                          placeholder="Ej: $150.000"
                          value={metaDiariaInput}
                          onChange={(e) => handleMetaDiariaChange(e.target.value)}
                          onBlur={handleMetaDiariaBlur}
                          inputMode="numeric"
                          className="h-12 rounded-xl text-lg font-black border-border/70 focus-visible:ring-indigo-500 pl-4"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight pt-1">
                        Ingresa el monto neto objetivo que el negocio busca vender cada día.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={guardandoMeta}
                      className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6 active:scale-95 transition-all shadow-md shadow-primary/10"
                    >
                      {guardandoMeta ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando Meta...
                        </>
                      ) : (
                        'Guardar Meta de Ventas'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Informative panel about goals */}
              <Card className="border border-border/50 rounded-[2rem] overflow-hidden lg:col-span-1 shadow-sm bg-gradient-to-tr from-emerald-500/5 to-indigo-500/5 bg-card">
                <CardHeader className="px-6 py-5">
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-500" />
                    Impacto en el Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4 text-xs font-medium">
                  <div className="space-y-2 leading-relaxed text-muted-foreground">
                    <p>
                      Al configurar tu meta de ventas diaria, el sistema ajustará proporcionalmente los siguientes indicadores de desempeño financiero:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 font-bold text-foreground">
                      <li>Meta Semanal: <span className="text-indigo-500">Meta Diaria × 7</span></li>
                      <li>Meta Mensual: <span className="text-indigo-500">Meta Diaria × 30</span></li>
                    </ul>
                    <p className="pt-2">
                      Esto te permitirá monitorear en tiempo real el porcentaje de logro comercial diario y proyectar el éxito financiero a corto y mediano plazo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ConfiguracionPageContent />
    </ProtectedRoute>
  );
}

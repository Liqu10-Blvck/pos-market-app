'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Home, 
  ShoppingCart, 
  Package, 
  History, 
  LogOut, 
  Users, 
  User, 
  Sun, 
  Moon, 
  TrendingUp, 
  BookOpen, 
  Settings, 
  ClipboardList,
  Bell,
  AlertTriangle,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { BrandLogo } from '@/components/ui/brand-logo'
import { useTheme } from 'next-themes'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store/useAppStore'
import { usePedidosStore } from '@/app/pedidos/hooks/usePedidosStore'
import { formatCLPCurrency } from '@/lib/utils'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

const items = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin', label: 'Productos', icon: Package },
  { href: '/costos', label: 'Costos', icon: TrendingUp },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/contabilidad', label: 'Contabilidad', icon: BookOpen },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // State local para modal de alertas
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'pedidos' | 'stock' | 'vencimientos'>('pedidos')
  const [prevPendingCount, setPrevPendingCount] = useState<number | null>(null)

  // Global App Store values
  const productos = useAppStore((state) => state.productos)
  const iniciarProductosListener = useAppStore((state) => state.iniciarProductosListener)

  // Pedidos Store values
  const pedidos = usePedidosStore((state) => state.pedidos)
  const iniciarPedidosListener = usePedidosStore((state) => state.iniciarPedidosListener)

  // Setup Firestore listener on mount and cleanup on unmount
  useEffect(() => {
    const unsubscribeProd = iniciarProductosListener()
    const unsubscribePed = iniciarPedidosListener()
    return () => {
      unsubscribeProd()
      unsubscribePed()
    }
  }, [iniciarProductosListener, iniciarPedidosListener])

  // Alertas de Inventario, Vencimiento y Pedidos
  const catalogoActivo = productos.filter((p) => p.es_interes !== true)
  const sinStock = catalogoActivo.filter((p) => p.stock_actual <= 0)
  const bajoStock = catalogoActivo.filter((p) => p.stock_actual > 0 && p.stock_actual <= 5)
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'pendiente')
  
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  
  const vencidos = catalogoActivo.filter((p) => {
    if (!p.fecha_caducidad) return false
    const fechaVenc = new Date(p.fecha_caducidad + 'T00:00:00')
    return fechaVenc.getTime() < hoy.getTime()
  })

  const porVencer = catalogoActivo.filter((p) => {
    if (!p.fecha_caducidad) return false
    const fechaVenc = new Date(p.fecha_caducidad + 'T00:00:00')
    const diffTime = fechaVenc.getTime() - hoy.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  })

  const totalAlertas = sinStock.length + bajoStock.length + vencidos.length + porVencer.length + pedidosPendientes.length
  const alertasCriticas = sinStock.length + vencidos.length + pedidosPendientes.length

  // Alerta sonora/visual de nuevos pedidos pendientes recibidos a nivel global
  useEffect(() => {
    if (prevPendingCount === null) {
      // Si el listener está cargando por primera vez o la vista se monta, inicializar sin alertar
      if (pedidos.length > 0 || pedidosPendientes.length >= 0) {
        setPrevPendingCount(pedidosPendientes.length)
      }
      return
    }

    if (pedidosPendientes.length > prevPendingCount) {
      toast({
        title: '¡Nuevo Pedido Recibido!',
        description: `Hay un nuevo pedido pendiente por procesar en cola.`,
        variant: 'default',
      })
      setAlertsModalOpen(true)
    }
    setPrevPendingCount(pedidosPendientes.length)
  }, [pedidosPendientes.length, prevPendingCount, pedidos.length, toast])

  // Selección automática de pestaña en base a prioridades al abrir el modal
  useEffect(() => {
    if (alertsModalOpen) {
      if (pedidosPendientes.length > 0) {
        setActiveTab('pedidos')
      } else if (sinStock.length > 0 || bajoStock.length > 0) {
        setActiveTab('stock')
      } else if (vencidos.length > 0 || porVencer.length > 0) {
        setActiveTab('vencimientos')
      }
    }
  }, [alertsModalOpen, pedidosPendientes.length, sinStock.length, bajoStock.length, vencidos.length, porVencer.length])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-4">
        {/* Logo/Brand */}
        <Link href="/inicio">
          <BrandLogo className="h-10" />
        </Link>

        {/* Navigation Items */}
        <div className="flex-1 overflow-x-auto custom-scrollbar lg:mx-8">
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-2xl w-fit">
            {items.filter(item => {
              if (['/admin', '/costos', '/contabilidad'].includes(item.href)) {
                return user?.role === 'admin';
              }
              return true;
            }).map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'relative flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all duration-300',
                    active
                      ? 'bg-background text-primary shadow-sm dark:text-white'
                      : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/50'
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform duration-300" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2">
          {/* Campana de Alertas Globales */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAlertsModalOpen(true)}
            className="relative h-12 w-12 rounded-2xl bg-muted/50 text-foreground hover:bg-muted transition-all duration-300 active:scale-90"
            title="Alertas de Sistema y Pedidos"
          >
            <Bell className={`h-5 w-5 ${alertasCriticas > 0 ? 'text-red-500 animate-bounce' : totalAlertas > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            {totalAlertas > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-4 ring-background">
                {totalAlertas}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-muted/50 text-foreground hover:bg-muted transition-all duration-300 active:scale-90"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-border/50 p-2 shadow-lg bg-popover text-popover-foreground">
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Cuenta de Usuario
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-border/40" />
              
              <DropdownMenuItem
                onClick={() => router.push('/configuracion')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted transition-all text-xs font-bold"
              >
                <Settings className="h-4 w-4 text-indigo-500" />
                Configuración
              </DropdownMenuItem>

              {/* Cambio de Tema Integrado */}
              <DropdownMenuItem
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted transition-all text-xs font-bold"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-500" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-indigo-500" />
                    Modo Oscuro
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-border/40" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive transition-all text-xs font-bold"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pop-up de Alertas Detallado de Nivel Global */}
      <Dialog open={alertsModalOpen} onOpenChange={setAlertsModalOpen}>
        <DialogContent className="rounded-[2.5rem] border border-border/80 shadow-2xl p-6 bg-card max-h-[85vh] overflow-y-auto w-[96vw] max-w-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
              <Bell className={`h-6 w-6 ${alertasCriticas > 0 ? 'text-red-500' : 'text-amber-500'}`} />
              Alertas Globales del Sistema ({totalAlertas})
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold">
              Revisa y procesa las advertencias de stock, vencimiento y pedidos de hoy.
            </DialogDescription>
          </DialogHeader>

          {/* Selector de Pestañas Premium */}
          <div className="flex border-b border-border/40 my-4 gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all duration-200 relative whitespace-nowrap ${
                activeTab === 'pedidos'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Pedidos ({pedidosPendientes.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all duration-200 relative whitespace-nowrap ${
                activeTab === 'stock'
                  ? 'border-red-500 text-red-600 dark:text-red-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Inventario Catálogo ({sinStock.length + bajoStock.length})
            </button>
            <button
              onClick={() => setActiveTab('vencimientos')}
              className={`pb-2 text-xs font-bold border-b-2 transition-all duration-200 relative whitespace-nowrap ${
                activeTab === 'vencimientos'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Vencimientos ({vencidos.length + porVencer.length})
            </button>
          </div>

          <div className="space-y-4 py-2 min-h-[220px]">
            
            {/* VISTA DE PEDIDOS */}
            {activeTab === 'pedidos' && (
              <div className="space-y-2">
                {pedidosPendientes.length > 0 ? (
                  <div className="divide-y divide-border/40 rounded-2xl border border-blue-500/10 bg-blue-500/5 dark:bg-blue-500/10 overflow-hidden">
                    {pedidosPendientes.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 text-sm hover:bg-blue-500/5 transition-colors">
                        <div>
                          <div className="font-bold text-foreground">Pedido #{p.numero_pedido}</div>
                          {p.cliente_nombre && (
                            <div className="text-[10px] text-muted-foreground font-semibold">Cliente: {p.cliente_nombre}</div>
                          )}
                        </div>
                        <span className="rounded-full bg-blue-500/25 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                          {formatCLPCurrency(p.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-xs font-semibold text-muted-foreground">No hay pedidos pendientes por despachar.</p>
                )}
              </div>
            )}

            {/* VISTA DE STOCK (Catálogo Activo) */}
            {activeTab === 'stock' && (
              <div className="space-y-4">
                {/* Agotados */}
                {sinStock.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 fill-red-500/10" />
                      Sin Stock / Agotados ({sinStock.length})
                    </h5>
                    <div className="divide-y divide-border/40 rounded-2xl border border-red-500/10 bg-red-500/5 dark:bg-red-500/10 overflow-hidden">
                      {sinStock.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <span className="font-bold text-foreground">{p.nombre}</span>
                          <span className="font-black text-red-600 dark:text-red-400 uppercase text-[10px]">Agotado</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Bajo */}
                {bajoStock.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      Por Agotarse (Mín. 5) ({bajoStock.length})
                    </h5>
                    <div className="divide-y divide-border/40 rounded-2xl border border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/10 overflow-hidden">
                      {bajoStock.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <span className="font-bold text-foreground">{p.nombre}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{p.stock_actual} {p.unidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sinStock.length === 0 && bajoStock.length === 0 && (
                  <p className="text-center py-12 text-xs font-semibold text-muted-foreground">Todo el catálogo activo tiene stock suficiente.</p>
                )}
              </div>
            )}

            {/* VISTA DE VENCIMIENTOS */}
            {activeTab === 'vencimientos' && (
              <div className="space-y-4">
                {/* Vencidos */}
                {vencidos.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 fill-red-500/10" />
                      Caducados ({vencidos.length})
                    </h5>
                    <div className="divide-y divide-border/40 rounded-2xl border border-red-500/10 bg-red-500/5 dark:bg-red-500/10 overflow-hidden">
                      {vencidos.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <span className="font-bold text-foreground">{p.nombre}</span>
                          <span className="font-black text-red-600 dark:text-red-400">Caducó: {p.fecha_caducidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Por Vencer */}
                {porVencer.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      Próximos 7 días ({porVencer.length})
                    </h5>
                    <div className="divide-y divide-border/40 rounded-2xl border border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/10 overflow-hidden">
                      {porVencer.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-xs">
                          <span className="font-bold text-foreground">{p.nombre}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">Vence: {p.fecha_caducidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vencidos.length === 0 && porVencer.length === 0 && (
                  <p className="text-center py-12 text-xs font-semibold text-muted-foreground">No hay productos vencidos ni próximos a vencer.</p>
                )}
              </div>
            )}

          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setAlertsModalOpen(false)} className="rounded-xl font-bold">
              Cerrar Alertas
            </Button>
            {pedidosPendientes.length > 0 && (
              <Button 
                onClick={() => { setAlertsModalOpen(false); router.push('/pedidos'); }} 
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Ver Pedidos
              </Button>
            )}
            <Button 
              onClick={() => { setAlertsModalOpen(false); router.push('/admin'); }} 
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
            >
              Ir a Productos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  )
}

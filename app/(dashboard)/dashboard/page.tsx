'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { VentasService } from '@/lib/services/ventas.service'
import { SesionService } from '@/lib/services/sesion.service'
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Venta, Producto, SesionCaja } from '@/lib/types/pos'
import { StatCard } from '@/components/dashboard/stat-card'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { QuickAction } from '@/components/dashboard/quick-action'
import { InventoryStatus } from '@/components/dashboard/inventory-status'
import { 
  Users, 
  Wallet, 
  Package, 
  TrendingUp, 
  Loader2 
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const tenantId = user?.tenantId || 'default-tenant'
  const sucursalId = user?.sucursalesIds?.[0] || 'default-sucursal'
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    ventasHoy: number
    recaudadoHoy: number
    productosConStock: Producto[]
    ventasRecientes: Venta[]
    sesionActiva: SesionCaja | null
  }>({
    ventasHoy: 0,
    recaudadoHoy: 0,
    productosConStock: [],
    ventasRecientes: [],
    sesionActiva: null
  })

  useEffect(() => {
    async function fetchDashboardData() {
      if (!tenantId || !sucursalId) return

      try {
        setLoading(true)
        
        const sesion = await SesionService.obtenerSesionActiva(tenantId, sucursalId)
        
        let ventas: Venta[] = []
        let resumen = { total_ventas: 0, cantidad_ventas: 0 }

        if (sesion) {
          ventas = await VentasService.obtenerVentasPorSesion(sesion.id, tenantId, sucursalId)
          resumen = await VentasService.obtenerResumenSesion(sesion.id, tenantId, sucursalId)
        }

        const qVentas = query(
          collection(db, 'ventas'),
          where('tenantId', '==', tenantId),
          where('sucursalId', '==', sucursalId),
          orderBy('fecha', 'desc'),
          limit(5)
        )
        const vSnap = await getDocs(qVentas)
        const ventasRecientes = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venta))

        const qProd = query(
          collection(db, 'productos'),
          where('tenantId', '==', tenantId),
          limit(20)
        )
        const pSnap = await getDocs(qProd)
        const productos = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto))

        setData({
          ventasHoy: resumen.cantidad_ventas,
          recaudadoHoy: resumen.total_ventas,
          productosConStock: productos,
          ventasRecientes: ventasRecientes,
          sesionActiva: sesion
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [tenantId, sucursalId])

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in duration-700 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0 -mx-4 -mt-6 sm:-mx-8 sm:-mt-6 border-b border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            CENTRAL <span className="text-primary">DASHBOARD</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
            Vista general del negocio - {data.sesionActiva ? 'Sesión Abierta' : 'Sin Sesión Activa'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <StatCard 
          title="Ventas de Hoy"
          value={data.ventasHoy}
          icon={TrendingUp}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          trend={{ value: "+12.5%", isPositive: true }}
        />
        <StatCard 
          title="Total Recaudado"
          value={`$${data.recaudadoHoy.toLocaleString()}`}
          icon={Wallet}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          trend={{ value: "+8.2%", isPositive: true }}
        />
        <StatCard 
          title="Clientes Atendidos"
          value={data.ventasHoy} 
          icon={Users}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          trend={{ value: "+3", isPositive: true }}
        />
        <StatCard 
          title="Stock Bajo"
          value={data.productosConStock.filter(p => p.stock_actual < 20).length}
          icon={Package}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          badge={{ text: `${data.productosConStock.filter(p => p.stock_actual < 10).length} criticos`, variant: 'danger' }}
        />
      </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 flex flex-col gap-8">
            <RecentSales ventas={data.ventasRecientes} />
          </div>
          <div className="flex flex-col gap-8 pb-10">
            <QuickAction />
            <InventoryStatus productos={data.productosConStock} />
          </div>
        </div>
      </div>
    </div>
  )
}

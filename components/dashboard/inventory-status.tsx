'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Producto } from '@/lib/types/pos'

interface InventoryStatusProps {
  productos: Producto[]
}

export function InventoryStatus({ productos }: InventoryStatusProps) {
  // Tomamos los productos con stock más bajo para mostrar alertas reales
  // Asumimos un "stock ideal" de 100 para calcular el porcentaje visual
  const topAlerts = productos
    .sort((a, b) => a.stock_actual - b.stock_actual)
    .slice(0, 4)
    .map(p => {
      const percentage = Math.min(100, Math.max(0, (p.stock_actual / 100) * 100))
      return {
        id: p.id,
        name: p.nombre,
        percentage,
        originalStock: p.stock_actual,
        color: percentage < 25 ? "bg-rose-500" : percentage < 50 ? "bg-amber-500" : "bg-emerald-500"
      }
    })

  return (
    <div className="flex flex-col gap-8 p-10 rounded-[3rem] bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm h-full shadow-2xl transition-colors duration-500">
      <div className="space-y-1">
        <h2 className="text-xl font-black uppercase text-zinc-900 dark:text-white tracking-tight flex items-center justify-between italic">
          Estado del Inventario
          <AlertTriangle className="size-4 text-amber-500" />
        </h2>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
          Métricas de Abastecimiento Real
        </p>
      </div>

      <div className="space-y-8 flex-1">
        {topAlerts.length > 0 ? topAlerts.map((item, index) => (
          <div key={item.id} className="space-y-3 group">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-black uppercase text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors tracking-tight">
                {item.name}
              </span>
              <span className={cn(
                "text-[10px] font-black tracking-widest",
                item.percentage < 25 ? "text-rose-500" : item.percentage < 50 ? "text-amber-500" : "text-emerald-500"
              )}>
                {item.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: `${item.percentage}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={cn("h-full rounded-full shadow-lg", item.color)}
              />
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
            <AlertTriangle className="size-12 mb-4 text-zinc-400" />
            <p className="text-[10px] font-black uppercase italic text-zinc-400">Sin datos de stock</p>
          </div>
        )}
      </div>

      <Link href="/logistica" className="w-full">
        <Button className="w-full h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl shadow-black/5 dark:shadow-black/20 border border-zinc-300 dark:border-zinc-700 active:scale-95 transition-all">
          Auditar Stock <ArrowRight className="size-4" />
        </Button>
      </Link>
    </div>
  )
}

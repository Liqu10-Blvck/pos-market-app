'use client'

import { motion } from 'framer-motion'
import { TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, Smartphone, HelpCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Venta } from '@/lib/types/pos'

interface RecentSalesProps {
  ventas: Venta[]
}

export function RecentSales({ ventas }: RecentSalesProps) {
  return (
    <div className="flex flex-col gap-8 p-10 bg-card/40 border border-border/50 rounded-[3rem] backdrop-blur-md shadow-xl shadow-black/5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Ventas Recientes</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-70">
            Últimas transacciones realizadas
          </p>
        </div>
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <TrendingUp className="size-6 text-primary" />
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/50">
            <tr>
              <th className="pb-6 text-left font-black">Cliente / ID</th>
              <th className="pb-6 text-left font-black">Productos</th>
              <th className="pb-6 text-left font-black">Método</th>
              <th className="pb-6 text-right font-black">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {ventas.length > 0 ? ventas.map((venta, index) => (
              <motion.tr 
                key={venta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group hover:bg-muted/50 transition-colors"
              >
                <td className="py-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-12 rounded-2xl border-2 border-border group-hover:border-primary transition-colors">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${venta.cliente_nombre}`} />
                      <AvatarFallback className="bg-muted text-xs font-black text-muted-foreground">
                        {venta.cliente_nombre?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black uppercase text-xs text-foreground group-hover:text-primary transition-colors">
                        {venta.cliente_nombre || 'Cliente General'}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        #INV-{venta.numero_venta || venta.id.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-6">
                  <span className="text-xs font-bold text-muted-foreground">
                    {venta.items?.[0]?.nombre || 'Varios Productos'}
                  </span>
                </td>
                <td className="py-6">
                  <div className="flex items-center gap-2">
                    {venta.metodo_pago === 'efectivo' && <Banknote className="size-3 text-emerald-500" />}
                    {venta.metodo_pago === 'tarjeta' && <CreditCard className="size-3 text-blue-500" />}
                    {venta.metodo_pago === 'transferencia' && <Smartphone className="size-3 text-purple-500" />}
                    {(!venta.metodo_pago || !['efectivo', 'tarjeta', 'transferencia'].includes(venta.metodo_pago)) && <HelpCircle className="size-3 text-neutral-500" />}
                    <span className="text-[10px] font-black uppercase text-neutral-400">
                      {venta.metodo_pago || 'S/D'}
                    </span>
                  </div>
                </td>
                <td className="py-6">
                  <div className={cn(
                    "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                    venta.estado_pago === 'pagado' ? "bg-emerald-500/10 text-emerald-500" : 
                    venta.estado_pago === 'pendiente' ? "bg-amber-500/10 text-amber-500" : "bg-neutral-500/10 text-neutral-500"
                  )}>
                    {venta.estado_pago === 'pagado' ? 'COMPLETADO' : 'PENDIENTE'}
                  </div>
                </td>
                <td className="py-6 text-right">
                  <span className="font-black text-white text-sm tabular-nums">
                    ${venta.total.toLocaleString()}
                  </span>
                </td>
              </motion.tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[10px] font-black uppercase text-neutral-500 italic">
                  No se registran ventas recientes en esta sucursal
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

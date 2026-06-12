'use client'

import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconBg: string
  iconColor: string
  trend?: {
    value: string
    isPositive: boolean
  }
  badge?: {
    text: string
    variant: 'danger' | 'warning' | 'info'
  }
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconBg, 
  iconColor, 
  trend, 
  badge 
}: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-8 rounded-[2.5rem] bg-card/40 border border-border/50 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden group hover:border-primary/20 transition-all duration-300 shadow-xl shadow-black/5"
    >
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("size-14 rounded-2xl flex items-center justify-center shadow-inner", iconBg)}>
          <Icon className={cn("size-7 transition-transform group-hover:scale-110", iconColor)} />
        </div>

        {trend && (
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
            trend.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {trend.value}
          </div>
        )}

        {badge && (
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
            badge.variant === 'danger' ? "bg-rose-500/10 text-rose-500" : 
            badge.variant === 'warning' ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500"
          )}>
            {badge.text}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 group-hover:text-neutral-400 transition-colors">
          {title}
        </span>
        <h2 className="text-4xl font-black text-foreground tracking-tighter">
          {value}
        </h2>
      </div>

      {/* Background Glow */}
      <div className={cn(
        "absolute -bottom-10 -right-10 size-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20",
        iconBg.replace('bg-', 'bg-')
      )} />
    </motion.div>
  )
}

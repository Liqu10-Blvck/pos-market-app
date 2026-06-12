'use client'

import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function QuickAction() {
  return (
    <Link href="/v2/ventas">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -5 }}
        viewport={{ once: true }}
        className="group relative p-10 rounded-[3rem] bg-emerald-500 overflow-hidden shadow-2xl shadow-emerald-500/20 cursor-pointer"
      >
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-colors" />
        
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
            Nueva Venta <br /> Rápida
          </h2>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest">
            Inicia una transacción instantánea
          </p>
        </div>

        <div className="mt-8 flex justify-end relative z-10">
          <div className="size-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl group-hover:bg-white group-hover:text-emerald-600 transition-all active:scale-95">
            <Plus className="size-8" />
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute -bottom-10 -left-10 size-40 bg-white/5 rounded-full blur-[70px] group-hover:bg-white/10 transition-colors" />
      </motion.div>
    </Link>
  )
}

'use client'

import { sileo } from 'sileo'
import { BrandLogo } from '@/components/ui/brand-logo'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

export function toast({ title, description, variant }: ToastProps) {
  const isError = variant === 'destructive'
  const isSuccess = variant === 'success' || (title?.toLowerCase().includes('éxito') || title?.toLowerCase().includes('exitoso'))

  const customDescription = (
    <div className="flex flex-col gap-2 mt-2">
      {description && (
        <span className="text-sm text-white/80 leading-relaxed font-medium">
          {description}
        </span>
      )}
      <div className="flex items-center gap-2.5 mt-1">
        <div className="flex -space-x-2 overflow-hidden">
          <div className="size-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shadow-sm">
             <BrandLogo className="h-4" showText={false} animate={false} />
          </div>
          <div className="size-6 rounded-full bg-orange-400 border border-orange-500 flex items-center justify-center shadow-lg">
             <span className="text-[10px]">🍎</span>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
          FrutaPOS System
        </span>
      </div>
    </div>
  )

  const opts = {
    title: title || (isError ? 'Error' : 'Notificación'),
    description: customDescription,
    duration: 4000,
    roundness: 12, // Reduced radius as requested
    fill: "#121212", 
    styles: {
      title: "font-black tracking-tight text-base text-white", // Larger font
      description: "mt-0"
    }
  }
  
  if (isError) {
    return sileo.error({ ...opts, fill: "#2D1010" }) 
  }
  
  if (isSuccess) {
    return sileo.success({ ...opts, fill: "#0D2115" })
  }

  return sileo.info(opts)
}

export function useToast() {
  return {
    toast,
    sileo 
  }
}

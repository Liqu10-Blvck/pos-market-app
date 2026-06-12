'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Box, 
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  HelpCircle,
  Menu,
  X,
  Plus,
  ArrowRight,
  Sun,
  Moon,
  ShoppingCart
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ConfigService } from '@/lib/services/config.service'
import { Tenant } from '@/lib/types/pos'
import { BrandLogo } from '@/components/ui/brand-logo'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AsideProps {
  isOpen: boolean
  onToggle: () => void
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Ventas', icon: ShoppingCart, href: '/ventas' },
  { label: 'Facturas', icon: Receipt, href: '/ventas/facturacion' },
  { label: 'Productos', icon: Package, href: '/admin' },
  { label: 'Clientes', icon: Users, href: '/clientes' },
  { label: 'Inventario', icon: Box, href: '/logistica' }
]

export function Aside({ isOpen, onToggle }: AsideProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (user?.tenantId) {
      ConfigService.obtenerTenant(user.tenantId).then(setTenant)
    }
  }, [user])

  return (
    <aside className={cn(
      "relative z-40 flex flex-col border-r border-border/40 bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-500 ease-in-out",
      isOpen ? "w-72" : "w-20"
    )}>
      {/* Decorative Background Element */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      {/* Header / Logo Section */}
      <div className={cn(
        "h-20 flex items-center transition-all duration-500",
        isOpen ? "px-6" : "justify-center px-0"
      )}>
        <div className="flex items-center gap-3">
          {tenant?.logoUrl ? (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 size-10 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/5"
            >
              <img src={tenant.logoUrl} alt={tenant.nombre} className="size-full object-cover" />
            </motion.div>
          ) : (
            <div className="flex items-center">
               <BrandLogo className="h-8" showText={isOpen} animate={false} />
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "group relative flex items-center h-12 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-foreground text-background shadow-xl shadow-foreground/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center transition-all duration-300 w-full",
                isOpen ? "px-4" : "justify-center"
              )}>
                <item.icon className={cn(
                  "flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                  isOpen ? "size-5" : "size-6",
                  isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground"
                )} />
                
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="ml-3 text-xs font-black uppercase tracking-tight"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {!isOpen && (
                <div className="absolute left-14 bg-foreground text-background text-[10px] font-bold uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                   {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 mt-auto space-y-4">
        {/* Theme Switcher */}
        <div 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`relative h-12 flex items-center p-1 cursor-pointer rounded-2xl bg-muted/50 border border-border/50 transition-all duration-300 ${!isOpen && 'justify-center'}`}
        >
          {isOpen ? (
            <div className="flex w-full items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={`size-8 rounded-xl flex items-center justify-center transition-all ${theme === 'dark' ? 'text-muted-foreground' : 'bg-background text-primary shadow-sm'}`}>
                  <Sun className="size-4" />
                </div>
                <div className={`size-8 rounded-xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>
                  <Moon className="size-4" />
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </div>
          ) : (
            <motion.div 
              animate={{ rotate: theme === 'dark' ? 180 : 0 }}
              className="size-8 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm"
            >
              {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </motion.div>
          )}
        </div>

        {isOpen ? (
          <div className="space-y-3">
             <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[9px] font-black uppercase text-primary mb-1 tracking-widest">Plan Actual</p>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold uppercase truncate pr-2">Pro Business</p>
                   <ArrowRight className="size-3 text-primary" />
                </div>
             </div>
             <Button 
               variant="ghost" 
               onClick={onToggle}
               className="w-full h-12 rounded-2xl flex justify-between px-4 text-muted-foreground hover:text-foreground transition-all"
             >
               <span className="text-[10px] font-black uppercase">Contraer</span>
               <ChevronLeft className="size-4" />
             </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className="size-12 rounded-2xl mx-auto flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <Menu className="size-5" />
          </Button>
        )}
      </div>
    </aside>
  )
}

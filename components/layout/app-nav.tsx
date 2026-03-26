'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ShoppingCart, Package, History, LogOut, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import { BrandLogo } from '@/components/ui/brand-logo'

const items = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/admin', label: 'Productos', icon: Package },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/historial', label: 'Historial', icon: History },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl dark:bg-[#080b12]/80">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-4">
        {/* Logo/Brand */}
        <Link href="/inicio">
          <BrandLogo className="h-10" />
        </Link>

        {/* Navigation Items */}
        <div className="flex-1 overflow-x-auto custom-scrollbar lg:mx-8">
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 dark:bg-muted/10 rounded-2xl w-fit">
            {items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'relative flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all duration-300',
                    active
                      ? 'bg-white text-primary shadow-sm dark:bg-[#1e293b] dark:text-white'
                      : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5'
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout} 
          className="h-12 w-12 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 active:scale-90 shadow-sm"
        >
          <LogOut className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </div>
    </nav>
  )
}

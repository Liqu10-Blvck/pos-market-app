'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ShoppingCart, Package, History, LogOut, Users, Sun, Moon, TrendingUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import { BrandLogo } from '@/components/ui/brand-logo'
import { useTheme } from 'next-themes'

const items = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/admin', label: 'Productos', icon: Package },
  { href: '/costos', label: 'Costos', icon: TrendingUp },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/historial', label: 'Historial', icon: History },
  { href: '/contabilidad', label: 'Contabilidad', icon: BookOpen },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-12 w-12 rounded-2xl bg-muted/50 text-foreground hover:bg-muted transition-all duration-300 active:scale-90"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="h-12 w-12 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 active:scale-90 shadow-sm"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </nav>
  )
}

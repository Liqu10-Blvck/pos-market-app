'use client'

import { Search, Bell, Settings, User, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NotificationDropdown } from './notification-dropdown'

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <header
      className={cn(
        "h-20 shrink-0 flex items-center justify-between px-8 border-b z-40 transition-all duration-300",
        "bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-md"
      )}
    >
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="search" 
            placeholder="Buscar productos, ventas o facturas..." 
            className="w-full h-11 pl-12 pr-4 bg-muted/30 border border-border/50 focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/5 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-muted-foreground/60 placeholder:font-medium"
          />
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-6">
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <Button 
            variant="ghost" 
            size="icon" 
            asChild
            className="size-11 rounded-2xl bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all active:scale-95"
          >
            <Link href="/ajustes">
              <Settings className="size-5" />
            </Link>
          </Button>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-border" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-4 group cursor-pointer p-1 rounded-2xl hover:bg-muted/50 transition-all active:scale-95">
              <div className="flex flex-col items-end">
                <span className="text-sm font-black uppercase text-foreground leading-none tracking-tight">
                  {user?.name || "Admin User"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  SUCURSAL: {user?.sucursalesIds?.[0]?.toUpperCase() || "S/D"}
                </span>
              </div>
              <Avatar className="size-11 rounded-2xl border-2 border-border/50 group-hover:border-primary transition-colors shadow-sm ring-offset-background group-hover:ring-2 group-hover:ring-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-2 rounded-[1.5rem] p-2 bg-card/95 backdrop-blur-2xl border-border/50 shadow-2xl" align="end" forceMount>
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-primary">Mi Cuenta</p>
                <p className="text-[10px] font-medium leading-none text-muted-foreground">{user?.email || "admin@frutapos.com"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuGroup className="space-y-1">
              <DropdownMenuItem onClick={() => router.push('/perfil')} className="rounded-xl px-3 py-2 flex items-center gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-bold uppercase text-[10px] tracking-wider">
                <User className="size-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/ajustes')} className="rounded-xl px-3 py-2 flex items-center gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-bold uppercase text-[10px] tracking-wider">
                <Settings className="size-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl px-3 py-2 flex items-center gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors font-bold uppercase text-[10px] tracking-wider">
                <Shield className="size-4" />
                Seguridad
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 flex items-center gap-2 focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer transition-colors font-bold uppercase text-[10px] tracking-wider"
            >
              <LogOut className="size-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

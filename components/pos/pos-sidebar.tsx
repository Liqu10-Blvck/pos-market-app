"use client"

import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart,
  Calculator,
  FileText,
  Settings,
  LogOut,
  User,
  BarChart3,
  Package,
} from "lucide-react"

interface POSSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  onCashCount: () => void
  onReports: () => void
}

export function POSSidebar({ activeView, onViewChange, onCashCount, onReports }: POSSidebarProps) {
  const { user, logout } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShoppingCart className="size-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">FrutaPOS</span>
            <span className="text-xs text-muted-foreground">Punto de Venta</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "pos"}
                  onClick={() => onViewChange("pos")}
                  tooltip="Venta"
                >
                  <ShoppingCart className="size-4" />
                  <span>Venta</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "products"}
                  onClick={() => onViewChange("products")}
                  tooltip="Productos"
                >
                  <Package className="size-4" />
                  <span>Productos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Administraci&oacute;n</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onCashCount} tooltip="Arqueo de Caja">
                  <Calculator className="size-4" />
                  <span>Arqueo de Caja</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onReports} tooltip="Informes">
                  <BarChart3 className="size-4" />
                  <span>Informes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeView === "settings"}
                    onClick={() => onViewChange("settings")}
                    tooltip="Configuraci&oacute;n"
                  >
                    <Settings className="size-4" />
                    <span>Configuraci&oacute;n</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={user?.name || "Usuario"}>
              <User className="size-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role === "admin" ? "Administrador" : "Cajero"}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Cerrar sesi&oacute;n">
              <LogOut className="size-4" />
              <span>Cerrar sesi&oacute;n</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

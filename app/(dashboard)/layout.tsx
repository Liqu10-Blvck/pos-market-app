'use client'

import { useEffect, useState } from 'react'
import { Aside } from '@/components/layout/aside'
import { Header } from '@/components/layout/header'
import { QuickOnboarding } from '@/components/dashboard/quick-onboarding'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-t-2 border-primary" />
      </div>
    )
  }

  // No renderizar el layout en la página de login si por error cae aquí
  if (pathname === '/') return <>{children}</>

  return (
    <div className="flex h-screen bg-background text-foreground selection:bg-primary/30 overflow-hidden transition-colors duration-300">
      <Aside isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Decorative mask for premium feel */}
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-hidden p-4 sm:p-8 pt-6 z-10 w-full">
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
            {children}
          </div>
        </main>

        <QuickOnboarding />
      </div>
    </div>
  )
}

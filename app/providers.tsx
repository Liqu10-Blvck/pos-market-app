'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from 'sileo'
import { ThemeProvider } from "@/components/theme-provider"

import { useTheme } from 'next-themes'

function ToasterWrapper() {
  const { theme } = useTheme()
  return (
    <Toaster
      position="top-right"
      offset={32}
      theme={theme === 'system' ? 'system' : (theme as "light" | "dark" | "system")}
    />
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <ToasterWrapper />
      </AuthProvider>
    </ThemeProvider>
  )
}

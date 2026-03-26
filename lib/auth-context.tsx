"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { User } from "./pos-types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@fruta.pos": {
    password: "admin123",
    user: { id: "1", name: "Administrador", email: "admin@fruta.pos", role: "admin" },
  },
  "cajero@fruta.pos": {
    password: "cajero123",
    user: { id: "2", name: "Cajero 1", email: "cajero@fruta.pos", role: "cashier" },
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const demoUser = DEMO_USERS[email.toLowerCase()]
    if (demoUser && demoUser.password === password) {
      setUser(demoUser.user)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

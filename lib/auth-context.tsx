"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import type { User } from "./pos-types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || "Usuario",
          email: firebaseUser.email || "",
          role: "cashier"
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error)
      console.error("Código de error:", error.code)
      console.error("Mensaje:", error.message)
      
      // Mostrar error más descriptivo
      if (error.code === 'auth/user-not-found') {
        console.error("Usuario no encontrado. Crea una cuenta en /registro")
      } else if (error.code === 'auth/wrong-password') {
        console.error("Contraseña incorrecta")
      } else if (error.code === 'auth/invalid-credential') {
        console.error("Credenciales inválidas. El usuario no existe o la contraseña es incorrecta")
      }
      
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
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

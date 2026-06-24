"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "./firebase"
import type { User } from "./types/pos"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  actualizarPerfil: (nombre: string, role: 'admin' | 'cashier') => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.activo === false) {
              await firebaseSignOut(auth)
              setUser(null)
            } else {
              setUser({
                id: firebaseUser.uid,
                name: userData.nombre || firebaseUser.displayName || firebaseUser.email || "Usuario",
                email: firebaseUser.email || "",
                role: userData.role || "admin"
              })
            }
          } else {
            // Si es el primer usuario o no se encuentra el documento, lo creamos como admin automáticamente
            const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Usuario";
            const newUser = {
              nombre: name,
              email: firebaseUser.email || "",
              role: "admin",
              activo: true,
              createdAt: Timestamp.now()
            };
            try {
              await setDoc(doc(db, "usuarios", firebaseUser.uid), newUser);
            } catch (writeErr) {
              console.error("Error al auto-crear usuario en Firestore:", writeErr);
            }
            setUser({
              id: firebaseUser.uid,
              name: name,
              email: firebaseUser.email || "",
              role: "admin"
            })
          }
        } catch (error) {
          console.error("Error al recuperar datos del usuario:", error)
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || "Usuario",
            email: firebaseUser.email || "",
            role: "admin"
          })
        }
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

  const actualizarPerfil = useCallback(async (nombre: string, role: 'admin' | 'cashier'): Promise<void> => {
    if (!user) return
    try {
      const userRef = doc(db, "usuarios", user.id)
      await updateDoc(userRef, {
        nombre,
        role,
        updatedAt: Timestamp.now()
      })
      setUser(prev => prev ? {
        ...prev,
        name: nombre,
        role
      } : null)
    } catch (error) {
      console.error("Error al actualizar perfil:", error)
      throw error
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, actualizarPerfil, loading }}>
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

"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { LogIn, AlertCircle } from "lucide-react"
import { BrandLogo } from "@/components/ui/brand-logo"
import Link from "next/link"

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(email, password)
      
      if (!success) {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.")
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center justify-center pb-6">
          <BrandLogo className="mb-2" showText={true} />
          <p className="text-sm font-medium text-muted-foreground opacity-70">
            Ingresa para gestionar tu mercado
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Correo electr&oacute;nico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@fruta.pos"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contrase&ntilde;a</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  autoComplete="current-password"
                />
              </Field>
            </FieldGroup>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="mt-6 w-full" disabled={isLoading}>
              <LogIn className="mr-2 size-4" />
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>

            <div className="mt-4 text-center">
              <span className="text-xs text-muted-foreground">¿No tienes cuenta? </span>
              <Link href="/registro" className="text-xs font-bold text-primary hover:underline transition-all">
                Regístrate aquí
              </Link>
            </div>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}

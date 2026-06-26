'use client';

import { useRouter } from 'next/navigation';
import { useRegistroStore } from './hooks/useRegistroStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  
  const nombre = useRegistroStore((state) => state.nombre);
  const email = useRegistroStore((state) => state.email);
  const password = useRegistroStore((state) => state.password);
  const confirmPassword = useRegistroStore((state) => state.confirmPassword);
  const error = useRegistroStore((state) => state.error);
  const isLoading = useRegistroStore((state) => state.isLoading);

  const setNombre = useRegistroStore((state) => state.setNombre);
  const setEmail = useRegistroStore((state) => state.setEmail);
  const setPassword = useRegistroStore((state) => state.setPassword);
  const setConfirmPassword = useRegistroStore((state) => state.setConfirmPassword);
  const registrarCuenta = useRegistroStore((state) => state.registrarCuenta);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrarCuenta(router);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm bg-card">
        <CardHeader className="flex flex-col items-center justify-center pb-6">
          <BrandLogo className="mb-2" showText={true} />
          <p className="text-sm font-medium text-muted-foreground opacity-70">
            Crea tu cuenta de administrador de FrutaPOS
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="nombre">Nombre Completo</FieldLabel>
                <Input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Nicolás Cortés"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
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
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                  autoComplete="new-password"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirmar Contraseña</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  autoComplete="new-password"
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
              <UserPlus className="mr-2 size-4" />
              {isLoading ? 'Registrando...' : 'Registrar Cuenta'}
            </Button>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

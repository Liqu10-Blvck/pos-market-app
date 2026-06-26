'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BrandLogo } from '@/components/ui/brand-logo';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'cashier';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/');
      } else if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
        // Redirigir a inicio si no tiene permisos
        router.replace('/inicio');
      }
    }
  }, [isAuthenticated, loading, user, requiredRole, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background">
        <BrandLogo className="h-20 animate-pulse" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest opacity-60">
          CARGANDO SEGURIDAD...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirigiendo
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return null; // Redirigiendo
  }

  return <>{children}</>;
}

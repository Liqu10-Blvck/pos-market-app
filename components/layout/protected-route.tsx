'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BrandLogo } from '@/components/ui/brand-logo';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, loading, router]);

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
    return null; // Will redirect shortly
  }

  return <>{children}</>;
}

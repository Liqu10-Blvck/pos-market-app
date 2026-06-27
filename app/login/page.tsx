'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoginScreen } from '@/components/pos/login-screen';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/inicio');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  return <LoginScreen />;
}

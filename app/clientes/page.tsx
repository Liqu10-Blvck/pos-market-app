'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useClientesStore } from './hooks/useClientesStore';
import { filtrarClientes } from './utils/clientesUtils';
import { ClientCard } from './components/ClientCard';
import { ClientModal } from './components/ClientModal';
import { AbonoModal } from './components/AbonoModal';
import { ClientDetailModal } from './components/ClientDetailModal';

import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Users, Search, Plus } from 'lucide-react';

function ClientesPage() {
  // Global Store values and actions
  const clientes = useAppStore((state) => state.clientes);
  const iniciarClientesListener = useAppStore((state) => state.iniciarClientesListener);

  // Local Clientes Store values and actions
  const searchQuery = useClientesStore((state) => state.searchQuery);
  const setSearchQuery = useClientesStore((state) => state.setSearchQuery);
  const handleAbrirModal = useClientesStore((state) => state.handleAbrirModal);

  // Setup Firestore listener on mount and cleanup on unmount
  useEffect(() => {
    const unsubscribe = iniciarClientesListener();
    return () => unsubscribe();
  }, [iniciarClientesListener]);

  // Filter clients using helper utility
  const clientesFiltrados = filtrarClientes(clientes, searchQuery);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
          <div className="flex min-h-[72px] flex-col justify-center gap-1.5 sm:min-h-[84px] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight">
                <Users className="h-8 w-8 shrink-0" />
                Gestión de Clientes
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Administra saldos, créditos y datos de contacto.
              </p>
            </div>
            <Button onClick={() => handleAbrirModal()} size="lg" className="w-full sm:w-auto rounded-2xl font-bold shadow-md h-12 bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0">
              <Plus className="mr-2 h-5 w-5" />
              Registrar Cliente
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-4 sm:py-6">
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-border/60 bg-white/50 dark:bg-black/20 rounded-xl"
          />
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold">No se encontraron clientes</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-6">
              Prueba con otro nombre o agrega un nuevo cliente al sistema.
            </p>
            <Button onClick={() => handleAbrirModal()} variant="outline" className="rounded-xl">
              Registrar Primer Cliente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {clientesFiltrados.map((cliente) => (
              <ClientCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <ClientModal />
      <AbonoModal />
      <ClientDetailModal />
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ClientesPage />
    </ProtectedRoute>
  );
}

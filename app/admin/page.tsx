'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAdminStore } from './hooks/useAdminStore';
import { filtrarProductosAdmin } from './utils/adminUtils';
import { ProductCard } from './components/ProductCard';
import { ShoppingListTable } from './components/ShoppingListTable';
import { ProductModal } from './components/ProductModal';
import { PurchaseModal } from './components/PurchaseModal';

import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { Plus, Package } from 'lucide-react';

function AdminPage() {
  // Global Store values and actions
  const productos = useAppStore((state) => state.productos);
  const iniciarProductosListener = useAppStore((state) => state.iniciarProductosListener);

  // Local Admin Store values and actions
  const tabActiva = useAdminStore((state) => state.tabActiva);
  const setTabActiva = useAdminStore((state) => state.setTabActiva);
  const handleAbrirModal = useAdminStore((state) => state.handleAbrirModal);

  // Setup Firestore listener on mount and cleanup on unmount
  useEffect(() => {
    const unsubscribe = iniciarProductosListener();
    return () => unsubscribe();
  }, [iniciarProductosListener]);

  // Filter products using helper utility
  const productosFiltrados = filtrarProductosAdmin(productos, tabActiva);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-6 py-6">
        
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              <Package className="h-7 w-7 text-primary shrink-0" />
              Administración de Productos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium">
              Gestiona el catálogo. Toma fotos con tu celular y autocompleta con Inteligencia Artificial.
            </p>
          </div>
          <Button 
            onClick={() => handleAbrirModal()} 
            size="lg" 
            className="w-full sm:w-auto rounded-2xl font-bold shadow-md h-12 bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="mr-2 h-5 w-5" />
            {tabActiva === 'interes' ? 'Nueva Cotización / Interés' : 'Nuevo Producto'}
          </Button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border/50 mb-6 gap-6 overflow-x-auto">
          <button
            onClick={() => setTabActiva('catalogo')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap ${
              tabActiva === 'catalogo'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Catálogo Activo ({productos.filter(p => p.es_interes !== true).length})
          </button>
          
          <button
            onClick={() => setTabActiva('interes')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 relative whitespace-nowrap ${
              tabActiva === 'interes'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lista de Compra ({productos.filter(p => p.es_interes === true || (p.activo !== false && p.stock_actual <= 5)).length})
          </button>
        </div>

        {/* Grid or Table of Products */}
        {tabActiva === 'catalogo' ? (
          <>
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-[2rem] bg-card/30">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40" />
                <h3 className="text-lg font-bold mb-1">Catálogo Vacío</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  Comienza agregando productos a tu catálogo activo.
                </p>
                <Button onClick={() => handleAbrirModal()} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Producto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {productosFiltrados.map((producto) => (
                  <ProductCard key={producto.id} producto={producto} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Lista de Compra Tabular */}
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-[2rem] bg-card/30">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-40" />
                <h3 className="text-lg font-bold mb-1">Lista de Compra Vacía</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  No hay productos que requieran reposición ni cotizaciones pendientes.
                </p>
                <Button onClick={() => handleAbrirModal()} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Cotización
                </Button>
              </div>
            ) : (
              <div className="border border-border/50 overflow-hidden rounded-2xl bg-card shadow-sm">
                <ShoppingListTable productosFiltrados={productosFiltrados} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales Modulares */}
      <ProductModal />
      <PurchaseModal />
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminPage />
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lote } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  Package, 
  Plus, 
  Search, 
  Calendar, 
  TrendingUp, 
  ChevronRight,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { formatCLPCurrency } from '@/lib/utils';

export default function LogisticaPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'lotes'),
      orderBy('fecha_ingreso', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lote[]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppNav />
      
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight">Logística</h1>
            <p className="text-muted-foreground mt-1">Gestión de inventario masivo y trazabilidad de lotes.</p>
          </div>
          <Link href="/logistica/ingreso">
            <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
              <Plus className="h-6 w-6 mr-2" /> Nuevo Ingreso
            </Button>
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Lotes este mes</p>
            <p className="text-3xl font-black mt-1">42 <span className="text-sm font-bold text-success">+12%</span></p>
          </div>
          <div className="bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Reservas Activas</p>
            <p className="text-3xl font-black mt-1">18</p>
          </div>
          <div className="bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Bajo Stock</p>
            <p className="text-3xl font-black mt-1">5 <span className="text-xs font-bold text-muted-foreground">Productos</span></p>
          </div>
        </div>

        {/* Lotes Recientes Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" /> Recién Llegados
            </h2>
            <Button variant="ghost" className="text-sm font-bold text-muted-foreground">Ver todo</Button>
          </div>

          <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
            {lotes.length === 0 && !loading ? (
              <div className="p-20 text-center opacity-40">
                <Package className="h-16 w-16 mx-auto mb-4" strokeWidth={1} />
                <p className="text-lg font-bold">No hay ingresos registrados aún</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {lotes.map((lote) => (
                  <div key={lote.id} className="p-6 hover:bg-muted/30 transition-all flex items-center gap-6 group">
                    <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center border border-border/20 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-black text-primary/40 uppercase">{lote.variedad[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-lg truncate uppercase">{lote.nombre_producto} - {lote.variedad}</h4>
                        <Badge variant="outline" className="text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20">
                          {lote.origen}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {lote.fecha_ingreso.toDate().toLocaleDateString()}</span>
                        <span>{lote.tipo_bulto}: {lote.envase_cantidad_total} Cajas</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">{lote.stock_actual_kg.toFixed(0)} KG</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Stock Disponible</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

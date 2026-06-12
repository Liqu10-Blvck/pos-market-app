'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Lote } from '@/lib/types/pos';
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
  AlertTriangle,
  Star,
  Store
} from 'lucide-react';
import Link from 'next/link';
import { formatCLPCurrency } from '@/lib/utils';
import { ReservaModal } from '@/components/logistica/reserva-modal';
import { AjusteStockModal } from '@/components/logistica/ajuste-stock-modal';
import { AjustesHistorial } from '@/components/logistica/ajustes-historial';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function LogisticaPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [stats, setStats] = useState({ lotesMes: 0, reservasActivas: 0, bajoStock: 0 });
  const [loading, setLoading] = useState(true);
  const [loteParaReservar, setLoteParaReservar] = useState<Lote | null>(null);
  const [modalReservaOpen, setModalReservaOpen] = useState(false);
  const [loteParaAjustar, setLoteParaAjustar] = useState<Lote | null>(null);
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos'); // 'todos', 'bajo-stock', 'internacional', 'nacional'

  const { user } = useAuth();
  const [lotesOriginales, setLotesOriginales] = useState<Lote[]>([]);

  useEffect(() => {
    if (!user?.tenantId) return;

    const tenantId = user.tenantId;
    const sucursalId = user.sucursalesIds?.[0] || 'default-sucursal';

    // Query lotes (Removed orderby to skip index)
    const q = query(
      collection(db, 'lotes'),
      where('tenantId', '==', tenantId),
      where('sucursalId', '==', sucursalId),
      limit(100)
    );

    const unsubLotes = onSnapshot(q, (snapshot) => {
      const lotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lote[];
      // Memory sort
      const sorted = lotesData.sort((a, b) => b.fecha_ingreso.toMillis() - a.fecha_ingreso.toMillis());
      setLotes(sorted);
      setStats(prev => ({ ...prev, lotesMes: lotesData.length }));
      setLoading(false);
    });

    const unsubReservas = onSnapshot(
      query(collection(db, 'reservas'), where('tenantId', '==', tenantId)), 
      (snapshot) => {
        const activas = snapshot.docs.filter(doc => doc.data().activo).length;
        setStats(prev => ({ ...prev, reservasActivas: activas }));
      }
    );

    const unsubProductos = onSnapshot(
      query(collection(db, 'productos'), where('tenantId', '==', tenantId)), 
      (snapshot) => {
        const bajo = snapshot.docs.filter(doc => (doc.data().stock_actual || 0) < 50).length;
        setStats(prev => ({ ...prev, bajoStock: bajo }));
      }
    );

    return () => {
      unsubLotes();
      unsubReservas();
      unsubProductos();
    };
  }, [user?.tenantId, user?.sucursalesIds?.[0]]);

  const lotesFiltrados = lotes.filter(lote => {
    const matchesSearch = 
      lote.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lote.variedad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lote.origen.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'bajo-stock') return matchesSearch && (lote.stock_actual_kg < 100);
    if (filterType === 'internacional') return matchesSearch && (lote.origen.toLowerCase() !== 'chile');
    if (filterType === 'nacional') return matchesSearch && (lote.origen.toLowerCase() === 'chile');
    
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0 -mx-4 -mt-6 sm:-mx-8 sm:-mt-6 border-b border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:px-8">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            LOGÍSTICA <span className="text-primary">&</span> INVENTARIO
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">
            Gestión de trazabilidad y abastecimiento masivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/logistica/ingreso">
            <Button className="h-12 px-6 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Ingreso
            </Button>
          </Link>
        </div>
      </header>

      {/* Tools Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por producto, variedad u origen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-muted/40 border border-border/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-sm"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-2xl border border-border/40">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'bajo-stock', label: 'Bajo Stock' },
            { id: 'nacional', label: 'Nacional' },
            { id: 'internacional', label: 'Importados' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={cn(
                "px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterType === f.id 
                  ? "bg-foreground text-background shadow-lg" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 -mr-2 space-y-10 pb-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group overflow-hidden bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <TrendingUp className="size-24 -rotate-12" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Lotes este Mes</p>
            <p className="text-4xl font-black mt-1 tracking-tighter">{stats.lotesMes}</p>
          </div>

          <div className="relative group overflow-hidden bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Star className="size-24 -rotate-12" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500 group-hover:scale-110 transition-transform">
              <Star className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Reservas Activas</p>
            <p className="text-4xl font-black mt-1 tracking-tighter">{stats.reservasActivas}</p>
          </div>

          <div className="relative group overflow-hidden bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-destructive/5 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <AlertTriangle className="size-24 -rotate-12" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 text-destructive group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Stock Crítico</p>
            <p className="text-4xl font-black mt-1 tracking-tighter">{stats.bajoStock}</p>
          </div>
        </div>

        {/* Lotes Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2 uppercase italic tracking-tight">
              <Box className="h-5 w-5 text-primary" /> Lotes Disponibles
            </h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Mostrando {lotesFiltrados.length} resultados
            </p>
          </div>

          {lotesFiltrados.length === 0 ? (
            <div className="p-20 text-center bg-card border border-border/40 rounded-[2.5rem] border-dashed">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" strokeWidth={1} />
              <p className="text-lg font-bold text-muted-foreground">No se encontraron lotes que coincidan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {lotesFiltrados.map((lote) => {
                const stockPercent = (lote.stock_actual_kg / (lote.envase_cantidad_total * 20)) * 100; // Mock total cap
                const isCritical = lote.stock_actual_kg < 100;
                
                return (
                  <div 
                    key={lote.id} 
                    className={cn(
                      "group relative bg-card border border-border/40 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 transition-all hover:shadow-2xl hover:shadow-primary/5",
                      isCritical && "border-destructive/20 bg-destructive/[0.01]"
                    )}
                  >
                    <div className="h-20 w-20 rounded-3xl bg-background flex flex-col items-center justify-center border border-border/20 shadow-inner shrink-0 scale-100 group-hover:scale-105 transition-transform duration-500">
                      <span className="text-4xl font-black text-primary/30 uppercase">{lote.variedad[0]}</span>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-black text-2xl truncate uppercase tracking-tighter">
                              {lote.nombre_producto} <span className="text-muted-foreground font-medium italic">/ {lote.variedad}</span>
                            </h4>
                            <Badge className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                              isCritical ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary border-primary/20"
                            )}>
                              {isCritical ? 'Crítico' : 'Estable'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {lote.fecha_ingreso.toDate().toLocaleDateString('es-CL', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="flex items-center gap-1.5"><Store className="h-3 w-3" /> {lote.origen}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-3xl font-black text-foreground tracking-tighter tabular-nums">
                              {lote.stock_actual_kg.toLocaleString()} <span className="text-xs uppercase ml-1">kg</span>
                            </p>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                              {lote.stock_actual_cajas ?? lote.envase_cantidad_total} {lote.tipo_bulto || 'Cajas'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stock Health Bar */}
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex items-center p-[2px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(stockPercent, 100)}%` }}
                          className={cn(
                            "h-full rounded-full",
                            isCritical ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setLoteParaAjustar(lote);
                          setModalAjusteOpen(true);
                        }}
                        className="flex-1 md:flex-none rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-6 border-border/40 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
                      >
                        Ajustar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setLoteParaReservar(lote);
                          setModalReservaOpen(true);
                        }}
                        className="flex-1 md:flex-none rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-6 border-border/40 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                      >
                        Reservar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Historial Auditoría */}
        <section>
          <AjustesHistorial />
        </section>
      </div>

      <ReservaModal 
        lote={loteParaReservar} 
        open={modalReservaOpen} 
        onClose={() => setModalReservaOpen(false)} 
        onConfirm={() => {
          setModalReservaOpen(false);
          setLoteParaReservar(null);
        }} 
      />

      <AjusteStockModal
        lote={loteParaAjustar}
        open={modalAjusteOpen}
        onClose={() => setModalAjusteOpen(false)}
        onConfirm={() => {
          setModalAjusteOpen(false);
          setLoteParaAjustar(null);
        }}
      />
    </div>
  );
}

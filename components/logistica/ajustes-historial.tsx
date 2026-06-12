'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { AjusteStock } from '@/lib/types/pos';
import { 
  AlertTriangle, 
  Calendar, 
  User, 
  Box, 
  Scale,
  MessageSquare,
  Trash2
} from 'lucide-react';

export function AjustesHistorial() {
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.tenantId) return;

    const q = query(
      collection(db, 'ajustes_stock'),
      where('tenantId', '==', user.tenantId),
      orderBy('fecha', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AjusteStock[];
      setAjustes(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.tenantId]);

  if (loading) return <div className="p-10 text-center animate-pulse opacity-40">Cargando auditoría...</div>;

  if (ajustes.length === 0) return (
    <div className="p-10 text-center opacity-30 bg-muted/20 rounded-[2rem] border border-dashed border-border/40">
       <AlertTriangle className="h-10 w-10 mx-auto mb-3" strokeWidth={1} />
       <p className="font-bold text-sm">No hay ajustes de stock registrados.</p>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-black uppercase flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" /> Historial de Auditoría
        </h2>
        <span className="text-[10px] font-black uppercase opacity-40">Últimos 20 movimientos</span>
      </div>

      <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="divide-y divide-border/10">
          {ajustes.map((aju) => (
            <div key={aju.id} className="p-5 hover:bg-muted/30 transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase leading-none mb-1">{aju.nombre_producto}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                       <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {aju.fecha?.toDate().toLocaleString()}</span>
                       <span className="flex items-center gap-1"><User className="h-3 w-3" /> {aju.usuario_nombre || 'Operador'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {aju.cantidad_kg > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-black text-destructive leading-none">-{aju.cantidad_kg} KG</p>
                      <p className="text-[8px] font-black opacity-40 uppercase">Ajuste Peso</p>
                    </div>
                  )}
                  {aju.cantidad_cajas > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-black text-destructive leading-none">-{aju.cantidad_cajas} CAJAS</p>
                      <p className="text-[8px] font-black opacity-40 uppercase">Ajuste Unid.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-xl border border-border/10">
                <p className="text-[10px] font-black uppercase opacity-40 flex items-center gap-1.5 mb-1.5">
                   <MessageSquare className="h-3 w-3" /> Motivo del Ajuste
                </p>
                <p className="text-xs font-medium text-foreground italic leading-relaxed">
                  "{aju.motivo}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

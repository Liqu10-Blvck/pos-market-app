'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Package, 
  BadgeDollarSign 
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { Notificacion } from '@/lib/types/pos';
import { NotificationService } from '@/lib/services/notification.service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.tenantId) return;

    const unsub = NotificationService.subscribe(
      user.tenantId,
      user.sucursalesIds?.[0],
      (newNotifs) => {
        setNotifications(newNotifs);
      }
    );

    // Bootstrap if no notifications exist
    NotificationService.bootstrap(user.tenantId, user.sucursalesIds?.[0]);

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.leida).length;

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.marcarLeida(id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.tenantId) return;
    await NotificationService.marcarTodasComoLeidas(
      user.tenantId, 
      user.sucursalesIds?.[0],
      notifications
    );
  };

  const getIcon = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'stock': return <Package className="h-4 w-4 text-blue-500" />;
      case 'venta': return <BadgeDollarSign className="h-4 w-4 text-indigo-500" />;
      default: return <Info className="h-4 w-4 text-sky-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-11 rounded-2xl bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all active:scale-95 relative"
        >
          <Bell className="size-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="h-5 min-w-5 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-black border-2 border-background rounded-full">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 bg-card/95 backdrop-blur-2xl border-border/50 shadow-2xl rounded-[2rem] overflow-hidden" align="end">
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Notificaciones</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
              Tienes {unreadCount} mensajes sin leer
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="h-8 rounded-xl text-[10px] font-black uppercase hover:text-primary"
            >
              <CheckCheck className="mr-2 h-3 w-3" />
              Marcar todo
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] p-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4 opacity-50">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sin notificaciones nuevas</p>
                <p className="text-[10px] text-muted-foreground mt-1 px-4">Te avisaremos cuando suceda algo importante en tu sucursal.</p>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div 
                  key={n.id}
                  onClick={() => !n.leida && handleMarkAsRead(n.id)}
                  className={cn(
                    "p-4 border-b last:border-0 cursor-pointer transition-all hover:bg-muted/30 group relative overflow-hidden",
                    !n.leida && "bg-primary/[0.02]"
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "mt-1 size-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                      n.tipo === 'info' && "bg-sky-500/10",
                      n.tipo === 'success' && "bg-emerald-500/10",
                      n.tipo === 'warning' && "bg-amber-500/10",
                      n.tipo === 'error' && "bg-destructive/10",
                      n.tipo === 'stock' && "bg-blue-500/10",
                      n.tipo === 'venta' && "bg-indigo-500/10"
                    )}>
                      {getIcon(n.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-xs font-black uppercase truncate",
                          !n.leida ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {n.titulo}
                        </p>
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0 uppercase">
                          {formatDistanceToNow(n.fecha.toDate(), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {n.mensaje}
                      </p>
                    </div>
                    {!n.leida && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/20">
            <Button 
                variant="ghost" 
                className="w-full rounded-xl text-[10px] font-black uppercase text-muted-foreground hover:text-foreground"
            >
              Ver todo el historial
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

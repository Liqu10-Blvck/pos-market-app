'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Cliente, PagoCredito } from '@/lib/types/pos';
import { ClienteService } from '@/lib/services/cliente.service';
import { ClienteDetalleModal } from '@/components/clientes/cliente-detalle-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '@/lib/utils';
import { Plus, UserPlus, Users, Search, Phone, History, CreditCard, Banknote, FileText, ArrowUpRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [clienteAbono, setClienteAbono] = useState<Cliente | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [clienteDetalle, setClienteDetalle] = useState<Cliente | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    telefono: '',
    saldo_deuda: '0',
    limite_credito: '0',
  });

  const [abonoData, setAbonoData] = useState({
    monto: '',
    metodo: 'efectivo',
    comprobante: '',
    observaciones: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.tenantId) return;

    const q = query(
      collection(db, 'clientes'), 
      where('tenantId', '==', user.tenantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[];
      setClientes(clientesData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });

    return () => unsubscribe();
  }, [user]);

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.telefono?.includes(searchQuery)
  );

  const handleAbrirModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditando(cliente);
      setFormData({
        nombre: cliente.nombre,
        rut: cliente.rut || '',
        telefono: cliente.telefono || '',
        saldo_deuda: formatCLPCurrency(cliente.saldo_pendiente || 0),
        limite_credito: formatCLPCurrency(cliente.limite_credito || 0),
      });
    } else {
      setEditando(null);
      setFormData({ nombre: '', rut: '', telefono: '', saldo_deuda: '0', limite_credito: '0' });
    }
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }

    try {
      const saldoFinal = parseChileanMoneyInput(formData.saldo_deuda);
      const limiteFinal = parseChileanMoneyInput(formData.limite_credito);

      const clienteData = {
        nombre: formData.nombre,
        rut: formData.rut,
        telefono: formData.telefono,
        saldo_deuda: saldoFinal,
        saldo_pendiente: saldoFinal,
        limite_credito: limiteFinal,
        activo: true,
        updatedAt: serverTimestamp()
      };

      if (editando) {
        await updateDoc(doc(db, 'clientes', editando.id), clienteData);
        toast({ title: 'Cliente actualizado' });
      } else {
        await addDoc(collection(db, 'clientes'), {
          ...clienteData,
          tenantId: user?.tenantId || 'default-tenant',
          createdAt: serverTimestamp()
        });
        toast({ title: 'Cliente registrado' });
      }

      setModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRegistrarAbono = async () => {
    if (!clienteAbono || !abonoData.monto) return;

    try {
      await ClienteService.registrarAbono(
        clienteAbono.id,
        parseChileanMoneyInput(abonoData.monto),
        abonoData.metodo,
        abonoData.observaciones
      );

      toast({ title: 'Abono registrado', description: 'El saldo del cliente ha sido actualizado.' });
      setModalAbonoOpen(false);
      setAbonoData({ monto: '', metodo: 'efectivo', comprobante: '', observaciones: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="w-full pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0 -mx-4 -mt-6 sm:-mx-8 sm:-mt-6 border-b border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            CLIENTES <span className="text-primary">& CRÉDITOS</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
            CONTROL DE DEUDAS, LÍMITES DE CUPO Y REGISTRO DE ABONOS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleAbrirModal()} 
            className="h-12 rounded-2xl gap-2 font-bold shadow-soft px-8 bg-primary hover:bg-primary/90 text-white"
          >
            <UserPlus className="h-5 w-5" />
            NUEVO CLIENTE
          </Button>
        </div>
      </header>

      <div className="w-full">
        <div className="mb-10 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-14 border-2 border-border/40 bg-card/40 rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 transition-all text-lg"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => {
            const deuda = cliente.saldo_pendiente || 0;
            const limite = cliente.limite_credito || 0;
            const disponible = Math.max(0, limite - deuda);
            const porcentajeUso = limite > 0 ? (deuda / limite) * 100 : 0;

            return (
              <Card key={cliente.id} className="group overflow-hidden rounded-3xl border-border/40 shadow-soft transition-all hover:shadow-hard hover:border-primary/20 bg-card/60">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-xl shadow-inner">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black tracking-tight">{cliente.nombre}</CardTitle>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-tight">
                            <Phone className="h-3 w-3" />
                            {cliente.telefono || 'Sin teléfono'}
                          </div>
                          {cliente.rut && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-primary/70 uppercase tracking-widest italic">
                              <FileText className="h-3 w-3" />
                              RUT: {cliente.rut}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 rounded-2xl bg-muted/30 p-4 border border-border/10">
                    <div className="flex justify-between items-end">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 italic">Saldo Pendiente</span>
                        <div className={`text-2xl font-black tracking-tighter ${deuda > 0 ? 'text-amber-500' : 'text-success'}`}>
                          {formatCLPCurrency(deuda)}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Cupo Disponible</span>
                        <div className="text-sm font-bold opacity-80">{formatCLPCurrency(disponible)}</div>
                      </div>
                    </div>
                    
                    {limite > 0 && (
                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, porcentajeUso)}%` }}
                            className={`h-full ${porcentajeUso > 90 ? 'bg-destructive' : porcentajeUso > 70 ? 'bg-amber-500' : 'bg-primary'}`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black opacity-40 uppercase">
                          <span>Uso crédito: {porcentajeUso.toFixed(0)}%</span>
                          <span>Límite: {formatCLPCurrency(limite)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button 
                      onClick={() => { setClienteAbono(cliente); setModalAbonoOpen(true); }}
                      className="h-11 rounded-xl bg-success text-white font-bold gap-2 shadow-sm hover:bg-success/90"
                    >
                      <Banknote className="h-4 w-4" />
                      Abonar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setClienteDetalle(cliente);
                        setModalDetalleOpen(true);
                      }}
                      className="h-11 rounded-xl font-bold gap-2 border-border/60 hover:bg-muted"
                    >
                      <History className="h-4 w-4" />
                      Detalle
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleAbrirModal(cliente)}
                    className="w-full mt-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 h-6 rounded-lg"
                  >
                    Configurar Perfil
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal Alta/Edición Cliente */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-hard">
          <div className="bg-primary p-8 text-white">
             <DialogTitle className="text-2xl font-black uppercase tracking-tight">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
             <DialogDescription className="text-white/60 font-medium font-sans">Configura los datos base y límites comerciales.</DialogDescription>
          </div>
          <div className="p-8 space-y-6 bg-background">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider">Nombre</Label>
                  <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="h-11 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider">RUT</Label>
                  <Input value={formData.rut} onChange={(e) => setFormData({ ...formData, rut: e.target.value })} className="h-11 rounded-xl bg-muted/30 border-none font-bold" placeholder="76.123.456-k" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase opacity-60 tracking-wider">Teléfono</Label>
                <Input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider text-amber-600">Saldo Inicial</Label>
                  <Input 
                    value={formData.saldo_deuda} 
                    onChange={(e) => setFormData({ ...formData, saldo_deuda: normalizeMoneyInput(e.target.value) })}
                    className="h-12 rounded-xl bg-amber-500/10 border-amber-500/30 text-amber-600 font-black text-lg" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider text-primary">Límite Crédito</Label>
                  <Input 
                    value={formData.limite_credito} 
                    onChange={(e) => setFormData({ ...formData, limite_credito: normalizeMoneyInput(e.target.value) })}
                    className="h-12 rounded-xl bg-primary/10 border-primary/30 text-primary font-black text-lg" 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGuardar} className="h-14 w-full rounded-2xl font-black text-lg shadow-hard bg-primary hover:bg-primary-700">
                {editando ? 'GUARDAR CAMBIOS' : 'CREAR CLIENTE'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Abono */}
      <Dialog open={modalAbonoOpen} onOpenChange={setModalAbonoOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-hard">
           <div className="bg-success p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Banknote className="h-8 w-8 text-white" />
                  Registrar Abono
                </DialogTitle>
                <p className="text-white/60 font-medium">Amortizar deuda del cliente mayorista.</p>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6 bg-background">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-success/5 border border-success/20">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40">Cliente</p>
                  <p className="font-black text-lg">{clienteAbono?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase opacity-40">Deuda actual</p>
                  <p className="font-black text-xl text-amber-600">{clienteAbono && formatCLPCurrency(clienteAbono.saldo_pendiente || 0)}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider">Monto del Abono</Label>
                  <Input 
                    value={abonoData.monto} 
                    onChange={(e) => setAbonoData({ ...abonoData, monto: normalizeMoneyInput(e.target.value) })}
                    className="h-14 text-3xl font-black text-center bg-muted/30 border-none rounded-2xl text-success" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider">Nro Comprobante</Label>
                  <Input value={abonoData.comprobante} onChange={(e) => setAbonoData({ ...abonoData, comprobante: e.target.value })} className="h-11 rounded-xl bg-muted/30 border-none font-bold" placeholder="Ej: Transf 1234" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase opacity-60 tracking-wider">Observaciones</Label>
                  <Input value={abonoData.observaciones} onChange={(e) => setAbonoData({ ...abonoData, observaciones: e.target.value })} className="h-11 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
             </div>

             <DialogFooter>
                <Button onClick={handleRegistrarAbono} className="h-16 w-full rounded-2xl bg-success text-lg font-black shadow-hard hover:bg-success-700 gap-3">
                  CONFIRMAR PAGO
                  <ArrowUpRight className="h-6 w-6" />
                </Button>
             </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>
      <ClienteDetalleModal
        cliente={clienteDetalle}
        open={modalDetalleOpen}
        onClose={() => setModalDetalleOpen(false)}
      />
    </div>
  );
}

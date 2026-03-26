'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente } from '@/lib/types/pos';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCLPCurrency, normalizeMoneyInput, parseChileanMoneyInput } from '@/lib/utils';
import { Plus, UserPlus, Users, Search, Phone, History, CreditCard } from 'lucide-react';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    saldo_deuda: '0',
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cliente[];
      setClientes(clientesData.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });

    return () => unsubscribe();
  }, []);

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.telefono?.includes(searchQuery)
  );

  const handleAbrirModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditando(cliente);
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        saldo_deuda: formatCLPCurrency(cliente.saldo_deuda),
      });
    } else {
      setEditando(null);
      setFormData({ nombre: '', telefono: '', saldo_deuda: '0' });
    }
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa el nombre del cliente',
        variant: 'destructive'
      });
      return;
    }

    try {
      const clienteData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        saldo_deuda: parseChileanMoneyInput(formData.saldo_deuda),
        activo: true,
        updatedAt: Timestamp.now()
      };

      if (editando) {
        await updateDoc(doc(db, 'clientes', editando.id), clienteData);
        toast({ title: 'Cliente actualizado' });
      } else {
        await addDoc(collection(db, 'clientes'), {
          ...clienteData,
          createdAt: Timestamp.now()
        });
        toast({ title: 'Cliente registrado' });
      }

      setModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      
      <section className="border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] flex-col justify-center gap-1.5 sm:min-h-[84px]">
            <h1 className="flex items-center gap-3 text-2xl font-black text-primary sm:text-3xl tracking-tight">
              <Users className="h-8 w-8 shrink-0" />
              Gestión de Clientes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Administra saldos, créditos y datos de contacto.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-border/60 bg-white/50 dark:bg-black/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="group overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black shadow-inner">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <CardTitle className="text-lg font-black tracking-tight">{cliente.nombre}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleAbrirModal(cliente)} className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {cliente.telefono || 'Sin teléfono'}
                </div>
                
                <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/10 border border-border/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Saldo Deudor</span>
                    <CreditCard className="h-3.5 w-3.5 opacity-40 text-primary" />
                  </div>
                  <div className={`text-xl font-black tracking-tighter ${cliente.saldo_deuda > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-500'}`}>
                    {formatCLPCurrency(cliente.saldo_deuda)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => handleAbrirModal(cliente)}>
                    Editar Datos
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 text-xs gap-1">
                    <History className="h-3 w-3" /> Ver History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clientesFiltrados.length === 0 && (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold">No se encontraron clientes</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-6">
              Prueba con otro nombre o agrega un nuevo cliente al sistema.
            </p>
            <Button onClick={() => handleAbrirModal()} variant="outline">
              Registrar Primer Cliente
            </Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#080b12]">
          <DialogHeader>
            <DialogTitle>{editando ? 'Actualizar Cliente' : 'Nuevo Registro de Cliente'}</DialogTitle>
            <DialogDescription>
              Administra la información básica y saldos de crédito para este cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del cliente"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono de Contacto</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej: +56 9 1234 5678"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Saldo Deudor Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  value={formData.saldo_deuda}
                  onChange={(e) => setFormData({ ...formData, saldo_deuda: normalizeMoneyInput(e.target.value) })}
                  onBlur={() => setFormData((current) => ({ ...current, saldo_deuda: current.saldo_deuda ? formatCLPCurrency(parseChileanMoneyInput(current.saldo_deuda)) : '0' }))}
                  onFocus={() => setFormData((current) => ({ ...current, saldo_deuda: normalizeMoneyInput(current.saldo_deuda) }))}
                  className="pl-7 h-11 border-amber-200 focus:ring-amber-500"
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Este monto se sumará a las compras fiadas.</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} className="shadow-lg">
              {editando ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

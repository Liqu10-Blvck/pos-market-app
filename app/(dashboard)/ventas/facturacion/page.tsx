'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venta } from '@/lib/types/pos';
import { VentasService } from '@/lib/services/ventas.service';
import { formatCLPCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Search, Filter, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FacturacionPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ventaAfacturar, setVentaAfacturar] = useState<Venta | null>(null);
  const [nroFactura, setNroFactura] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, 'ventas'),
      where('estado_factura', 'in', ['por_facturar', 'facturado'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Venta[];
      setVentas(data.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0)));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleMarcarFacturado = async () => {
    if (!ventaAfacturar || !nroFactura) return;

    try {
      await VentasService.marcarComoFacturado(ventaAfacturar.id, nroFactura);
      toast({ title: 'Factura registrada', description: `Venta #${ventaAfacturar.numero_venta} facturada correctamente.` });
      setVentaAfacturar(null);
      setNroFactura('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredVentas = ventas.filter(v => 
    v.cliente_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.numero_venta.toString().includes(searchQuery)
  );

  const porFacturar = filteredVentas.filter(v => v.estado_factura === 'por_facturar');
  const facturadas = filteredVentas.filter(v => v.estado_factura === 'facturado');

  return (
    <div className="flex w-full flex-col selection:bg-primary/10">
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Receipt className="h-8 w-8 text-primary" strokeWidth={2.5} />
              Control de Facturación
            </h1>
            <p className="text-muted-foreground font-medium">Gestiona y concilia las facturas de tus ventas mayoristas.</p>
          </div>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o nro venta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </header>

        <Tabs defaultValue="pendiente" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/40">
            <TabsTrigger value="pendiente" className="rounded-xl px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Por Facturar
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                {porFacturar.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completado" className="rounded-xl px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Facturados
              <Badge variant="secondary" className="ml-2 bg-success/10 text-success border-none">
                {facturadas.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendiente">
            <Card className="rounded-3xl border-border/40 shadow-soft overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Venta #</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">RUT</TableHead>
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold text-right">Total</TableHead>
                    <TableHead className="font-bold">Estado Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porFacturar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground opacity-40">
                           <CheckCircle2 className="h-12 w-12 mb-3" strokeWidth={1} />
                           <p className="font-medium">Todo al día. No hay facturas pendientes.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    porFacturar.map((venta) => (
                      <TableRow key={venta.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-black">#{venta.numero_venta}</TableCell>
                        <TableCell className="font-semibold">{venta.cliente_nombre || 'Cliente General'}</TableCell>
                        <TableCell className="text-xs font-medium font-sans opacity-70 italic">{venta.cliente_rut || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {venta.fecha.toDate().toLocaleDateString()} {venta.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {formatCLPCurrency(venta.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={venta.estado_pago === 'pagado' ? 'success' : 'warning'} className="uppercase text-[10px] font-black">
                            {venta.estado_pago}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            onClick={() => setVentaAfacturar(venta)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl font-bold gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Facturar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="completado">
            <Card className="rounded-3xl border-border/40 shadow-soft overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Venta #</TableHead>
                    <TableHead className="font-bold">NRO FACTURA</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">RUT</TableHead>
                    <TableHead className="font-bold">Fecha Venta</TableHead>
                    <TableHead className="font-bold text-right">Total</TableHead>
                    <TableHead className="text-right">Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground opacity-40">
                           <AlertCircle className="h-12 w-12 mb-3" strokeWidth={1} />
                           <p className="font-medium">No hay registros de facturas emitidas.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    facturadas.map((venta) => (
                      <TableRow key={venta.id} className="opacity-80 hover:opacity-100 transition-opacity">
                        <TableCell className="font-black text-muted-foreground">#{venta.numero_venta}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-success text-success bg-success/5 font-black text-sm px-3 py-1">
                            {venta.nro_factura}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{venta.cliente_nombre}</TableCell>
                        <TableCell className="text-xs opacity-70 italic">{venta.cliente_rut || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {venta.fecha.toDate().toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCLPCurrency(venta.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-success text-white">EMITIDA</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog para ingresar número de factura */}
      <Dialog open={!!ventaAfacturar} onOpenChange={(open) => !open && setVentaAfacturar(null)}>
        <DialogContent className="rounded-3xl border-none p-0 overflow-hidden sm:max-w-md">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Receipt className="h-8 w-8" strokeWidth={3} />
                Emitir Factura
              </DialogTitle>
            </DialogHeader>
            <div className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-white/10 backdrop-blur-md">
              <div className="space-y-1">
                <p className="text-xs font-bold opacity-60 uppercase">Venta Seleccionada</p>
                <p className="text-lg font-black">#{ventaAfacturar?.numero_venta}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs font-bold opacity-60 uppercase">Monto Total</p>
                <p className="text-xl font-black">{ventaAfacturar && formatCLPCurrency(ventaAfacturar.total)}</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6 bg-background">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <label className="text-sm font-black uppercase tracking-wider text-muted-foreground">Número de Factura Oficial</label>
              </div>
              <Input
                placeholder="Ej: 15420"
                value={nroFactura}
                onChange={(e) => setNroFactura(e.target.value)}
                className="h-14 text-2xl font-black bg-muted/30 border-none rounded-2xl focus:ring-4 focus:ring-primary/20 text-center"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground font-medium text-center italic">
                Asegúrate de que coincida con el documento del SII / Sistema de facturación externa.
              </p>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button 
                onClick={handleMarcarFacturado}
                disabled={!nroFactura}
                className="h-16 w-full rounded-2xl bg-primary text-lg font-black shadow-hard hover:bg-primary-700 active:scale-95 transition-all gap-3"
              >
                REGISTRAR FACTURACIÓN
                <ArrowRight className="h-6 w-6" />
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

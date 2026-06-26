'use client';

import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { formatCLPCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MayorPanel() {
  const { 
    selectedCuentaCodigo, 
    setSelectedCuentaCodigo, 
    cuentas, 
    ledgerData 
  } = useContabilidadStore();

  return (
    <div className="mt-0 outline-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="sel_cuenta_mayor" className="text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0">
            Seleccionar Cuenta:
          </Label>
          <Select
            value={selectedCuentaCodigo}
            onValueChange={(val) => setSelectedCuentaCodigo(val)}
          >
            <SelectTrigger id="sel_cuenta_mayor" className="w-full sm:w-64 h-10 rounded-xl text-xs font-bold bg-card border border-border">
              <SelectValue placeholder="Selecciona una cuenta" />
            </SelectTrigger>
            <SelectContent>
              {cuentas.map(c => (
                <SelectItem key={c.codigo} value={c.codigo}>
                  {c.codigo} - {c.nombre} ({c.tipo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ledgerData && (
          <Badge className="font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl self-start sm:self-center">
            Saldo Final: {formatCLPCurrency(ledgerData.saldoFinal)}
          </Badge>
        )}
      </div>

      {ledgerData ? (
        <Card className="border border-border/50">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-extrabold uppercase tracking-wider">
              Libro Mayor: {ledgerData.cuenta.codigo} - {ledgerData.cuenta.nombre}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {ledgerData.cuenta.descripcion || 'Movimientos individuales y balance acumulado.'}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-[15%] pl-6">Fecha</TableHead>
                    <TableHead className="w-[10%] text-center">Asiento Ref</TableHead>
                    <TableHead className="w-[45%]">Descripción / Glosa</TableHead>
                    <TableHead className="w-[15%] text-right text-emerald-500">Debe</TableHead>
                    <TableHead className="w-[15%] text-right text-red-500">Haber</TableHead>
                    <TableHead className="w-[15%] text-right pr-6">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerData.movimientos.map((mov: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/5 transition-colors text-xs">
                      <TableCell className="pl-6 font-semibold text-muted-foreground">
                        {format(mov.fecha.toDate(), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-primary">
                        #{mov.asiento_numero}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {mov.glosa}
                      </TableCell>
                      <TableCell className="text-right text-emerald-500 font-bold">
                        {mov.debe > 0 ? formatCLPCurrency(mov.debe) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-bold">
                        {mov.haber > 0 ? formatCLPCurrency(mov.haber) : '-'}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black">
                        {formatCLPCurrency(mov.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {ledgerData.movimientos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No se registran movimientos para esta cuenta contable.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Selecciona una cuenta del menú superior para ver su Libro Mayor.
        </div>
      )}
    </div>
  );
}

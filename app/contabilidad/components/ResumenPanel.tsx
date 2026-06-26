'use client';

import { useContabilidadStore } from '../hooks/useContabilidadStore';
import { calcularKPIsContables } from '../utils/contabilidadUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCLPCurrency } from '@/lib/utils';
import { Sparkles, FileText, FileSpreadsheet, Plus } from 'lucide-react';

export function ResumenPanel() {
  const { asientos, setCapitalOpen } = useContabilidadStore();
  const contabilidadKPIs = calcularKPIsContables(asientos);

  return (
    <div className="mt-0 outline-none space-y-6">
      {contabilidadKPIs.capitalInicial === 0 && contabilidadKPIs.utilidadesAcumuladas === 0 && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Declarar Capital Inicial / Fondos de Operación
            </h4>
            <p className="text-xs text-muted-foreground">
              Tu local no tiene registrado dinero disponible para operar. Registra el capital inicial o las utilidades acumuladas (ej: aporte en Caja o Banco) para iniciar compras de mercaderías y egresos sin saldos negativos.
            </p>
          </div>
          <Button 
            onClick={() => setCapitalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shrink-0 transition-transform duration-150 active:scale-95 shadow-md"
          >
            Declarar Dinero Disponible
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profit and Loss Card */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Estado de Resultados (P&L Simplificado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/5">
                <span className="text-muted-foreground font-semibold">Ingresos Netos por Ventas (4.1.01):</span>
                <span className="font-extrabold text-foreground">{formatCLPCurrency(contabilidadKPIs.ventas)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/5">
                <span className="text-muted-foreground font-semibold">(-) Costo de Ventas Mayorista (5.1.01):</span>
                <span className="font-extrabold text-red-500">({formatCLPCurrency(contabilidadKPIs.costoVentas)})</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b-2 font-black text-base bg-muted/10 px-3 rounded-lg">
                <span>Utilidad Bruta:</span>
                <span className="text-primary">{formatCLPCurrency(contabilidadKPIs.utilidadBruta)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/5 pt-2">
                <span className="text-muted-foreground font-semibold">(-) Gastos Operativos y Generales (5.1.02):</span>
                <span className="font-extrabold text-red-500">({formatCLPCurrency(contabilidadKPIs.gastosGenerales)})</span>
              </div>
              <div className={`flex justify-between items-center py-3 border-t-2 font-black text-lg px-3 rounded-lg mt-3 ${
                contabilidadKPIs.utilidadNeta >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                <span>Utilidad/Pérdida Neta:</span>
                <span>{formatCLPCurrency(contabilidadKPIs.utilidadNeta)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet Card */}
        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Balance de Comprobación de Activo y Pasivo
            </CardTitle>
            <Button
              onClick={() => setCapitalOpen(true)}
              className="rounded-xl font-bold flex items-center gap-1.5 h-8 text-[10px] px-3 bg-indigo-600 hover:bg-indigo-700 text-white transition-transform duration-150 active:scale-95"
            >
              <Plus className="h-3 w-3" />
              Declarar Fondos
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              
              {/* Assets (Debe) */}
              <div className="space-y-2">
                <h4 className="font-black text-muted-foreground uppercase tracking-wider border-b pb-1.5 mb-2">Activos (Debe)</h4>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>1.1.01 Caja</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.caja)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>1.1.02 Banco</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.banco)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>1.1.03 Mercaderías</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.mercaderias)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>1.1.04 Clientes</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.clientes)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>1.1.05 IVA Crédito</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.ivaCredito)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t pt-2 mt-2">
                  <span>Total Activos:</span>
                  <span>{formatCLPCurrency(contabilidadKPIs.activosTotales)}</span>
                </div>
              </div>

              {/* Liabilities & Equity (Haber) */}
              <div className="space-y-2">
                <h4 className="font-black text-muted-foreground uppercase tracking-wider border-b pb-1.5 mb-2">Pasivos + Patrimonio (Haber)</h4>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>2.1.01 IVA Débito</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.ivaDebito)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>2.1.02 Proveedores</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.proveedores)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>3.1.01 Capital Inicial</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.capitalInicial)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5">
                  <span>3.1.02 Utilidades Acumuladas</span>
                  <span className="font-bold">{formatCLPCurrency(contabilidadKPIs.utilidadesAcumuladas)}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-border/5 text-muted-foreground italic">
                  <span>Resultado del Ejercicio</span>
                  <span className="font-bold text-foreground font-sans not-italic">{formatCLPCurrency(contabilidadKPIs.utilidadNeta)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t pt-2 mt-2">
                  <span>Total Pasivos + Patrimonio:</span>
                  <span>{formatCLPCurrency(contabilidadKPIs.pasivosTotales + contabilidadKPIs.capitalInicial + contabilidadKPIs.utilidadesAcumuladas + contabilidadKPIs.utilidadNeta)}</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCLPCurrency } from '@/lib/utils';
import { Producto } from '@/lib/types/pos';
import { auth } from '@/lib/firebase';
import { Loader2, Check, AlertCircle, Plus, FileSpreadsheet, Award } from 'lucide-react';

interface ImportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvText: string;
  catalogProducts: Producto[];
  onConfirm: (finalMatchedProducts: any[]) => void;
}

interface ExcelParsedRow {
  nombreOriginal: string;
  calidad: string;
  precioRefFull: number;
  precioRefUnit: number;
  unidadCom: string;
}

interface ProcessedItem {
  id: string;
  nombre: string;
  calidad?: string;
  costo_local: number;
  precio_venta_local: number;
  es_interes: boolean;
  precio_referencia: number;
  precio_referencia_full?: number;
  unidad_comercializacion?: string;
  noExisteEnCatalogo?: boolean;
  importar?: boolean; // User choice to import new products
}

export function ImportProgressModal({
  isOpen,
  onClose,
  csvText,
  catalogProducts,
  onConfirm,
}: ImportProgressModalProps) {
  const [step, setStep] = useState<'parsing' | 'summary'>('parsing');
  const [progress, setProgress] = useState(0);
  const [currentLineName, setCurrentLineName] = useState('');
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [liveLog, setLiveLog] = useState<{ id: string; nombre: string; estado: 'matched' | 'new' }[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Parse CSV helper from store logic
  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    const separator = line.includes(';') ? ';' : ',';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  useEffect(() => {
    if (!isOpen || !csvText) return;

    // Reset states
    setStep('parsing');
    setProgress(0);
    setCurrentLineName('');
    setProcessedItems([]);
    setLiveLog([]);

    // Parse all rows
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return;

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ''));

    let prodIdx = headers.findIndex(
      (h) =>
        h.includes('producto') ||
        h.includes('nombre') ||
        h.includes('item') ||
        h.includes('glosa') ||
        h.includes('especie')
    );

    // Price column priority indicators
    let ponderadoIdx = headers.findIndex((h) => h.includes('ponderado'));
    let promedioIdx = headers.findIndex((h) => h.includes('promedio') || h.includes('medio'));
    let minimoIdx = headers.findIndex((h) => h.includes('min') || h.includes('mín'));
    let maximoIdx = headers.findIndex((h) => h.includes('max') || h.includes('máx'));
    let genericoIdx = headers.findIndex((h) => h.includes('precio') || h.includes('valor') || h.includes('costo'));

    let unitIdx = headers.findIndex((h) => h.includes('unidad') || h.includes('comercializacion') || h.includes('envase'));
    let varietyIdx = headers.findIndex((h) => h.includes('variedad') || h.includes('tipo'));
    // Quality column: only detect if explicitly named in headers
    let calidadIdx = headers.findIndex((h) => h.includes('calidad') || h.includes('grado') || h.includes('grade') || h.includes('clase'));
    // Do NOT fall back to a fixed index — different Excel formats have different layouts

    if (prodIdx === -1) prodIdx = 0;
    if (unitIdx === -1) unitIdx = headers.length > 1 ? 7 : 0;
    if (varietyIdx === -1) varietyIdx = 1;

    const rawRows: ExcelParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= prodIdx) continue;

      const prodName = cols[prodIdx];
      const varietyName = varietyIdx !== -1 && cols[varietyIdx] ? cols[varietyIdx] : '';
      // Skip if calidadIdx same as prodIdx or varietyIdx to avoid duplication
      const rawCalidad = (calidadIdx !== prodIdx && calidadIdx !== varietyIdx && cols[calidadIdx])
        ? cols[calidadIdx].trim()
        : '';
      const unitCom = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : '';

      if (!prodName) continue;

      let priceVal = NaN;

      // Priority list: Ponderado, Promedio, Mínimo, Máximo, Genérico
      const priceIndices = [ponderadoIdx, promedioIdx, minimoIdx, maximoIdx, genericoIdx].filter(idx => idx !== -1);

      for (const idx of priceIndices) {
        if (cols.length > idx && cols[idx]) {
          const clean = cols[idx].replace(/[^0-9]/g, '');
          const val = parseInt(clean, 10);
          if (!isNaN(val) && val > 0) {
            priceVal = val;
            break;
          }
        }
      }

      // If price is still NaN, look for any column containing a valid numeric value >= 1 (fallback scan)
      if (isNaN(priceVal)) {
        for (let idx = 0; idx < cols.length; idx++) {
          if (idx === prodIdx || idx === varietyIdx || idx === unitIdx || idx === calidadIdx) continue;
          const clean = cols[idx].replace(/[^0-9]/g, '');
          const val = parseInt(clean, 10);
          if (!isNaN(val) && val >= 1) {
            priceVal = val;
            break;
          }
        }
      }

      // If still no price found, include the row with price=0 so the AI can still process it
      if (isNaN(priceVal)) priceVal = 0;

      let divisor = 1;
      const unitLower = unitCom.toLowerCase();

      if (unitLower.includes('docena')) {
        divisor = 12;
      } else {
        const matchNumber = unitLower.match(/(\d+)/);
        if (matchNumber) {
          divisor = parseInt(matchNumber[1]) || 1;
        }
      }

      const priceUnit = priceVal / divisor;
      const cleanProdName = varietyName ? `${prodName} (${varietyName})` : prodName;

      rawRows.push({
        nombreOriginal: cleanProdName,
        calidad: rawCalidad,
        precioRefFull: priceVal,
        precioRefUnit: priceUnit,
        unidadCom: unitCom || 'Unidad',
      });
    }

    if (rawRows.length === 0) {
      setStep('summary');
      return;
    }

    // Llamar a la API de Inteligencia Artificial para el emparejamiento semántico y cálculo de divisores
    const processWithAI = async () => {
      try {
        console.log("ImportProgressModal - rawRows:", rawRows);
        setLiveLog(prev => [
          ...prev,
          { id: 'start_ai', nombre: `Se extrajeron ${rawRows.length} productos crudos. Iniciando análisis de IA...`, estado: 'matched' as const }
        ]);
        setProgress(20);
        setCurrentLineName('Conectando con asistente de IA...');

        await new Promise(r => setTimeout(r, 600));

        setProgress(50);
        setCurrentLineName('Gemini analizando cabeceras, empaques y comparando catálogos...');
        setLiveLog(prev => [
          ...prev,
          { id: 'analyzing_ai', nombre: 'Gemini emparejando semánticamente y deduciendo unidades...', estado: 'matched' as const }
        ]);

        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/mayoristas-parser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rawRows, catalogProducts })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al conectar con el servidor.');

        setProgress(85);
        setCurrentLineName('Procesando resultados devueltos...');
        setLiveLog(prev => [
          ...prev,
          { id: 'done_ai', nombre: `¡Gemini mapeó exitosamente ${data.length} filas con tu catálogo!`, estado: 'matched' as const }
        ]);

        await new Promise(r => setTimeout(r, 600));

        // Mapear los datos retornados y agregar el flag 'importar' por defecto para nuevos productos
        // Also carry calidad from the rawRow through by matching position
        const finalItems = data.map((item: any, idx: number) => ({
          ...item,
          calidad: item.calidad || rawRows[idx]?.calidad || '',
          costo_catalogo: item.costo_local,
          importar: item.noExisteEnCatalogo ? true : undefined
        }));

        setProcessedItems(finalItems);
        setProgress(100);
        setStep('summary');
      } catch (err: any) {
        console.error(err);
        setLiveLog(prev => [
          ...prev,
          { id: 'error_ai', nombre: `Error en análisis de IA: ${err.message || 'No se pudo completar.'}`, estado: 'new' as const }
        ]);
      }
    };

    processWithAI();
  }, [isOpen, csvText, catalogProducts]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLog]);

  const handleToggleImport = (itemId: string, checked: boolean) => {
    setProcessedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, importar: checked } : item))
    );
  };

  const handleToggleAllImports = (checked: boolean) => {
    setProcessedItems((prev) =>
      prev.map((item) =>
        item.noExisteEnCatalogo ? { ...item, importar: checked } : item
      )
    );
  };

  const handleToggleInteres = (itemId: string, checked: boolean) => {
    setProcessedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, es_interes: checked } : item))
    );
  };

  const handleConfirm = () => {
    // Filter down to only items we want to keep
    const finalItems = processedItems.filter((item) => {
      if (item.noExisteEnCatalogo) {
        return !!item.importar;
      }
      return true; // always keep matched items
    });
    onConfirm(finalItems);
    onClose();
  };

  const matchedCount = processedItems.filter((item) => !item.noExisteEnCatalogo).length;
  const newCount = processedItems.filter((item) => item.noExisteEnCatalogo).length;
  const newItems = processedItems.filter((item) => item.noExisteEnCatalogo);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl border border-border/40 p-6 bg-card max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            {step === 'parsing' ? 'Procesando Planilla Mayorista' : 'Resumen de Lectura y Detección'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
            {step === 'parsing'
              ? 'Analizando filas, calculando precios de unidad y buscando coincidencias...'
              : 'Verifica los productos detectados en el archivo antes de importarlos.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'parsing' ? (
          <div className="space-y-6 my-4 flex-1 flex flex-col justify-center py-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span className="truncate max-w-[80%] uppercase tracking-wider">Leyendo: {currentLineName}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-muted rounded-full" />
            </div>

            <div className="border border-border/30 rounded-2xl p-4 bg-muted/10 h-60 overflow-y-auto flex flex-col font-mono text-[10px] space-y-1.5 custom-scrollbar">
              {liveLog.map((log) => (
                <div key={log.id} className="flex justify-between items-center py-0.5 border-b border-border/5">
                  <span className="truncate max-w-[70%] font-semibold text-muted-foreground">{log.nombre}</span>
                  {log.estado === 'matched' ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Coincide
                    </span>
                  ) : (
                    <span className="text-indigo-500 font-bold flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Nuevo
                    </span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        ) : (
          <div className="space-y-5 my-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/10 border border-border/20 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Filas Leídas</p>
                <p className="text-xl font-black mt-1 text-foreground">{processedItems.length}</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">Emparejados</p>
                <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{matchedCount}</p>
              </div>
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-wider">Nuevos</p>
                <p className="text-xl font-black mt-1 text-indigo-600 dark:text-indigo-400">{newCount}</p>
              </div>
            </div>

            {newItems.length > 0 ? (
              <div className="space-y-2 border border-border/30 rounded-2xl p-4 bg-muted/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  Nuevos Productos para Agregar al Catálogo ({newCount})
                </h4>
                <p className="text-[10px] text-muted-foreground font-medium mb-3">
                  Los productos seleccionados se agregarán automáticamente a tu catálogo con stock 0 y el costo sugerido al hacer clic en "Registrar Precios de Hoy".
                </p>

                <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/20 custom-scrollbar bg-card">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold py-2 w-12 text-center flex items-center justify-center h-10">
                          <Checkbox
                            checked={newItems.length > 0 && newItems.every(item => !!item.importar)}
                            onCheckedChange={(checked) => handleToggleAllImports(checked === true)}
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold py-2">Nombre / Formato</TableHead>
                        <TableHead className="text-[10px] font-bold py-2 text-right">Precio Ref.</TableHead>
                        <TableHead className="text-[10px] font-bold py-2 text-center w-24">Lista Compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/5 py-1 text-xs">
                          <TableCell className="text-center py-2">
                            <Checkbox
                              checked={!!item.importar}
                              onCheckedChange={(checked) => handleToggleImport(item.id, checked === true)}
                            />
                          </TableCell>
                          <TableCell className="py-2 max-w-[200px]">
                            <p className="font-bold truncate text-foreground">{item.nombre}</p>
                            {item.calidad && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 mt-0.5">
                                <Award className="h-2.5 w-2.5" />{item.calidad}
                              </span>
                            )}
                            <p className="text-[9px] text-muted-foreground font-semibold truncate uppercase mt-0.5">
                              Formato: {item.unidad_comercializacion || 'Unidad'}
                              {item.precio_referencia_full ? ` (${formatCLPCurrency(item.precio_referencia_full)})` : ''}
                            </p>
                          </TableCell>
                          <TableCell className="text-right py-2 font-mono font-bold">
                            {formatCLPCurrency(item.precio_referencia)}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Checkbox
                              checked={!!item.es_interes}
                              disabled={!item.importar}
                              onCheckedChange={(checked) => handleToggleInteres(item.id, checked === true)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 bg-muted/10 border border-border/20 rounded-2xl p-4 items-center justify-center text-center">
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Todos los productos del archivo ya existen en tu catálogo local.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border/10 pt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancelar
          </Button>
          {step === 'summary' && (
            <Button
              onClick={handleConfirm}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Confirmar e Importar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

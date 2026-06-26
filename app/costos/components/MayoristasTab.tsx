'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCostosStore } from '../hooks/useCostosStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCLPCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { ImportProgressModal } from './ImportProgressModal';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  TrendingUp, 
  AlertCircle, 
  ShoppingBag, 
  Loader2, 
  ArrowRight,
  TrendingDown,
  Calendar,
  LineChart as LineIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

export function MayoristasTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subTab, setSubTab] = useState<'analisis' | 'reportes'>('analisis');
  const [selectedProductHistory, setSelectedProductHistory] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  
  // App state
  const productos = useAppStore((state) => state.productos);
  const activeProducts = productos.filter(p => p.activo !== false);

  // Store state
  const {
    mayoristasMatchedProducts,
    mayoristasAiRecomendaciones,
    mayoristasAiCargando,
    mayoristasCargando,
    mayoristasHistorial,
    guardandoTodo,
    procesarArchivoMayoristas,
    updateMatchedProductCost,
    registrarPreciosMayoristas,
    toggleProductoInteres,
    generarRecomendacionesPreciosIA,
    cargarHistorialPreciosMayoristas,
    setMayoristasMatchedProducts
  } = useCostosStore();

  // Load history on mount
  useEffect(() => {
    cargarHistorialPreciosMayoristas();
  }, [cargarHistorialPreciosMayoristas]);


  // Set default product for history chart
  useEffect(() => {
    if (mayoristasHistorial.length > 0 && !selectedProductHistory) {
      // Find the first product id available in history logs
      const firstProdId = mayoristasHistorial[0].producto_id;
      setSelectedProductHistory(firstProdId);
    }
  }, [mayoristasHistorial, selectedProductHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input value so that selecting the same file again triggers onChange
    e.target.value = '';

    const reader = new FileReader();

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (event) => {
        try {
          const data = event.target?.result as ArrayBuffer;
          const uint8 = new Uint8Array(data);
          
          // Detectar si es un archivo binario de Excel real (.xlsx o .xls compuesto)
          let isBinaryExcel = false;
          if (uint8.length >= 4) {
            // XLSX (Formato ZIP: PK..)
            const isZip = uint8[0] === 80 && uint8[1] === 75 && uint8[2] === 3 && uint8[3] === 4;
            // XLS (Formato OLE2: D0 CF 11 E0)
            const isOle = uint8[0] === 208 && uint8[1] === 207 && uint8[2] === 17 && uint8[3] === 224;
            isBinaryExcel = isZip || isOle;
          }
          
          let csvText = '';
          
          if (isBinaryExcel) {
            console.log("Procesando archivo binario de hoja de cálculo con SheetJS...");
            const workbook = XLSX.read(uint8, { type: 'array', raw: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            csvText = XLSX.utils.sheet_to_csv(worksheet);
          } else {
            console.log("Detectado formato de texto plano (.xls / .tsv / .csv). Procesando directamente...");
            
            // Detectar si es UTF-16LE (BOM: FF FE)
            let isUtf16 = false;
            if (uint8.length >= 2) {
              if (uint8[0] === 0xFF && uint8[1] === 0xFE) {
                isUtf16 = true;
              }
            }
            
            const decoder = new TextDecoder(isUtf16 ? 'utf-16le' : 'utf-8');
            const text = decoder.decode(data);
            
            const isHTML = text.includes('<table') || 
                           text.includes('<tr') || 
                           text.includes('<html') || 
                           text.includes('<?xml');
            
            if (isHTML) {
              console.log("Procesando formato HTML/XML...");
              const parser = new DOMParser();
              const doc = parser.parseFromString(text, 'text/html');
              const rows = doc.querySelectorAll('tr');
              const csvLines: string[] = [];
              
              rows.forEach(row => {
                const cols = Array.from(row.querySelectorAll('td, th')).map(cell => {
                  let cellText = (cell.textContent || '').trim();
                  cellText = cellText.replace(/"/g, '""');
                  return `"${cellText}"`;
                });
                if (cols.length > 0) {
                  csvLines.push(cols.join(','));
                }
              });
              csvText = csvLines.join('\n');
            } else {
              console.log("Procesando formato de texto plano delimitado (TSV/CSV)...");
              csvText = text;
            }
          }

          console.log("Parsed CSV Text Preview (First 300 chars):", csvText.substring(0, 300));

          if (csvText) {
            setImportCsvText(csvText);
            setIsImportModalOpen(true);
          }
        } catch (err: any) {
          console.error(err);
          toast({
            title: 'Error al procesar Excel',
            description: 'Asegúrate de que el formato de la planilla sea correcto.',
            variant: 'destructive',
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: 'Error de archivo',
          description: 'No se pudo leer el archivo cargado.',
          variant: 'destructive',
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setImportCsvText(text);
          setIsImportModalOpen(true);
        }
      };
      reader.onerror = () => {
        toast({
          title: 'Error de archivo',
          description: 'No se pudo leer el archivo cargado.',
          variant: 'destructive',
        });
      };
      reader.readAsText(file);
    }
  };

  const handleImportConfirm = (finalMatchedProducts: any[]) => {
    setMayoristasMatchedProducts(finalMatchedProducts);
    toast({
      title: 'Planilla procesada',
      description: `Se cargaron ${finalMatchedProducts.length} productos (coincidencias y nuevos) en la tabla comparativa.`,
    });
  };

  // Filter history for selected product
  const getProductChartData = () => {
    if (!selectedProductHistory) return [];
    
    // Filter and sort chronologically (oldest to newest)
    return mayoristasHistorial
      .filter(log => log.producto_id === selectedProductHistory)
      .map(log => {
        const dateObj = log.fecha?.toDate ? log.fecha.toDate() : new Date();
        return {
          fecha: dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
          'Costo Local': log.costo_local,
          'P. Venta Local': log.precio_venta_local,
          'Ref. Mayorista (Unitario)': log.precio_referencia,
          fullDate: dateObj.toLocaleDateString()
        };
      })
      .reverse();
  };

  // Get unique products in history
  const uniqueProductsInHistory = Array.from(
    new Map(mayoristasHistorial.map(item => [item.producto_id, item.nombre])).entries()
  );

  return (
    <div className="space-y-6">
      {/* Subtab Selector */}
      <div className="flex border-b border-border/50 gap-4 mb-2">
        <button
          onClick={() => setSubTab('analisis')}
          className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            subTab === 'analisis'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Análisis del Día (CSV)
        </button>
        <button
          onClick={() => setSubTab('reportes')}
          className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            subTab === 'reportes'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Historial y Tendencias
        </button>
      </div>

      {subTab === 'analisis' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main upload and match table */}
          <div className="xl:col-span-2 space-y-6">
            {/* Upload Area */}
            {mayoristasMatchedProducts.length === 0 ? (
              <Card 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-3xl p-10 text-center transition-all duration-300 group flex flex-col items-center justify-center bg-card hover:border-indigo-500/50 hover:bg-indigo-500/[0.01] cursor-pointer"
              >
                <div className="h-16 w-16 bg-muted/60 dark:bg-muted/10 rounded-2xl flex items-center justify-center mb-4 border border-border/10 group-hover:scale-105 transition-transform duration-300">
                  {mayoristasCargando ? (
                    <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
                  ) : (
                  <UploadCloud className="h-7 w-7 text-indigo-500 group-hover:text-indigo-600" />
                  )}
                </div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-1">
                  Cargar Precios Mayoristas
                </h3>
                <p className="text-xs text-muted-foreground font-medium max-w-sm mb-4">
                  Sube el archivo CSV del día para emparejar automáticamente los precios de tus productos.
                </p>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="rounded-xl text-xs font-bold"
                  disabled={mayoristasCargando}
                >
                  {mayoristasCargando ? 'Procesando...' : 'Seleccionar Archivo'}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                />
              </Card>
            ) : (
              <Card className="rounded-3xl border border-border/40 p-5 bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 border-b border-border/10 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                      Productos Emparejados ({mayoristasMatchedProducts.length})
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">
                      Comparativa de Costo Local vs. Referencia Mayorista
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        procesarArchivoMayoristas('', []); // resets
                      }}
                      className="rounded-xl text-xs h-9 font-bold"
                    >
                      Cargar otro
                    </Button>
                    <Button
                      onClick={() => registrarPreciosMayoristas(toast)}
                      disabled={guardandoTodo}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-bold"
                    >
                      {guardandoTodo ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                      Registrar Precios de Hoy
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="text-xs font-bold pl-4">Producto</TableHead>
                        <TableHead className="text-xs font-bold text-center">Formato Ref.</TableHead>
                        <TableHead className="text-xs font-bold text-right">Costo Catálogo</TableHead>
                        <TableHead className="text-xs font-bold text-right">Precio Ref. (Unit.)</TableHead>
                        <TableHead className="text-xs font-bold text-center w-28">Confirmar Costo ($)</TableHead>
                        <TableHead className="text-xs font-bold text-center">Diferencia</TableHead>
                        <TableHead className="text-xs font-bold text-center pr-4">De Interés</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mayoristasMatchedProducts.map((item) => {
                        const isNew = !!item.noExisteEnCatalogo;
                        const diff = isNew ? 0 : (item.costo_local - item.precio_referencia);
                        const diffPct = isNew ? 0 : (item.precio_referencia > 0 ? (diff / item.precio_referencia) * 100 : 0);
                        const isOverpaying = diff > 0;
                        
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/5 text-xs">
                            <TableCell className="font-bold pl-4">
                              <span className="flex items-center gap-1.5">
                                {item.nombre}
                                {isNew && (
                                  <Badge className="font-extrabold text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                                    Nuevo
                                  </Badge>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-muted-foreground">
                              {item.unidad_comercializacion || 'Unidad'}
                              {item.precio_referencia_full ? ` (${formatCLPCurrency(item.precio_referencia_full)})` : ''}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-muted-foreground">
                              {isNew ? '-' : formatCLPCurrency(item.costo_catalogo || 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              {formatCLPCurrency(item.precio_referencia)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <Input
                                  type="number"
                                  value={item.costo_local || ''}
                                  placeholder={item.precio_referencia.toString()}
                                  onChange={(e) => updateMatchedProductCost(item.id, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-center text-xs font-mono font-bold rounded-lg w-20 p-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Igualar a referencia mayorista"
                                  onClick={() => updateMatchedProductCost(item.id, item.precio_referencia)}
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 shrink-0"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isNew ? (
                                <Badge className="font-extrabold text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  Por Agregar
                                </Badge>
                              ) : diff === 0 ? (
                                <Badge variant="secondary" className="font-bold text-[9px] px-2 py-0.5 rounded-full">
                                  Igual
                                </Badge>
                              ) : (
                                <Badge 
                                  variant={isOverpaying ? 'destructive' : 'secondary'} 
                                  className={`font-black text-[9px] px-2 py-0.5 rounded-full flex items-center justify-center gap-0.5 w-fit mx-auto ${
                                    isOverpaying 
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  }`}
                                >
                                  {isOverpaying ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                  {isOverpaying ? `+${diffPct.toFixed(0)}%` : `${diffPct.toFixed(0)}%`}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center pr-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleProductoInteres(item.id, item.es_interes, toast)}
                                className={`h-8 w-8 rounded-xl transition-all ${
                                  item.es_interes 
                                    ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-600' 
                                    : 'text-muted-foreground/40 hover:bg-muted hover:text-foreground'
                                }`}
                                title={item.es_interes ? 'Remover de Lista de Compra' : 'Subir a Lista de Compra'}
                              >
                                <ShoppingBag className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>

          {/* AI recommendations side column */}
          <div className="space-y-6">
            <Card className="rounded-3xl border border-border/40 p-5 bg-card flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-500 border-b border-border/10 pb-3">
                  <Sparkles className="h-4.5 w-4.5" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Asistente de Precios IA
                  </h3>
                </div>

                {mayoristasMatchedProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <FileSpreadsheet className="h-10 w-10 opacity-30 text-indigo-500" />
                    Carga el archivo de precios mayoristas para habilitar el análisis de IA.
                  </div>
                ) : mayoristasAiRecomendaciones ? (
                  <div className="text-xs leading-relaxed text-foreground/80 space-y-2 prose dark:prose-invert max-h-[420px] overflow-y-auto pr-1.5 custom-scrollbar font-medium">
                    <div dangerouslySetInnerHTML={{ __html: mayoristasAiRecomendaciones
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br />')
                    }} />
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-bold text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <Sparkles className="h-8 w-8 opacity-45 text-indigo-500 animate-pulse" />
                    ¿Quieres saber qué hacer con estos datos? Deja que Gemini analice las oportunidades.
                  </div>
                )}
              </div>

              {mayoristasMatchedProducts.length > 0 && (
                <Button
                  onClick={() => generarRecomendacionesPreciosIA(toast)}
                  disabled={mayoristasAiCargando}
                  className="w-full mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide h-10 shadow-sm"
                >
                  {mayoristasAiCargando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Analizar con Gemini
                    </>
                  )}
                </Button>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* History and Trend Charts Tab */
        <Card className="rounded-3xl border border-border/40 p-5 bg-card">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 mb-5 border-b border-border/10 gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LineIcon className="h-4.5 w-4.5 text-indigo-500" />
                Reporte de Precios e Historial
              </h3>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                Visualiza la evolución de tus costos y los precios del mercado
              </p>
            </div>
          </div>

          {mayoristasHistorial.length === 0 ? (
            <div className="py-24 text-center text-xs font-bold text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Calendar className="h-12 w-12 opacity-35 text-indigo-500" />
              Aún no tienes registros de precios mayoristas archivados.
              <span className="block text-[11px] font-medium opacity-75">
                Carga un archivo de precios en la sección anterior y presiona "Registrar Precios de Hoy".
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left sidebar: Product List */}
              <div className="lg:col-span-1 border border-border/20 rounded-2xl p-3 bg-muted/5 flex flex-col max-h-[380px] overflow-y-auto custom-scrollbar space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 mb-2">
                  Productos Registrados ({uniqueProductsInHistory.length})
                </p>
                {uniqueProductsInHistory.map(([id, name]) => {
                  const prodLogs = mayoristasHistorial.filter(log => log.producto_id === id);
                  const latestLog = prodLogs[0];
                  const diff = latestLog ? (latestLog.costo_local - latestLog.precio_referencia) : 0;
                  const isSelected = selectedProductHistory === id;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedProductHistory(id)}
                      className={`text-left p-2.5 rounded-xl transition-all border flex flex-col space-y-1 ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-transparent hover:bg-muted/10 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="text-xs font-bold truncate block">{name}</span>
                      <div className="flex justify-between items-center text-[9px] font-semibold">
                        <span>Costo: {latestLog ? formatCLPCurrency(latestLog.costo_local) : '-'}</span>
                        {latestLog && (
                          <span className={diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-500' : 'text-muted-foreground'}>
                            {diff > 0 ? `+$${diff}` : diff < 0 ? `-$${Math.abs(diff)}` : 'Igual'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right side: Chart and table */}
              <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recharts chart area */}
                <div className="xl:col-span-2 h-[350px] bg-muted/10 rounded-2xl p-4 border border-border/10">
                  {selectedProductHistory ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getProductChartData()}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="fecha" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--background)', 
                            borderColor: 'var(--border)', 
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold' 
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Line 
                          type="monotone" 
                          dataKey="Costo Local" 
                          stroke="#6366f1" 
                          strokeWidth={2.5} 
                          activeDot={{ r: 6 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="P. Venta Local" 
                          stroke="#10b981" 
                          strokeWidth={2} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Ref. Mayorista (Unitario)" 
                          stroke="#f59e0b" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                      Selecciona un producto del listado
                    </div>
                  )}
                </div>

                {/* History table log */}
                <div className="border border-border/30 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="text-xs font-bold pl-4">Fecha</TableHead>
                        <TableHead className="text-xs font-bold text-right">Costo Local</TableHead>
                        <TableHead className="text-xs font-bold text-right pr-4">Ref. Mayorista</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mayoristasHistorial
                        .filter(log => log.producto_id === selectedProductHistory)
                        .slice(0, 10) // Show last 10 entries
                        .map((log) => {
                          const dateObj = log.fecha?.toDate ? log.fecha.toDate() : new Date();
                          return (
                            <TableRow key={log.id} className="hover:bg-muted/5 text-xs">
                              <TableCell className="font-bold pl-4 flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {dateObj.toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right font-black text-foreground">
                                {formatCLPCurrency(log.costo_local)}
                              </TableCell>
                              <TableCell className="text-right font-black text-amber-500 pr-4">
                                {formatCLPCurrency(log.precio_referencia)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {mayoristasHistorial.filter(log => log.producto_id === selectedProductHistory).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground font-bold">
                            Sin historial registrado para este producto
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <ImportProgressModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        csvText={importCsvText}
        catalogProducts={activeProducts}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}

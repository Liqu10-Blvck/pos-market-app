'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Producto } from '@/lib/types/pos';
import { useToast } from '@/hooks/use-toast';
import { Camera, Keyboard, AlertCircle, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  productos: Producto[];
  onDetected: (producto: Producto) => void;
}

export function BarcodeScannerModal({
  open,
  onClose,
  productos,
  onDetected
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [manualSku, setManualSku] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: any = null;

    if (open && activeTab === 'camera') {
      const initScanner = async () => {
        try {
          if (!isMounted) return;
          setCameraPermission('pending');
          setIsScanning(false);

          // Dynamically import to avoid Next.js SSR errors
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
          
          if (!isMounted) return;

          html5QrCode = new Html5Qrcode("reader");

          const config = {
            fps: 15, // High frame rate for fast scanner responsiveness
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39
            ]
          };

          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              config,
              (decodedText: string) => {
                handleCodeFound(decodedText);
              },
              () => {}
            );
          } catch (startErr) {
            console.warn("Fallo al iniciar con cámara trasera, intentando frontal:", startErr);
            try {
              await html5QrCode.start(
                { facingMode: "user" },
                config,
                (decodedText: string) => {
                  handleCodeFound(decodedText);
                },
                () => {}
              );
            } catch (userErr) {
              console.warn("Fallo al iniciar con cámara frontal, intentando con primer ID disponible:", userErr);
              const devices = await Html5Qrcode.getCameras();
              if (devices && devices.length > 0) {
                await html5QrCode.start(
                  devices[0].id,
                  config,
                  (decodedText: string) => {
                    handleCodeFound(decodedText);
                  },
                  () => {}
                );
              } else {
                throw new Error("No se encontraron cámaras de video en este dispositivo.");
              }
            }
          }

          if (isMounted) {
            setCameraPermission('granted');
            setIsScanning(true);
          }
        } catch (err) {
          console.error("Error starting camera scanner:", err);
          if (isMounted) {
            setCameraPermission('denied');
            setIsScanning(false);
            toast({
              title: 'Error de cámara',
              description: 'No pudimos acceder a tu cámara. Asegúrate de otorgar permisos o usa el ingreso manual.',
              variant: 'destructive'
            });
          }
        }
      };

      // Slight timeout to ensure the DOM element #reader is mounted
      const timer = setTimeout(() => {
        initScanner();
      }, 150);

      return () => {
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => {
          console.error("Error stopping scanner:", err);
        });
      }
    };
  }, [open, activeTab]);

  const handleCodeFound = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    const cleanedCode = code.trim();
    const product = productos.find(p => p.sku && p.sku.trim() === cleanedCode);

    if (product) {
      toast({
        title: 'Producto Detectado',
        description: `${product.nombre} (SKU: ${cleanedCode})`,
        variant: 'success'
      });
      onDetected(product);
      setManualSku('');
      onClose();
    } else {
      toast({
        title: 'Código no registrado',
        description: `Código escaneado: ${cleanedCode}. No coincide con ningún producto.`,
        variant: 'destructive'
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSku.trim()) return;
    handleCodeFound(manualSku);
  };

  const manualInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (activeTab === 'manual') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 150);
    }
  }, [activeTab]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden border-none bg-background shadow-2xl rounded-3xl">
        <div className="flex flex-col bg-white dark:bg-card">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold tracking-tight uppercase">
              Escanear SKU / Producto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Utiliza la cámara para escanear el código de barras o ingrésalo manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 gap-2 bg-muted/30 dark:bg-muted/10 p-1 rounded-xl mb-5 border border-border/10">
                <TabsTrigger value="camera" className="rounded-lg text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  Cámara Lector
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-lg text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
                  <Keyboard className="h-4 w-4" />
                  Manual / Pistola
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="mt-0 outline-none">
                <div className="relative w-full h-[280px] bg-black rounded-2xl overflow-hidden border border-border/20 shadow-inner">
                  
                  {/* Container for html5-qrcode video mounting */}
                  <div 
                    id="reader" 
                    className="w-full h-full overflow-hidden [&>video]:!w-full [&>video]:!h-full [&>video]:!object-cover"
                  />

                  {/* Pending state overlay */}
                  {cameraPermission === 'pending' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-black">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-semibold text-white/80">Iniciando cámara...</p>
                    </div>
                  )}

                  {/* Denied state overlay */}
                  {cameraPermission === 'denied' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-3 bg-black">
                      <AlertCircle className="h-10 w-10 text-destructive/80" />
                      <div>
                        <p className="text-sm font-bold text-white">Acceso Denegado</p>
                        <p className="text-xs mt-1 text-white/60 leading-relaxed">
                          No se pudo acceder a la cámara. Habilita los permisos en tu navegador o escribe el SKU manualmente.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scanning overlay (only visible when camera is granted and active) */}
                  {cameraPermission === 'granted' && (
                    <>
                      {/* Scanning visual overlay */}
                      <div className="absolute inset-0 border-[24px] border-black/40 pointer-events-none flex items-center justify-center">
                        {/* Target frame */}
                        <div className="w-full h-full max-w-[280px] max-h-[160px] border-2 border-primary/60 rounded-xl relative shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                          {/* Corner markers */}
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-md" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-md" />
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-md" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-md" />
                          
                          {/* Animated red laser line */}
                          <motion.div
                            animate={{
                              top: ['5%', '95%', '5%'],
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="absolute left-[5%] right-[5%] h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] rounded-full pointer-events-none"
                          />
                        </div>
                      </div>

                      {/* Mode indication with green pulsing dot */}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest text-white/90 border border-white/10 flex items-center gap-1.5 z-20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span>LECTOR ACTIVO</span>
                      </div>
                    </>
                  )}
                </div>
                
                <p className="text-[10px] text-center mt-3 text-muted-foreground font-medium">
                  Apunta al código de barras. La lectura se realizará de forma local e instantánea.
                </p>
              </TabsContent>

              <TabsContent value="manual" className="mt-0 outline-none">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual_sku" className="text-xs font-black text-muted-foreground uppercase tracking-wide">
                      Código de Barra o SKU
                    </Label>
                    <div className="relative">
                      <Input
                        id="manual_sku"
                        ref={manualInputRef}
                        type="text"
                        placeholder="Ej: 7801234567890"
                        value={manualSku}
                        onChange={(e) => setManualSku(e.target.value)}
                        className="h-11 text-base font-mono font-bold rounded-xl pr-12 focus:ring-1 focus:ring-primary/20"
                      />
                      <Button
                        type="submit"
                        disabled={!manualSku.trim()}
                        size="icon"
                        className="absolute right-1 top-1 h-9 w-9 bg-primary hover:bg-primary/95 text-white rounded-lg"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed font-medium">
                    <p className="font-bold text-foreground mb-1">💡 Lector de Pistola USB/Bluetooth</p>
                    Para usar tu pistola lectora de código de barras, haz clic en este campo para enfocarlo, apunta al producto y gatilla. La pistola ingresará el código y buscará el producto de forma automática.
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <div className="p-6 border-t border-border/30 bg-muted/5 flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl text-xs font-bold px-6 border-border/40 hover:bg-muted"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

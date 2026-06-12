'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Producto } from '@/lib/types/pos';
import { useToast } from '@/hooks/use-toast';
import { Camera, Keyboard, AlertCircle, Loader2, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [hasNativeDetector, setHasNativeDetector] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const procesandoScan = useRef(false);
  const { toast } = useToast();

  // Detect native BarcodeDetector support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setHasNativeDetector(true);
    }
  }, []);

  // Handle camera start/stop
  useEffect(() => {
    if (open && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, activeTab]);

  // Auto-scan loop for non-native platforms (like iOS Safari) using Gemini Vision
  useEffect(() => {
    let autoScanInterval: NodeJS.Timeout | null = null;

    if (open && activeTab === 'camera' && cameraPermission === 'granted' && !hasNativeDetector) {
      autoScanInterval = setInterval(() => {
        if (!isAiAnalyzing && !procesandoScan.current) {
          scanWithAi(true);
        }
      }, 3000); // Trigger auto-scan every 3 seconds
    }

    return () => {
      if (autoScanInterval) {
        clearInterval(autoScanInterval);
      }
    };
  }, [open, activeTab, cameraPermission, hasNativeDetector, isAiAnalyzing]);

  const startCamera = async () => {
    try {
      setCameraPermission('pending');
      setIsScanning(true);

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Fallo al obtener cámara trasera con constraints específicos, intentando fallback de video genérico:', firstErr);
        // Fallback: request any video track (works on desktop laptops/front cameras)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user' 
          } 
        }).catch(async () => {
          // Absolute fallback: just video true
          return await navigator.mediaDevices.getUserMedia({ video: true });
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error('Error al llamar a video.play():', playErr);
        }
      }

      setCameraPermission('granted');

      // Start native barcode detection loop if supported
      if ('BarcodeDetector' in window) {
        startNativeDetection();
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setCameraPermission('denied');
      setIsScanning(false);
      toast({
        title: 'Error de cámara',
        description: 'No pudimos acceder a tu cámara. Asegúrate de otorgar permisos o usa el ingreso manual.',
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startNativeDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

    // Run barcode scanner loop every 350ms
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !streamRef.current || !isScanning) return;

      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });

        const barcodes = await detector.detect(videoRef.current);

        if (barcodes && barcodes.length > 0) {
          const scannedCode = barcodes[0].rawValue;
          handleCodeFound(scannedCode);
        }
      } catch (err) {
        console.error('Error en detección de código nativo:', err);
      }
    }, 350);
  };

  const handleCodeFound = (code: string) => {
    // Sound/haptic feedback
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
      // Clean states and close
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

  // Capture frame and send to Gemini Vision for scanning
  const scanWithAi = async (silent: boolean = false) => {
    if (!videoRef.current || isAiAnalyzing || procesandoScan.current) return;

    try {
      setIsAiAnalyzing(true);
      procesandoScan.current = true;

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del canvas');

      // Draw video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      if (!silent) {
        toast({
          title: 'Analizando con IA...',
          description: 'Gemini está buscando el código de barras y producto en la imagen.',
        });
      }

      // Call API
      const res = await fetch('/api/analyze-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (!res.ok) {
        throw new Error('La IA falló al procesar la imagen');
      }

      const data = await res.json();
      
      if (data.sku) {
        handleCodeFound(data.sku);
      } else {
        if (!silent) {
          toast({
            title: 'IA no detectó SKU',
            description: 'No pudimos encontrar un código de barras claro. Intenta acercar el código al centro o ingresarlo manualmente.',
            variant: 'destructive'
          });
        }
      }
    } catch (err: any) {
      console.error('Error al escanear con IA:', err);
      if (!silent) {
        toast({
          title: 'Error de IA',
          description: err.message || 'No se pudo procesar la solicitud',
          variant: 'destructive'
        });
      }
    } finally {
      setIsAiAnalyzing(false);
      // Debounce scanner reactivation
      setTimeout(() => {
        procesandoScan.current = false;
      }, 1500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSku.trim()) return;
    handleCodeFound(manualSku);
  };

  // Focus manual input on tab change
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
                  {/* Always render video to prevent React Ref/Mount race conditions */}
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${cameraPermission === 'granted' ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                    autoPlay
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

                      {/* AI Scan Fallback Action */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                        <Button
                          type="button"
                          onClick={() => scanWithAi(false)}
                          disabled={isAiAnalyzing}
                          className="h-10 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg px-5 text-xs font-extrabold tracking-wider flex items-center gap-2"
                        >
                          {isAiAnalyzing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-amber-300" />
                          )}
                          {isAiAnalyzing ? 'ANALIZANDO CÓDIGO...' : 'ESCANEAR CON IA'}
                        </Button>
                      </div>

                      {/* Analysis Loading Overlay */}
                      {isAiAnalyzing && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2 z-10 animate-fade-in">
                          <Loader2 className="h-7 w-7 animate-spin text-primary" />
                          <span className="text-[10px] font-black tracking-widest uppercase text-white/95">Analizando código...</span>
                        </div>
                      )}

                      {/* Mode indication with green pulsing dot */}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest text-white/90 border border-white/10 flex items-center gap-1.5 z-20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        {hasNativeDetector ? 'LECTOR NATIVO ACTIVO' : 'AUTO-ESCANER ACTIVO'}
                      </div>
                    </>
                  )}
                </div>
                
                <p className="text-[10px] text-center mt-3 text-muted-foreground font-medium">
                  Apunta al código de barras. Si es oscuro o borroso, presiona &quot;Escanear con IA&quot;.
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

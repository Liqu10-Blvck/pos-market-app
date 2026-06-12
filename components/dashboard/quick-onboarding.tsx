'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Store, 
  CheckCircle2, 
  ArrowRight, 
  Image as ImageIcon,
  Rocket,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { ConfigService } from '@/lib/services/config.service';
import { Tenant, Sucursal } from '@/lib/types/pos';
import { BrandLogo } from '@/components/ui/brand-logo';

export function QuickOnboarding() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    razonSocial: '',
    rut: '',
    sucursalNombre: 'Casa Matriz',
    sucursalDireccion: ''
  });

  useEffect(() => {
    setMounted(true);
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user?.tenantId) return;
    
    try {
      const tenant = await ConfigService.obtenerTenant(user.tenantId);
      const sucursales = await ConfigService.obtenerSucursales(user.tenantId);
      
      // Si falta la razón social o no hay sucursales, mostrar onboarding
      if (!tenant?.razonSocial || sucursales.length === 0) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleNext = () => setStep(s => s + 1);

  const handleSave = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      // 1. Guardar datos del Tenant
      await ConfigService.guardarTenant({
        id: user.tenantId,
        nombre: formData.razonSocial,
        razonSocial: formData.razonSocial,
        rut: formData.rut,
        giro: 'Venta de Frutas y Verduras', // Default
        active: true
      });

      // 2. Crear Sucursal inicial
      await ConfigService.guardarSucursal({
        tenantId: user.tenantId,
        nombre: formData.sucursalNombre,
        direccion: formData.sucursalDireccion,
        activa: true,
        configuracion: {
          permitirGastoEnvases: true,
          modoDefault: 'retail',
          permitirVentaNegativa: false,
          precioBloqueadoDefault: true,
          permitirPallets: false,
          permitirBins: false
        }
      });

      setStep(4); // Pantalla de éxito
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border-border rounded-[2.5rem]">
        <div className="relative overflow-hidden">
          {/* Header Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent -z-10" />
          
          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-2 mb-8">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                       <Building2 className="size-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Bienvenido a FrutaPOS</h2>
                    <p className="text-sm text-muted-foreground font-medium">Comencemos configurando la identidad de tu negocio.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-1">Nombre de la Empresa</Label>
                      <Input 
                        placeholder="Ej. Comercializadora Fruty" 
                        value={formData.razonSocial}
                        onChange={e => setFormData({...formData, razonSocial: e.target.value})}
                        className="h-12 rounded-2xl border-2 font-bold focus:border-primary shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-1">RUT Empresa</Label>
                      <Input 
                        placeholder="76.000.000-0" 
                        value={formData.rut}
                        onChange={e => setFormData({...formData, rut: e.target.value})}
                        className="h-12 rounded-2xl border-2 font-bold focus:border-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleNext}
                    disabled={!formData.razonSocial || !formData.rut}
                    className="w-full h-14 rounded-2xl font-black uppercase text-xs gap-3 shadow-xl shadow-primary/20"
                  >
                    Siguiente Paso <ArrowRight className="size-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-2 mb-8">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                       <Store className="size-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Tu Primer Local</h2>
                    <p className="text-sm text-muted-foreground font-medium">Dinos dónde se encuentra tu sucursal principal.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-1">Nombre del Local</Label>
                      <Input 
                        placeholder="Ej. Casa Matriz o Local Mercado" 
                        value={formData.sucursalNombre}
                        onChange={e => setFormData({...formData, sucursalNombre: e.target.value})}
                        className="h-12 rounded-2xl border-2 font-bold focus:border-primary shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase opacity-60 ml-1">Dirección Física</Label>
                      <Input 
                        placeholder="Av. Principal #123, Ciudad" 
                        value={formData.sucursalDireccion}
                        onChange={e => setFormData({...formData, sucursalDireccion: e.target.value})}
                        className="h-12 rounded-2xl border-2 font-bold focus:border-primary shadow-sm"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSave}
                    disabled={!formData.sucursalNombre || !formData.sucursalDireccion || loading}
                    className="w-full h-14 rounded-2xl font-black uppercase text-xs gap-3 shadow-xl shadow-primary/20"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'Finalizar Configuración'}
                  </Button>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center text-center space-y-6"
                >
                  <div className="size-24 rounded-full bg-green-500/10 flex items-center justify-center mb-4 relative">
                    <CheckCircle2 className="size-12 text-green-500" />
                    <motion.div 
                      className="absolute inset-0 rounded-full border-4 border-green-500"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase tracking-tight">¡Todo Listo!</h2>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                      Tu negocio ha sido configurado con éxito.<br />
                      Ya puedes comenzar a vender.
                    </p>
                  </div>

                  <Button 
                    onClick={() => setIsOpen(false)}
                    className="h-14 px-12 rounded-2xl font-black uppercase text-xs gap-3 bg-green-600 hover:bg-green-700 shadow-xl shadow-green-600/20"
                  >
                    Ir al Dashboard <Rocket className="size-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Dots */}
          {step < 4 && (
            <div className="flex justify-center gap-2 pb-8">
              {[1, 2].map((s) => (
                <div 
                  key={s} 
                  className={`size-2 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-primary' : 'bg-muted-foreground/20'}`} 
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

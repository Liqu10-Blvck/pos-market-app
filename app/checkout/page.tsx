'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { PedidosService } from '@/lib/services/pedidos.service';
import { ItemPedido, Pedido } from '@/lib/types/pedido';
import { Producto } from '@/lib/types/pos';
import { formatCLPCurrency } from '@/lib/utils';
import { ShoppingBag, ArrowLeft, Send, CheckCircle2, ChevronRight, Truck, Store, Phone, MapPin, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'despacho' | 'retiro'>('despacho');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('transferencia');
  
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [numeroPedidoCreado, setNumeroPedidoCreado] = useState<number | null>(null);

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Address suggestions with OSM Nominatim API (debounced)
  useEffect(() => {
    if (deliveryOption !== 'despacho' || !direccion.trim() || direccion.length < 4) {
      setAddressSuggestions([]);
      return;
    }

    if (addressSuggestions.includes(direccion)) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            direccion
          )}&countrycodes=cl&limit=5`,
          {
            headers: {
              'User-Agent': 'los-tocayos-market-app'
            }
          }
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          const suggestions = data.map((item: any) => item.display_name);
          setAddressSuggestions(suggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error al obtener sugerencias de dirección:', err);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [direccion, deliveryOption]);

  const handleSelectSuggestion = (val: string) => {
    setDireccion(val);
    setShowSuggestions(false);
  };

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('pehuen_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Error parsing cart:', err);
      }
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  const costoDespacho = deliveryOption === 'despacho' ? 2500 : 0;
  const total = subtotal + costoDespacho;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!nombre.trim() || !telefono.trim()) {
      alert('Por favor, ingresa tu nombre y teléfono.');
      return;
    }

    if (deliveryOption === 'despacho' && !direccion.trim()) {
      alert('Por favor, ingresa tu dirección para el despacho.');
      return;
    }

    setEnviando(true);

    try {
      const itemsPedido: ItemPedido[] = cart.map(item => ({
        producto_id: item.producto.id,
        nombre: item.producto.nombre,
        precio_unitario: item.producto.precio,
        unidad: item.producto.unidad,
        cantidad: item.cantidad,
        total: item.producto.precio * item.cantidad,
        es_caja: false,
        cantidad_por_caja: item.producto.cantidad_por_caja || undefined,
        tipo_empaque: item.producto.tipo_empaque || undefined
      }));

      // We call the crearPedido service
      // We pass the fields. ID, numero_pedido, fecha, etc. will be set by the transactional creator.
      const payload: Omit<Pedido, 'id' | 'numero_pedido' | 'fecha' | 'createdAt' | 'updatedAt'> = {
        cliente_nombre: nombre.trim(),
        items: itemsPedido,
        total: total,
        estado: 'pendiente',
        estado_pago: 'pendiente',
        metodo_pago: metodoPago,
        notas: notas.trim() || undefined,
        direccion_entrega: deliveryOption === 'despacho' ? direccion.trim() : 'Retiro en Local'
      };

      const { id: docId, numeroPedido } = await PedidosService.crearPedido(payload);
      setNumeroPedidoCreado(numeroPedido);

      // Success
      setExito(true);
      localStorage.removeItem('pehuen_cart'); // Clear cart
    } catch (err) {
      console.error('Error al registrar pedido:', err);
      alert('Ocurrió un error al procesar tu pedido. Por favor intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleWhatsAppSend = () => {
    if (!numeroPedidoCreado) return;

    const itemsText = cart.map(item => 
      `- ${item.producto.nombre} x${item.cantidad} (${formatCLPCurrency(item.producto.precio * item.cantidad)})`
    ).join('\n');

    const message = `*NUEVO PEDIDO WEB #PED-${numeroPedidoCreado}*\n\n` +
      `*Cliente:* ${nombre}\n` +
      `*Teléfono:* ${telefono}\n` +
      `*Tipo:* ${deliveryOption === 'despacho' ? 'Despacho a Domicilio' : 'Retiro en Local'}\n` +
      (deliveryOption === 'despacho' ? `*Dirección:* ${direccion}\n` : '') +
      `*Método de Pago:* ${metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'}\n` +
      (notas.trim() ? `*Notas:* ${notas}\n` : '') +
      `\n*Productos:*\n${itemsText}\n\n` +
      `*Subtotal:* ${formatCLPCurrency(subtotal)}\n` +
      (deliveryOption === 'despacho' ? `*Despacho:* ${formatCLPCurrency(costoDespacho)}\n` : '') +
      `*Total Final:* ${formatCLPCurrency(total)}`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/56912345678?text=${encodedText}`; // Replace with actual business WhatsApp number
    window.open(whatsappUrl, '_blank');
  };

  if (exito) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
        {/* Top Banner (Contact info) */}
        <div className="bg-emerald-900 text-white text-xs py-2 px-4 hidden sm:block">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 opacity-90">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                +56 9 1234 5678
              </span>
              <span className="flex items-center gap-1.5 opacity-90">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                La Vega Central, Santiago
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 opacity-90">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Lunes a Sábado: 08:00 - 18:00
              </span>
              <Link href="/login" className="hover:text-emerald-300 font-bold transition-all">
                Portal POS
              </Link>
            </div>
          </div>
        </div>

        <div>
          {/* Header */}
          <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 mr-2">
                  <ArrowLeft className="h-5 w-5 text-slate-500 hover:text-emerald-600 transition-colors" />
                </Link>
                <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <span className="text-white font-black text-xl tracking-wider">LT</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg text-emerald-800 tracking-tight leading-tight uppercase">Los Tocayos</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest leading-none">PEDIDO CONFIRMADO</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                  Volver al catálogo
                </Link>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-12 flex justify-center">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">¡Pedido Recibido!</h2>
              <p className="text-slate-500 font-medium text-sm mt-2">
                Hemos registrado tu pedido con el identificador:
              </p>
              <div className="bg-emerald-50 text-emerald-800 font-extrabold text-lg px-4 py-2 rounded-xl mt-4 border border-emerald-100/60">
                #PED-{numeroPedidoCreado || 'N/A'}
              </div>

              <p className="text-xs text-slate-400 mt-6 max-w-xs leading-relaxed">
                Para acelerar el despacho, te sugerimos enviar el detalle de tu pedido a nuestro WhatsApp presionando el botón a continuación.
              </p>

              <button
                onClick={handleWhatsAppSend}
                className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Enviar por WhatsApp
              </button>

              <Link href="/" className="w-full">
                <button className="w-full mt-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all cursor-pointer">
                  Volver a la Tienda
                </button>
              </Link>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 mt-20 border-t-4 border-emerald-600">
          <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: About */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm leading-none">LT</span>
                </div>
                <span className="font-extrabold text-md tracking-tight uppercase">Los Tocayos</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seleccionamos diariamente de La Vega Central y Lo Valledor las mejores frutas y verduras. Nos enfocamos en calidad, frescura y el mejor precio de Santiago.
              </p>
              <div className="flex gap-3 text-xs text-slate-400 items-center">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Compra 100% Protegida
              </div>
            </div>

            {/* Col 2: Horarios */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Horario de Atención</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex justify-between">
                  <span>Lunes a Viernes</span>
                  <span className="text-white font-semibold">08:00 - 18:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Sábado</span>
                  <span className="text-white font-semibold">08:00 - 16:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Domingo y Festivos</span>
                  <span className="text-slate-500 font-semibold">Cerrado</span>
                </li>
              </ul>
            </div>

            {/* Col 3: Enlaces Rápidos */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Enlaces Útiles</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/" className="hover:text-emerald-400 transition-colors">
                    Ver Todo el Catálogo
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-emerald-400 transition-colors">
                    Acceso Administración (POS)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Contacto */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Contacto</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500" />
                  <span>+56 9 1234 5678</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span>Vega Central, Local 142, Recoleta</span>
                </li>
                <li className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  <span className="text-[10px] text-slate-500">Aceptamos Efectivo, Débito, Crédito y Transferencias</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="border-t border-slate-800 bg-slate-950 py-4 px-4 text-center text-[10px] text-slate-500">
            <p>© {new Date().getFullYear()} Los Tocayos. Todos los derechos reservados. Vega Central, Santiago, Chile.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
      {/* Top Banner (Contact info) */}
      <div className="bg-emerald-900 text-white text-xs py-2 px-4 hidden sm:block">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 opacity-90">
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              +56 9 1234 5678
            </span>
            <span className="flex items-center gap-1.5 opacity-90">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              La Vega Central, Santiago
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 opacity-90">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              Lunes a Sábado: 08:00 - 18:00
            </span>
            <Link href="/login" className="hover:text-emerald-300 font-bold transition-all">
              Portal POS
            </Link>
          </div>
        </div>
      </div>

      <div>
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 mr-2">
                <ArrowLeft className="h-5 w-5 text-slate-500 hover:text-emerald-600 transition-colors" />
              </Link>
              <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <span className="text-white font-black text-xl tracking-wider">LT</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-emerald-800 tracking-tight leading-tight uppercase">Los Tocayos</span>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest leading-none">FINALIZAR COMPRA</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                Volver al catálogo
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {cart.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center flex flex-col items-center gap-4 shadow-sm my-10">
              <ShoppingBag className="h-16 w-16 text-slate-200" />
              <p className="font-bold text-slate-500">No tienes productos en tu canasta.</p>
              <Link href="/">
                <button className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 cursor-pointer">
                  Ver Catálogo
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form */}
              <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
                {/* Delivery Section */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-sm space-y-4">
                  <h2 className="font-extrabold text-base text-slate-800">1. Método de Entrega</h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryOption('despacho')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        deliveryOption === 'despacho'
                          ? 'border-emerald-600 bg-emerald-50/40 text-emerald-800 font-bold'
                          : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                      <span className="text-xs">Despacho</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setDeliveryOption('retiro')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        deliveryOption === 'retiro'
                          ? 'border-emerald-600 bg-emerald-50/40 text-emerald-800 font-bold'
                          : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Store className="h-5 w-5" />
                      <span className="text-xs">Retiro en Local</span>
                    </button>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-sm space-y-4">
                  <h2 className="font-extrabold text-base text-slate-800">2. Tus Datos</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono de Contacto</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. +56 9 1234 5678"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {deliveryOption === 'despacho' && (
                      <div className="animate-in fade-in duration-200 relative">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dirección de Despacho</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Av. Providencia 1234, Providencia"
                          value={direccion}
                          onChange={(e) => {
                            setDireccion(e.target.value);
                            setShowSuggestions(true);
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                        {suggestionsLoading && (
                          <div className="absolute right-3 top-9 text-xs text-slate-400">Buscando...</div>
                        )}
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-50">
                            {addressSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 transition-colors font-medium truncate block"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notas del Pedido (Opcional)</label>
                      <textarea
                        placeholder="Ej. Tocar el timbre de la reja, dejar con el conserje..."
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-20 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-sm space-y-4">
                  <h2 className="font-extrabold text-base text-slate-800">3. Método de Pago Preferido</h2>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                      <input
                        type="radio"
                        name="metodoPago"
                        checked={metodoPago === 'transferencia'}
                        onChange={() => setMetodoPago('transferencia')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      Transferencia Bancaria
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                      <input
                        type="radio"
                        name="metodoPago"
                        checked={metodoPago === 'efectivo'}
                        onChange={() => setMetodoPago('efectivo')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      Efectivo al recibir
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/10 cursor-pointer"
                >
                  {enviando ? 'Procesando pedido...' : `Enviar Pedido (${formatCLPCurrency(total)})`}
                </button>
              </form>

              {/* Cart Summary */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 md:p-6 shadow-sm space-y-4 sticky top-24">
                <h2 className="font-extrabold text-base text-slate-800">Resumen del Pedido</h2>
                
                <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {cart.map((item) => (
                    <div key={item.producto.id} className="py-3 flex items-center justify-between text-sm gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 truncate">{item.producto.nombre}</p>
                        <p className="text-xs text-slate-400 font-semibold">
                          {item.cantidad} x {formatCLPCurrency(item.producto.precio)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">
                        {formatCLPCurrency(item.producto.precio * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCLPCurrency(subtotal)}</span>
                  </div>
                  {deliveryOption === 'despacho' && (
                    <div className="flex items-center justify-between text-sm text-slate-500 font-semibold">
                      <span>Costo de Despacho</span>
                      <span>{formatCLPCurrency(costoDespacho)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-sm">Total del Pedido</span>
                    <span className="font-black text-xl text-emerald-800">{formatCLPCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-20 border-t-4 border-emerald-600">
        <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-extrabold text-sm leading-none">LT</span>
              </div>
              <span className="font-extrabold text-md tracking-tight uppercase">Los Tocayos</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seleccionamos diariamente de La Vega Central y Lo Valledor las mejores frutas y verduras. Nos enfocamos en calidad, frescura y el mejor precio de Santiago.
            </p>
            <div className="flex gap-3 text-xs text-slate-400 items-center">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Compra 100% Protegida
            </div>
          </div>

          {/* Col 2: Horarios */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Horario de Atención</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex justify-between">
                <span>Lunes a Viernes</span>
                <span className="text-white font-semibold">08:00 - 18:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado</span>
                <span className="text-white font-semibold">08:00 - 16:00</span>
              </li>
              <li className="flex justify-between">
                <span>Domingo y Festivos</span>
                <span className="text-slate-500 font-semibold">Cerrado</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Enlaces Rápidos */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Enlaces Útiles</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  Ver Todo el Catálogo
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition-colors">
                  Acceso Administración (POS)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contacto */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Contacto</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>+56 9 1234 5678</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>Vega Central, Local 142, Recoleta</span>
              </li>
              <li className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] text-slate-500">Aceptamos Efectivo, Débito, Crédito y Transferencias</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="border-t border-slate-800 bg-slate-950 py-4 px-4 text-center text-[10px] text-slate-500">
          <p>© {new Date().getFullYear()} Los Tocayos. Todos los derechos reservados. Vega Central, Santiago, Chile.</p>
        </div>
      </footer>
    </div>
  );
}

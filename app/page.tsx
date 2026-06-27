'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Producto } from '@/lib/types/pos';
import { formatCLPCurrency } from '@/lib/utils';
import { ShoppingBag, Search, Plus, Minus, Trash2, X, ChevronLeft, ChevronRight, Phone, MapPin, Clock, CreditCard, ShieldCheck, Apple, Leaf, Snowflake, Box, Sprout, LayoutGrid, Settings, Truck, Package } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function CatalogPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselSlides = [
    {
      title: "Despachos Gratis desde $30.000",
      description: "Recibe tus frutas y verduras frescas directo en tu domicilio sin costo de envío. ¡Fresco, rápido y conveniente!",
      badge: "PROMOCIÓN DESPACHO",
      icon: Truck,
      bg: "from-emerald-800 via-emerald-700 to-teal-800"
    },
    {
      title: "De la Vega Central a tu Mesa",
      description: "Calidad premium seleccionada a mano todas las mañanas por expertos para garantizar el mejor sabor y frescura en tu hogar.",
      badge: "100% NATURAL",
      icon: Apple,
      bg: "from-teal-850 via-emerald-850 to-emerald-950"
    },
    {
      title: "Compra Mayorista & Precios Convenientes",
      description: "Ofrecemos precios al detalle y por mayor para negocios, minimarkets y hogares numerosos. Ahorra comprando por cajas o sacos.",
      badge: "VENTA POR VOLUMEN",
      icon: Package,
      bg: "from-amber-800 via-emerald-850 to-teal-900"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getCategoryMeta = (cat: string) => {
    const normalized = cat.toLowerCase().trim();
    const mapping: { [key: string]: { name: string; icon: any; bg: string; textClass: string } } = {
      todos: { name: 'Todos', icon: LayoutGrid, bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-750', textClass: 'text-emerald-700' },
      fruta: { name: 'Frutas', icon: Apple, bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700', textClass: 'text-rose-700' },
      verdura: { name: 'Verduras', icon: Leaf, bg: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700', textClass: 'text-green-700' },
      abarrotes: { name: 'Abarrotes', icon: Package, bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700', textClass: 'text-amber-700' },
      congelados: { name: 'Congelados', icon: Snowflake, bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700', textClass: 'text-cyan-700' },
      otros: { name: 'Otros', icon: Box, bg: 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700', textClass: 'text-slate-700' },
    };
    if (mapping[normalized]) return mapping[normalized];
    if (normalized.includes('frut')) return { name: cat, icon: Apple, bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700', textClass: 'text-orange-700' };
    if (normalized.includes('verd') || normalized.includes('vegeta') || normalized.includes('hortali')) {
      return { name: cat, icon: Sprout, bg: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700', textClass: 'text-green-700' };
    }
    if (normalized.includes('cong')) return { name: cat, icon: Snowflake, bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700', textClass: 'text-cyan-700' };
    if (normalized.includes('desp') || normalized.includes('abarrot') || normalized.includes('legum')) {
      return { name: cat, icon: Package, bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700', textClass: 'text-amber-700' };
    }
    return { name: cat, icon: Box, bg: 'bg-emerald-50/50 hover:bg-emerald-100/50 border-emerald-100 text-emerald-800', textClass: 'text-emerald-800' };
  };

  // Load active products in real-time
  useEffect(() => {
    const q = query(collection(db, 'productos'), where('activo', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Producto[];
      setProductos(prods);
      setCargando(false);
    }, (error) => {
      console.error('Error al cargar catálogo de productos:', error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  // Load cart from localStorage on mount
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

  // Save cart to localStorage on change
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('pehuen_cart', JSON.stringify(newCart));
  };

  // Get categories from active products
  const categories = ['todos', ...Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))) as string[]];

  const addToCart = (producto: Producto) => {
    const existing = cart.find(item => item.producto.id === producto.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        item.producto.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      );
    } else {
      newCart = [...cart, { producto, cantidad: 1 }];
    }
    saveCart(newCart);
  };

  const updateQuantity = (productoId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.producto.id === productoId) {
        const nextQty = item.cantidad + delta;
        return nextQty > 0 ? { ...item, cantidad: nextQty } : null;
      }
      return item;
    }).filter((item): item is CartItem => item !== null);
    saveCart(newCart);
  };

  const removeFromCart = (productoId: string) => {
    const newCart = cart.filter(item => item.producto.id !== productoId);
    saveCart(newCart);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.includes(searchTerm));
    const matchesCategory = selectedCategory === 'todos' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
            <span className="h-3 w-px bg-emerald-800" />
            <Link
              href="/login"
              className="hover:text-emerald-300 transition-colors text-white flex items-center gap-1 opacity-90 hover:opacity-100"
              title="Portal Administrativo (POS)"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Administración</span>
            </Link>
          </div>
        </div>
      </div>

      <div>
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <span className="text-white font-black text-xl tracking-wider">LT</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-emerald-800 tracking-tight leading-tight uppercase">Los Tocayos</span>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest leading-none">FRUTAS Y VERDURAS</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md hidden md:block">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar frutas, verduras, despensa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 focus:bg-white border-none focus:ring-2 focus:ring-emerald-500 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            {/* Cart link */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Mi Canasta</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white font-extrabold text-xs h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Carousel Hero Banner */}
        <section className="relative overflow-hidden text-white min-h-[460px] md:min-h-[550px] flex items-center bg-slate-900">
          {/* Slides container */}
          <div className="absolute inset-0 w-full h-full flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
            {carouselSlides.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <div
                  key={index}
                  className={`w-full h-full flex-shrink-0 bg-gradient-to-br ${slide.bg} py-14 px-4 flex flex-col justify-center items-center text-center relative`}
                  style={{ minWidth: '100%' }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent)] pointer-events-none" />
                  <div className="container mx-auto max-w-2xl relative z-10 space-y-5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-[10px] md:text-xs font-black tracking-widest rounded-full uppercase border border-white/10">
                        {slide.badge}
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight flex items-center justify-center gap-3">
                      <span className="bg-white/10 p-2 md:p-3 rounded-2xl flex items-center justify-center">
                        <Icon className="h-6 w-6 md:h-10 md:w-10 text-white" />
                      </span>
                      {slide.title}
                    </h1>
                    <p className="text-emerald-50 text-xs md:text-base font-medium opacity-90 max-w-lg mx-auto leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel dots controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
            {carouselSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCarouselIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${carouselIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Slider Navigation Arrows */}
          <button
            onClick={() => setCarouselIndex((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer hidden md:flex items-center justify-center focus:outline-none"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setCarouselIndex((prev) => (prev + 1) % carouselSlides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer hidden md:flex items-center justify-center focus:outline-none"
            aria-label="Siguiente slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Search bar overlay for mobile devices */}
          <div className="absolute bottom-8 left-4 right-4 z-10 md:hidden max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="¿Qué buscas hoy?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white text-slate-800 border-none rounded-xl text-sm shadow-xl outline-none"
              />
            </div>
          </div>
        </section>

        {/* Main Catalog */}
        <main className="container mx-auto px-4 py-8">
          {/* Categories Circle Card Selector */}
          <div className="mb-10">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">Nuestras Categorías</h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200/60">
              {categories.map((category) => {
                const meta = getCategoryMeta(category);
                const isSelected = selectedCategory === category;
                const count = category === 'todos'
                  ? productos.length
                  : productos.filter(p => p.categoria === category).length;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="flex flex-col items-center gap-2 min-w-[76px] cursor-pointer group focus:outline-none"
                  >
                    {/* Circle Icon Container */}
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-sm ${isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-md shadow-emerald-600/20 ring-4 ring-emerald-100'
                      : `${meta.bg} border-slate-100 group-hover:scale-105 group-hover:shadow-md`
                      }`}>
                      <meta.icon className={`h-6 w-6 ${isSelected ? 'text-white' : ''}`} />
                    </div>
                    {/* Label & Count */}
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-bold capitalize transition-colors truncate max-w-[84px] ${isSelected ? 'text-emerald-700 font-extrabold' : 'text-slate-600 group-hover:text-slate-800'
                        }`}>
                        {meta.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                        {count} {count === 1 ? 'prod' : 'prods'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Cargando catálogo Los Tocayos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg font-bold text-slate-400">No encontramos productos en esta sección.</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('todos'); }}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
              >
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((producto) => {
                const inCart = cart.find(item => item.producto.id === producto.id);
                const isOutOfStock = (producto.stock_actual || 0) <= 0;

                return (
                  <div
                    key={producto.id}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group"
                  >
                    {/* Image container */}
                    <div className="relative pt-[75%] bg-slate-50 border-b border-slate-50 overflow-hidden">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-emerald-800 bg-emerald-50">
                          <span className="font-extrabold text-2xl uppercase">{producto.nombre.substring(0, 2)}</span>
                        </div>
                      )}

                      {/* Category badge */}
                      {producto.categoria && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur text-[10px] font-extrabold text-emerald-800 uppercase rounded-md shadow-sm border border-emerald-50">
                          {producto.categoria}
                        </span>
                      )}

                      {/* Out of stock overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg uppercase tracking-wide">
                            Agotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm md:text-base text-slate-800 line-clamp-2 leading-tight min-h-[2.5rem]">
                          {producto.nombre}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Venta por {producto.unidad === 'kg' ? 'Kilo' : 'Unidad'}
                          </span>
                          {producto.calidad && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded capitalize">
                              Calidad {producto.calidad}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-base md:text-lg font-black text-emerald-700">
                            {formatCLPCurrency(producto.precio)}
                          </span>
                        </div>

                        {/* Add to Cart Actions */}
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                          >
                            No Disponible
                          </button>
                        ) : inCart ? (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(producto.id, -1)}
                              className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-800 transition-colors cursor-pointer"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-extrabold text-emerald-950">{inCart.cantidad}</span>
                            <button
                              onClick={() => updateQuantity(producto.id, 1)}
                              className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-800 transition-colors cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(producto)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <button onClick={() => { setSelectedCategory('todos'); setSearchTerm(''); }} className="hover:text-emerald-400 transition-colors">
                  Ver Todo el Catálogo
                </button>
              </li>
              <li>
                <button onClick={() => setCartOpen(true)} className="hover:text-emerald-400 transition-colors">
                  Ver mi Canasta
                </button>
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

      {/* Shopping Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h2 className="font-extrabold text-lg text-slate-800">Mi Canasta de Compra</h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 gap-4 flex flex-col">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                  <ShoppingBag className="h-16 w-16 text-slate-200" />
                  <p className="font-bold text-slate-400 text-sm">Tu canasta está vacía por ahora.</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Explorar productos
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.producto.id} className="flex items-center gap-3 border-b border-slate-50 pb-4">
                    <div className="h-14 w-14 bg-slate-50 rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.producto.imagen_url ? (
                        <img
                          src={item.producto.imagen_url}
                          alt={item.producto.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-800 bg-emerald-50 font-bold text-xs uppercase">
                          {item.producto.nombre.substring(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{item.producto.nombre}</h4>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        {formatCLPCurrency(item.producto.precio)} {item.producto.unidad === 'kg' ? '/ kg' : '/ ud'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.producto.id, -1)}
                        className="p-1 hover:bg-slate-200/50 rounded-md text-slate-600 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 px-1">{item.cantidad}</span>
                      <button
                        onClick={() => updateQuantity(item.producto.id, 1)}
                        className="p-1 hover:bg-slate-200/50 rounded-md text-slate-600 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {cart.length > 0 && (
              <div className="px-6 py-6 border-t border-slate-100 bg-slate-50">
                {/* Free Shipping Progress Indicator */}
                <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  {30000 - totalPrice > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Te faltan <span className="font-bold text-emerald-700">{formatCLPCurrency(30000 - totalPrice)}</span> para <strong>Envío Gratis</strong></span>
                        <span className="text-slate-400 font-medium">{Math.round((totalPrice / 30000) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${Math.min((totalPrice / 30000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                        <span className="h-5 w-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px]">✓</span>
                        ¡Felicidades! Tienes <span className="text-emerald-600 font-extrabold underline">Envío Gratis</span>
                      </div>
                      <div className="h-2 w-full bg-emerald-600 rounded-full" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-slate-500 text-sm">Total estimado</span>
                  <span className="font-black text-xl text-slate-800">{formatCLPCurrency(totalPrice)}</span>
                </div>
                <Link href="/checkout">
                  <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer">
                    Proceder al Checkout
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

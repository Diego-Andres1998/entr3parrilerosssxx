import React, { useState } from "react";
import { MenuItem, OrderItem } from "../types";
import { ShoppingCart, Flame, ShieldCheck, Mail, Send, CheckCircle, Trash2, MapPin, Truck, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Gourmet catalog of meats and grocery items
const MENU_ITEMS: MenuItem[] = [
  {
    id: "lomo-vetado",
    name: "Lomo Vetado Angus Premium",
    category: "carne",
    price: 18990,
    description: "Corte de gran infiltración de grasa, garantizando un sabor y jugosidad inigualable a la parrilla.",
    image: "🥩",
    badge: "Más Vendido"
  },
  {
    id: "entraña-fina",
    name: "Entraña Fina Americana",
    category: "carne",
    price: 24990,
    description: "Corte delgado, tierno y de cocción rápida. Ideal para comenzar cualquier asado parrillero.",
    image: "🥩",
    badge: "Premium"
  },
  {
    id: "asado-tira",
    name: "Asado de Tira de Exportación",
    category: "carne",
    price: 15990,
    description: "Corte con hueso ideal para cocciones lentas, logrando que la carne se desprenda sola.",
    image: "🍖"
  },
  {
    id: "bife-chorizo",
    name: "Bife de Chorizo Selección",
    category: "carne",
    price: 14990,
    description: "Bife grueso tradicional argentino con una cobertura de grasa que mantiene húmedas las fibras.",
    image: "🥩"
  },
  {
    id: "costillar-cerdo",
    name: "Costillar de Cerdo Aliñado",
    category: "carne",
    price: 11990,
    description: "Costillar marinado en nuestra receta secreta de adobos chilenos y especias rústicas.",
    image: "🍖"
  },
  {
    id: "carbon-espino",
    name: "Carbón de Espino de Alto Rendimiento (4kg)",
    category: "abarrotes",
    price: 5990,
    description: "Carbón certificado artesanal con alta densidad calórica y durabilidad de braza constante.",
    image: "🪵",
    badge: "Indispensable"
  },
  {
    id: "sal-cahuil",
    name: "Sal de Cahuil Especiada Ahumada",
    category: "abarrotes",
    price: 3490,
    description: "Sal de costa chilena extraída a mano, sazonada con merquén ahumado y romero fresco.",
    image: "🧂"
  },
  {
    id: "chimichurri",
    name: "Chimichurri Artesanal Entre Parrilleros",
    category: "abarrotes",
    price: 4490,
    description: "Aderezo tradicional de perejil, ajo, ají y aceites macerados por 15 días.",
    image: "🥫"
  },
  {
    id: "pisco-artesanal",
    name: "Pisco Artesanal Mistral / Reservado 40°",
    category: "abarrotes",
    price: 12990,
    description: "El maridaje y bajativo perfecto para coronar una jornada de asado artesanal.",
    image: "🍾"
  }
];

interface LandingPageProps {
  onOrderPlaced: () => void;
}

export default function LandingPage({ onOrderPlaced }: LandingPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<"todos" | "carne" | "abarrotes">("todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("Osorno Centro");
  const [notes, setNotes] = useState("");
  
  // Checkout process tracking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  // Filter products
  const filteredProducts = MENU_ITEMS.filter(item => 
    selectedCategory === "todos" ? true : item.category === selectedCategory
  );

  // Cart operations
  const updateQuantity = (itemId: string, increment: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + increment;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const getCartTotal = () => {
    return MENU_ITEMS.reduce((sum, item) => {
      const q = cart[item.id] || 0;
      return sum + (q * item.price);
    }, 0);
  };

  const getCartCount = () => {
    return Object.keys(cart).reduce((sum, key) => sum + (cart[key] || 0), 0);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getCartCount() === 0) return;

    setIsSubmitting(true);

    // Build items payload
    const itemsPayload: OrderItem[] = MENU_ITEMS.filter(item => cart[item.id] > 0).map(item => ({
      name: item.name,
      category: item.category,
      quantity: cart[item.id],
      price: item.price
    }));

    const payload = {
      customer_name: customerName,
      email,
      phone,
      branch,
      items: itemsPayload,
      total_amount: getCartTotal(),
      status: "Pendiente"
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setOrderSuccess(data);
        setCart({});
        setCustomerName("");
        setEmail("");
        setPhone("");
        setNotes("");
        onOrderPlaced(); // Refresh admin side
      } else {
        alert("Ocurrió un error al despachar tu pedido. Por favor, reintenta.");
      }
    } catch (err) {
      console.error(err);
      alert("Error estableciendo conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e5e5e5]">
      {/* Hero Banner Section - Editorial Style */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#161616] px-6 py-16 text-center md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-[#b91c1c]/10 border border-[#b91c1c]/30 text-[#b91c1c] font-mono text-xs uppercase mb-6 tracking-[0.2em] font-semibold animate-pulse">
            <Flame className="w-4 h-4 text-[#b91c1c] fill-[#b91c1c]" /> Selección Boutique Chile
          </div>
          
          <h1 className="font-serif italic text-5xl md:text-7xl text-white tracking-tight">
            Entre <span className="text-[#b91c1c]">Parrilleros</span>
          </h1>
          
          <p className="mt-6 text-sm md:text-base text-zinc-400 font-sans max-w-2xl mx-auto leading-relaxed tracking-wide">
            La pyme boutique favorita del sur de Chile. Llevamos las mejores carnes premium Angus, abarrotes artesanales y servicio parrillero directo a tu mesa en Osorno y alrededores.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
            <div className="flex items-center gap-2 bg-[#121212] px-4 py-3 border border-white/5 rounded-none">
              <MapPin className="w-3.5 h-3.5 text-[#b91c1c]" /> Osorno Centro
            </div>
            <div className="flex items-center gap-2 bg-[#121212] px-4 py-3 border border-white/5 rounded-none">
              <Truck className="w-3.5 h-3.5 text-[#b91c1c]" /> Despacho Express
            </div>
            <div className="flex items-center gap-2 bg-[#121212] px-4 py-3 border border-white/5 rounded-none">
              <Award className="w-3.5 h-3.5 text-[#b91c1c]" /> Selección Elite
            </div>
          </div>
        </div>
      </section>

      {/* Main Order builder */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Products Column */}
        <div className="lg:col-span-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-5 mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-serif italic text-white tracking-tight">Haz tu Pedido</h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">Cortes selectos y complementos para tu fuego.</p>
            </div>

            {/* Category selection Tabs */}
            <div className="flex items-center gap-1 bg-[#161616] p-1 border border-white/10 rounded-none">
              {(["todos", "carne", "abarrotes"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-none text-[10px] font-mono uppercase tracking-widest font-semibold transition-all ${
                    selectedCategory === cat 
                      ? "bg-[#b91c1c] text-white" 
                      : "text-zinc-500 hover:text-white"
                  }`}
                  id={`cat-filter-${cat}`}
                >
                  {cat === "todos" ? "Todo" : cat === "carne" ? "Carnes" : "Abarrotes"}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredProducts.map(product => {
              const q = cart[product.id] || 0;
              return (
                <div 
                  key={product.id} 
                  id={`product-card-${product.id}`}
                  className="group relative flex flex-col justify-between bg-[#161616] border border-white/10 rounded-none p-6 transition-all duration-300 hover:border-white/20 hover:bg-[#161616]/80"
                >
                  {product.badge && (
                    <span className="absolute top-4 right-4 bg-[#b91c1c] text-white text-[9px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-none border border-red-800">
                      {product.badge}
                    </span>
                  )}

                  <div>
                    <span className="text-4xl block mb-4 filter group-hover:scale-110 transition-transform duration-300 select-none">
                      {product.image}
                    </span>
                    
                    <h3 className="font-serif italic text-lg text-white group-hover:text-[#b91c1c] transition-colors leading-snug">
                      {product.name}
                    </h3>
                    
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                    <span className="font-mono text-base font-semibold text-[#b91c1c]">
                      ${product.price.toLocaleString("es-CL")}
                    </span>

                    {/* Quantity selectors */}
                    {q > 0 ? (
                      <div className="flex items-center gap-3 bg-[#121212] border border-white/10 rounded-none p-1">
                        <button 
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-none bg-zinc-800 text-zinc-300 hover:bg-red-950/45 hover:text-[#b91c1c] transition text-xs font-mono font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold w-4 text-center text-white">{q}</span>
                        <button 
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-none bg-zinc-800 text-zinc-300 hover:bg-green-950/40 hover:text-green-400 transition text-xs font-mono font-bold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="bg-zinc-850 hover:bg-[#b91c1c] hover:border-[#b91c1c] text-zinc-300 hover:text-white font-mono uppercase tracking-[0.15em] px-4 py-2 rounded-none text-[10px] flex items-center gap-2 transition-all duration-300 border border-white/10 active:scale-95"
                        id={`add-to-cart-${product.id}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form and Cart Column */}
        <div className="lg:col-span-5 bg-[#161616] border border-white/10 rounded-none p-6 lg:p-8 h-fit relative">
          
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
            <Flame className="w-48 h-48 text-[#b91c1c]" />
          </div>

          <h3 className="text-xl font-serif italic text-white flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <ShoppingCart className="w-5 h-5 text-[#b91c1c]" /> Tu Carro Parrillero
          </h3>

          <AnimatePresence mode="wait">
            {orderSuccess ? (
              <motion.div 
                key="success-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-[#b91c1c]/10 text-[#b91c1c] rounded-none flex items-center justify-center mx-auto mb-4 border border-[#b91c1c]/35">
                  <CheckCircle className="w-10 h-10" />
                </div>
                
                <h4 className="text-lg font-serif italic text-[#b91c1c]">¡Pedido Enviado Exitosamente!</h4>
                <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
                  La orden ha sido ingresada en la base de datos de manera permanente. 
                </p>

                {/* Database logs simulated in realtime */}
                <div className="bg-[#121212]/80 border border-white/10 mt-6 rounded-none p-4 text-left text-xs font-mono">
                  <div className="flex items-center gap-2 text-[#b91c1c] border-b border-white/5 pb-2 mb-2 font-semibold uppercase tracking-wider text-[10px]">
                    <Flame className="w-3.5 h-3.5 animate-pulse" /> Logs del Servidor en Vivo:
                  </div>
                  
                  <div className="space-y-2 text-zinc-400 leading-relaxed text-[10px]">
                    <p className="text-green-500">✔ Guardado definitivo en Laragon MySQL exitoso.</p>
                    <p className="text-zinc-500">🔹 ID Asignado: <span className="text-white font-bold">#{orderSuccess.order?.id}</span></p>
                    <p className="text-zinc-500">🔹 Sucursal de Despacho: {orderSuccess.order?.branch}</p>
                    
                    <div className="border-t border-white/5 pt-2 mt-2">
                      <p className="text-[#b91c1c] flex items-center gap-1 font-bold">
                        <Mail className="w-3 h-3" /> Notificación por Correo:
                      </p>
                      <p className="pl-3 text-zinc-500">{orderSuccess.notification?.email?.message}</p>
                    </div>

                    <div className="border-t border-white/5 pt-2">
                      <p className="text-blue-400 flex items-center gap-1 font-bold">
                        <Send className="w-3 h-3" /> Sincronización Google Sheets:
                      </p>
                      <p className="pl-3 text-zinc-500">{orderSuccess.notification?.sheets?.message}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setOrderSuccess(null)}
                  className="mt-6 w-full bg-neutral-800 hover:bg-[#b91c1c] hover:text-white text-zinc-300 font-mono uppercase tracking-widest py-3 rounded-none text-xs transition font-semibold"
                >
                  Armar Otro Pedido
                </button>
              </motion.div>
            ) : getCartCount() === 0 ? (
              <motion.div 
                key="empty-cart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 text-zinc-500"
              >
                <span className="text-5xl block mb-3 opacity-80">🔥</span>
                <p className="text-sm font-semibold font-serif italic text-zinc-400">El carro está vacío</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto leading-relaxed">Selecciona cortes de carne o abarrotes para pre-visualizar el monto total del asado.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="active-cart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* List selected items */}
                <div className="max-h-60 overflow-y-auto mb-6 pr-2 space-y-3 scrollbar-thin">
                  {MENU_ITEMS.filter(item => cart[item.id] > 0).map(item => {
                    const count = cart[item.id];
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-[#121212]/50 p-3 rounded-none border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.image}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white font-serif italic">{item.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                              ${item.price.toLocaleString("es-CL")} x {count}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-[#b91c1c]">
                            ${(item.price * count).toLocaleString("es-CL")}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, -count)}
                            className="text-zinc-600 hover:text-red-500 p-1 transition"
                            title="Quitar todo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal */}
                <div className="border-t border-white/10 pt-4 mb-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Subtotal de Artículos</span>
                    <span className="font-mono text-zinc-400">${getCartTotal().toLocaleString("es-CL")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Despacho</span>
                    <span className="text-[#b91c1c] font-semibold font-mono text-xs uppercase tracking-wider">GRATIS</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="font-semibold text-zinc-350">Total Estimado</span>
                    <span className="font-mono text-lg font-bold text-[#b91c1c]">
                      ${getCartTotal().toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>

                {/* Buyer Form */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-white/10">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Tus Datos de Despacho</h4>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ej. Gonzalo Retamal"
                      className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none px-3 py-2 text-xs text-neutral-100 outline-none transition"
                      id="input-customer-name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Email de Contacto</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Ej. gonzalo@gmail.com"
                        className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none px-3 py-2 text-xs text-neutral-100 outline-none transition"
                        id="input-customer-email"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">WhatsApp / Celular</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Ej. +56982731192"
                        className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none px-3 py-2 text-xs text-neutral-100 outline-none transition"
                        id="input-customer-phone"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Sucursal Asociada</label>
                      <select
                        value={branch}
                        onChange={e => setBranch(e.target.value)}
                        className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none px-3 py-2 text-xs text-neutral-100 outline-none transition"
                        id="select-customer-branch"
                      >
                        <option value="Osorno Centro">Osorno Centro</option>
                        <option value="Santiago Providencia">Santiago Providencia</option>
                        <option value="Valdivia Costanera">Valdivia Costanera</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Vía de Recepción</label>
                      <div className="w-full bg-[#121212]/50 border border-white/10 font-semibold rounded-none px-3 py-2 text-xs text-[#b91c1c] flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-[#b91c1c]" /> Despacho a Domicilio
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Comentarios / Indicación de Corte</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ej. Prefiero el lomo vetado en un solo trozo / Entregar después de las 18:00 hrs."
                      rows={2}
                      className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none px-3 py-2 text-xs text-neutral-100 outline-none transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#b91c1c] hover:bg-red-700 disabled:bg-zinc-800 text-white font-mono uppercase tracking-widest py-3 px-4 rounded-none flex items-center justify-center gap-2 transition duration-300 transform active:scale-95 text-xs font-semibold select-none cursor-pointer"
                    id="submit-order-checkout"
                  >
                    {isSubmitting ? (
                      <>Procesando Solicitud...</>
                    ) : (
                      <>
                        <Flame className="w-4 h-4 fill-white" /> Confirmar Pedido Parrillero (${getCartTotal().toLocaleString("es-CL")})
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 pb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#b91c1c]" /> Tus transacciones están seguras en DB Laragon "parrillero"
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

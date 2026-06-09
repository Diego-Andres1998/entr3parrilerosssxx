import React, { useState, useEffect } from "react";
import { Order, DatabaseStatus } from "./types";
import { Flame, ShoppingCart, TrendingUp, Settings, Code } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LandingPage from "./components/LandingPage";
import AdminPanel from "./components/AdminPanel";
import MLDashboard from "./components/MLDashboard";
import AdminLogin from "./components/AdminLogin";

export default function App() {
  // Navigation tabs: customer storefront vs administration crm vs custom data models deep-dive
  const [activeTab, setActiveTab] = useState<"customer" | "admin" | "predictions">("customer");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem("isAdminAuthenticated") === "true"
  );
  
  // High-level client state
  const [orders, setOrders] = useState<Order[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Trigger cascade updates in components
  const triggerRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  // Fetch orders and backend database configs
  useEffect(() => {
    fetchOrdersAndDatabase();
  }, [refreshCounter]);

  const fetchOrdersAndDatabase = async () => {
    setLoading(true);
    try {
      // 1. Fetch Orders list
      const ordersResp = await fetch("/api/orders");
      if (ordersResp.ok) {
        const list = await ordersResp.json();
        setOrders(list);
      }
      
      // 2. Fetch DB Connection Status
      const dbResp = await fetch("/api/database-status");
      if (dbResp.ok) {
        const statusVal = await dbResp.json();
        setDbStatus(statusVal);
      }
    } catch (e) {
      console.error("⚠️ Error synchronizing full-stack data:", e);
    } finally {
      setLoading(false);
    }
  };

  // CRUD API handlers passed to children
  const handleUpdateOrderStatus = async (id: number, updatedFields: Partial<Order>): Promise<boolean> => {
    try {
      const resp = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (resp.ok) {
        triggerRefresh();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleDeleteOrder = async (id: number): Promise<boolean> => {
    try {
      const resp = await fetch(`/api/orders/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        triggerRefresh();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleCreateManualOrder = async (orderPayload: any): Promise<boolean> => {
    try {
      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      if (resp.ok) {
        triggerRefresh();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#e5e5e5] font-sans flex flex-col justify-between">
      
      {/* Dynamic Navigation Top Navbar */}
      <header className="border-b border-white/10 bg-[#121212]/95 backdrop-blur-md sticky top-0 z-50 px-6 py-6 md:px-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo brand - Editorial Header Accent */}
          <div className="flex flex-col cursor-pointer text-center md:text-left" onClick={() => setActiveTab("customer")}>
            <h1 className="text-4xl font-serif italic tracking-tight text-[#b91c1c]">
              Entre Parrilleros
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 mt-1">
              Cortes Premium & Abarrotes • Osorno Centro
            </p>
          </div>

          {/* Primary View Switcher tabs - Editorial Styled Buttons */}
          <nav className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-4 py-2.5 rounded-none text-[11px] uppercase tracking-widest font-semibold flex items-center gap-2 transition-all ${
                activeTab === "customer" 
                  ? "bg-[#b91c1c] text-white font-bold" 
                  : "bg-transparent text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
              }`}
              id="top-nav-customer"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Catálogo
            </button>
            
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2.5 rounded-none text-[11px] uppercase tracking-widest font-semibold flex items-center gap-2 transition-all ${
                activeTab === "admin" 
                  ? "bg-[#b91c1c] text-white font-bold" 
                  : "bg-transparent text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
              }`}
              id="top-nav-admin"
            >
              <Settings className="w-3.5 h-3.5" /> Consola Admin
            </button>
            
            <button
              onClick={() => setActiveTab("predictions")}
              className={`px-4 py-2.5 rounded-none text-[11px] uppercase tracking-widest font-semibold flex items-center gap-2 transition-all ${
                activeTab === "predictions" 
                  ? "bg-[#b91c1c] text-white font-bold" 
                  : "bg-transparent text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
              }`}
              id="top-nav-predictions"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Predicciones ML
            </button>

            {isAuthenticated && (
              <button
                onClick={() => {
                  sessionStorage.removeItem("isAdminAuthenticated");
                  setIsAuthenticated(false);
                  setActiveTab("customer");
                }}
                className="px-4 py-2.5 rounded-none text-[11px] uppercase tracking-widest font-semibold flex items-center gap-2 transition-all bg-zinc-950/80 text-zinc-500 hover:text-white border border-[#b91c1c]/20 hover:border-[#b91c1c] active:scale-95"
                id="top-nav-logout"
              >
                Cerrar Sesión
              </button>
            )}
          </nav>

        </div>
      </header>

      {/* Main Container View Switch */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "customer" && (
              <LandingPage onOrderPlaced={triggerRefresh} />
            )}
            
            {activeTab === "admin" && (
              isAuthenticated ? (
                <AdminPanel 
                  orders={orders}
                  loading={loading}
                  dbStatus={dbStatus}
                  refreshCounter={refreshCounter}
                  triggerRefresh={triggerRefresh}
                  onUpdateOrder={handleUpdateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                  onAddManualOrder={handleCreateManualOrder}
                />
              ) : (
                <AdminLogin onSuccess={() => setIsAuthenticated(true)} />
              )
            )}
            
            {activeTab === "predictions" && (
              isAuthenticated ? (
                <MLDashboard 
                  dbStatus={dbStatus}
                  refreshCounter={refreshCounter}
                  triggerRefresh={triggerRefresh}
                />
              ) : (
                <AdminLogin onSuccess={() => setIsAuthenticated(true)} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global bespoke footer - Editorial Style */}
      <footer className="bg-black border-t border-white/10 py-5 px-6 md:px-10 text-[9px] uppercase tracking-[0.2em] font-medium text-zinc-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Entre Parrilleros - Central Intelligence Engine</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full animate-pulse" /> Laragon MySQL Connected
            </span>
            <span>HeidiSQL SQLite Fallback</span>
            <span>Spreadsheet OAuth Ready</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Order, OrderItem, DatabaseStatus } from "../types";
import { 
  FileSpreadsheet, Mail, CheckCircle, RefreshCw, Flame, 
  Trash2, Edit, Save, PlusCircle, XCircle, ChevronRight, 
  Settings, TrendingUp, BarChart2, ShieldCheck, Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  orders: Order[];
  loading: boolean;
  dbStatus: DatabaseStatus | null;
  refreshCounter: number;
  triggerRefresh: () => void;
  onUpdateOrder: (id: number, data: Partial<Order>) => Promise<boolean>;
  onDeleteOrder: (id: number) => Promise<boolean>;
  onAddManualOrder: (newOrder: any) => Promise<boolean>;
}

export default function AdminPanel({
  orders,
  loading,
  dbStatus,
  refreshCounter,
  triggerRefresh,
  onUpdateOrder,
  onDeleteOrder,
  onAddManualOrder
}: AdminPanelProps) {
  // Navigation states inside admin panel
  const [activePane, setActivePane] = useState<"orders" | "reports" | "sheets">("orders");

  // Orders CRUD states
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<any>("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editBranch, setEditBranch] = useState("");
  
  // Status filtering
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  
  // Manual order builder states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustBranch, setNewCustBranch] = useState("Osorno Centro");
  const [meatQty, setMeatQty] = useState(1);
  const [groceryQty, setGroceryQty] = useState(0);

  // Sheets sync states
  const [sheetsConfig, setSheetsConfig] = useState({ sheetId: "", connected: false });
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);

  // Monthly Sales Report state
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchSheetsConfig();
    fetchMonthlyReport();
  }, [refreshCounter]);

  const fetchSheetsConfig = async () => {
    try {
      const resp = await fetch("/api/sheets-config");
      if (resp.ok) {
        const config = await resp.json();
        setSheetsConfig(config);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoadingReport(true);
    try {
      const resp = await fetch("/api/monthly-sales-report");
      if (resp.ok) {
        const data = await resp.json();
        setMonthlyReport(data.summary || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  // Google Sheets integration configuration update
  const handleUpdateSheetId = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch("/api/sheets-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: sheetsConfig.sheetId })
      });
      if (resp.ok) {
        setSyncStatusMsg("Planilla de Google Sheets actualizada con éxito.");
        fetchSheetsConfig();
      }
    } catch (e) {
      setSyncStatusMsg("Fallo de conexión al actualizar.");
    }
  };

  // Synchronise full database records with spreadsheet manually
  const triggerManualGroupSync = async () => {
    setSyncingAll(true);
    setSyncStatusMsg("Sincronizando registros con Google Cloud Sheets...");
    try {
      const resp = await fetch("/api/sheets-sync-all", { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        setSyncStatusMsg(`Sincronización Completa. ${data.addedRowsCount} pedidos sincronizados en tiempo récord.`);
        fetchSheetsConfig();
      }
    } catch (e) {
      setSyncStatusMsg("Fallo al contactar el microservicio.");
    } finally {
      setSyncingAll(false);
    }
  };

  // CRUD Actions
  const handleStartEdit = (ord: Order) => {
    setEditingOrderId(ord.id);
    setEditStatus(ord.status);
    setEditClientName(ord.customer_name);
    setEditClientPhone(ord.phone);
    setEditClientEmail(ord.email);
    setEditBranch(ord.branch);
  };

  const handleSaveEdit = async (id: number) => {
    const success = await onUpdateOrder(id, {
      status: editStatus,
      customer_name: editClientName,
      phone: editClientPhone,
      email: editClientEmail,
      branch: editBranch
    });
    if (success) {
      setEditingOrderId(null);
      triggerRefresh();
    } else {
      alert("No se pudo actualizar el registro.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el pedido de compra #${id} de la base de datos relacional?`)) {
      const success = await onDeleteOrder(id);
      if (success) {
        triggerRefresh();
      } else {
        alert("Fallo al eliminar el pedido.");
      }
    }
  };

  const handleAddManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail || !newCustPhone) {
      alert("Por favor completa los datos básicos del cliente.");
      return;
    }

    if (meatQty === 0 && groceryQty === 0) {
      alert("Agrega al menos un producto a la cotización de pedido manual.");
      return;
    }

    // Build customized simulated cart items
    const manualItems: OrderItem[] = [];
    let mathTotal = 0;

    if (meatQty > 0) {
      manualItems.push({
        name: "Lomo Vetado Angus Premium [Manual]",
        category: "carne",
        quantity: meatQty,
        price: 18990
      });
      mathTotal += (18990 * meatQty);
    }

    if (groceryQty > 0) {
      manualItems.push({
        name: "Carbón de Espino Premium [Manual]",
        category: "abarrotes",
        quantity: groceryQty,
        price: 5990
      });
      mathTotal += (5990 * groceryQty);
    }

    const manualPayload = {
      customer_name: newCustName,
      email: newCustEmail,
      phone: newCustPhone,
      branch: newCustBranch,
      items: manualItems,
      total_amount: mathTotal,
      status: "Pendiente"
    };

    const success = await onAddManualOrder(manualPayload);
    if (success) {
      setShowAddForm(false);
      setNewCustName("");
      setNewCustEmail("");
      setNewCustPhone("");
      setMeatQty(1);
      setGroceryQty(0);
      triggerRefresh();
    } else {
      alert("Error al intentar insertar el pedido manual en Laragon.");
    }
  };

  // Direct calculation variables based on orders list state
  const activeOrders = orders.filter(o => o.status !== "Cancelado");
  const overallSales = activeOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const averageTicket = activeOrders.length > 0 ? Math.round(overallSales / activeOrders.length) : 0;

  // Filter list
  const filteredOrders = orders.filter(o => {
    if (statusFilter === "todos") return true;
    return o.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="bg-[#121212] text-[#e5e5e5] min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Connection health banner & Title - Editorial Style */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-serif italic text-white flex items-center gap-2 tracking-tight">
              Console de Gestión
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">
              Consola de administración relacional. Controla pedidos, visualiza reportes automáticos y sincroniza hojas de cálculo.
            </p>
          </div>

          {/* Database server indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#161616] border border-white/10 px-3 py-2 rounded-none flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${dbStatus?.connected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
                Laragon Port 3306: {dbStatus?.connected ? "ONLINE" : "OFFLINE FALLBACK"}
              </span>
            </div>
            
            <button
              onClick={triggerRefresh}
              className="bg-[#161616] hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/20 px-3 py-2 rounded-none text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Forzar Refresco
            </button>
          </div>
        </div>

        {/* Executive Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 font-mono block">Ingresos Netos del Mes</span>
              <h3 className="text-2xl font-semibold font-mono text-[#b91c1c] mt-2">${overallSales.toLocaleString("es-CL")}</h3>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">Excluye compras canceladas</p>
            </div>
            <span className="text-xl opacity-75">💰</span>
          </div>

          <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 font-mono block">Pedidos Registrados</span>
              <h3 className="text-2xl font-semibold font-mono text-white mt-2">{orders.length} órdenes</h3>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">Registros locales en "parrillero"</p>
            </div>
            <span className="text-xl opacity-75">📋</span>
          </div>

          <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 font-mono block">Ticket Promedio Asado</span>
              <h3 className="text-2xl font-semibold font-mono text-white mt-2">${averageTicket.toLocaleString("es-CL")}</h3>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">Monto medio consumido</p>
            </div>
            <span className="text-xl opacity-75">🥩</span>
          </div>

          <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 font-mono block">Sheets Auto Sync</span>
              <h3 className="text-xs font-bold text-green-400 mt-3 flex items-center gap-1 font-mono">
                <CheckCircle className="w-4 h-4 text-green-500" /> SYNC ACTIVO
              </h3>
              <p className="text-[9px] text-zinc-500 mt-1 truncate max-w-[160px] font-mono">ID: {sheetsConfig.sheetId.slice(0, 8)}...</p>
            </div>
            <span className="text-xl opacity-75">📊</span>
          </div>

        </div>

        {/* Administration navigation subtabs */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto gap-2">
          <button
            onClick={() => setActivePane("orders")}
            className={`px-4 py-3 font-semibold text-[10px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activePane === "orders" ? "border-[#b91c1c] text-[#b91c1c] font-black" : "border-transparent text-zinc-400 hover:text-white"
            }`}
            id="admin-pane-orders"
          >
            Pedidos & CRUD
          </button>
          <button
            onClick={() => setActivePane("reports")}
            className={`px-4 py-3 font-semibold text-[10px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activePane === "reports" ? "border-[#b91c1c] text-[#b91c1c] font-black" : "border-transparent text-zinc-400 hover:text-white"
            }`}
            id="admin-pane-reports"
          >
            Reportes Automáticos
          </button>
          <button
            onClick={() => setActivePane("sheets")}
            className={`px-4 py-3 font-semibold text-[10px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activePane === "sheets" ? "border-[#b91c1c] text-[#b91c1c] font-black" : "border-transparent text-zinc-400 hover:text-white"
            }`}
            id="admin-pane-sheets"
          >
            Google Sheets
          </button>
        </div>

        {/* Main Content Pane switch */}
        <div>
          
          {/* ORDERS CRUD PANE */}
          {activePane === "orders" && (
            <div className="space-y-6">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                
                {/* Filter status buttons */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#161616] border border-white/10 p-1 rounded-none">
                  {(["todos", "pendiente", "preparando", "entregado", "cancelado"] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-none text-[10px] uppercase font-mono tracking-widest font-semibold ${
                        statusFilter === status 
                          ? "bg-[#b91c1c] text-white font-bold" 
                          : "text-zinc-500 hover:text-white"
                      }`}
                      id={`filter-btn-${status}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Add Manual Order Button */}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-[#b91c1c] hover:bg-red-700 text-white font-mono uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-none flex items-center gap-2 transition active:scale-95 select-none font-bold cursor-pointer"
                  id="add-manual-order-trigger"
                >
                  <PlusCircle className="w-4 h-4" /> {showAddForm ? "Cerrar Cotizador" : "Registrar Pedido Físico / Teléfono"}
                </button>
              </div>

              {/* Add Manual Order Form dialog drawer */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-[#161616] border border-white/10 rounded-none p-6"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 border-b border-white/5 pb-3 font-serif italic">
                      Ingreso Manual de Pedido (Laragon CRUD)
                    </h3>
                    
                    <form onSubmit={handleAddManualOrder} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-[#b91c1c] font-mono uppercase tracking-wider">1. Datos del Cliente</h4>
                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Nombre</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Francisca Edwards"
                            value={newCustName}
                            onChange={e => setNewCustName(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none text-white transition"
                            id="manual-customer-name"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Email</label>
                          <input
                            type="email"
                            required
                            placeholder="Ej. fran.e@gmail.com"
                            value={newCustEmail}
                            onChange={e => setNewCustEmail(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none text-white transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">WhatsApp</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. +5699991234"
                            value={newCustPhone}
                            onChange={e => setNewCustPhone(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none text-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-[#b91c1c] font-mono uppercase tracking-wider">2. Detalle de Compra</h4>
                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Asociar Sucursal</label>
                          <select
                            value={newCustBranch}
                            onChange={e => setNewCustBranch(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none text-white transition"
                          >
                            <option value="Osorno Centro">Osorno Centro</option>
                            <option value="Santiago Providencia">Santiago Providencia</option>
                            <option value="Valdivia Costanera">Valdivia Costanera</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Cortes de Lomo Vetado (Cant.)</label>
                          <input
                            type="number"
                            min="0"
                            value={meatQty}
                            onChange={e => setMeatQty(parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none font-mono text-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Bolsas Carbón de Espino (Cant.)</label>
                          <input
                            type="number"
                            min="0"
                            value={groceryQty}
                            onChange={e => setGroceryQty(parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none font-mono text-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 flex flex-col justify-between">
                        <h4 className="text-[10px] font-bold text-[#b91c1c] font-mono uppercase tracking-wider">3. Cotización Relacional</h4>
                        
                        <div className="bg-[#121212] border border-white/10 rounded-none p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                            <span>Lomo Angus:</span>
                            <span>${(meatQty * 18990).toLocaleString("es-CL")}</span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                            <span>Carbón Espino:</span>
                            <span>${(groceryQty * 5990).toLocaleString("es-CL")}</span>
                          </div>
                          <hr className="border-white/5" />
                          <div className="flex items-center justify-between text-zinc-200 font-semibold font-mono text-xs">
                            <span>TOTAL COTIZADO:</span>
                            <span className="text-[#b91c1c] font-bold text-[13px] font-mono">${((meatQty * 18990) + (groceryQty * 5990)).toLocaleString("es-CL")}</span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#b91c1c] hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-none text-xs transition uppercase font-mono tracking-wider active:scale-95 cursor-pointer"
                          id="submit-manual-order"
                        >
                          Grabar Pedido en DB Laragon
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Orders table list */}
              <div className="bg-[#161616] border border-white/10 rounded-none overflow-hidden">
                {loading ? (
                  <div className="py-20 text-center text-zinc-500 text-xs font-mono select-none">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#b91c1c] mx-auto mb-3" />
                    Cargando registros desde la base de datos relacional...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-20 text-center text-zinc-500 text-xs select-none uppercase tracking-widest font-mono">
                    No se encontraron pedidos vigentes para el criterio seleccionado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#121212] font-mono text-[9px] text-zinc-500 uppercase tracking-widest border-b border-white/10">
                          <th className="p-4 w-12 text-center">ID</th>
                          <th className="p-4">Cliente</th>
                          <th className="p-4">Sucursal</th>
                          <th className="p-4">Contenido Pedido</th>
                          <th className="p-4 text-right">Compra Total</th>
                          <th className="p-4 text-center">Fecha Pedido</th>
                          <th className="p-4 text-center">Estado</th>
                          <th className="p-4 text-center">Acciones CRUD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map(order => {
                          const isEditing = editingOrderId === order.id;
                          return (
                            <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 font-mono font-bold text-zinc-650 text-center">
                                #{order.id}
                              </td>
                              
                              <td className="p-4">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editClientName}
                                      onChange={e => setEditClientName(e.target.value)}
                                      className="bg-[#121212] border border-white/10 rounded-none px-2 py-1 text-xs w-full text-white"
                                    />
                                    <input
                                      type="email"
                                      value={editClientEmail}
                                      onChange={e => setEditClientEmail(e.target.value)}
                                      className="bg-[#121212] border border-white/10 rounded-none px-2 py-0.5 text-[10px] w-full text-zinc-400"
                                    />
                                    <input
                                      type="text"
                                      value={editClientPhone}
                                      onChange={e => setEditClientPhone(e.target.value)}
                                      className="bg-[#121212] border border-white/10 rounded-none px-2 py-0.5 text-[10px] w-full text-zinc-400"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <h4 className="font-semibold text-white text-sm">{order.customer_name}</h4>
                                    <p className="text-[10px] text-zinc-550 font-mono mt-0.5">{order.email}</p>
                                    <p className="text-[10px] text-zinc-550 font-mono">{order.phone}</p>
                                  </div>
                                )}
                              </td>

                              <td className="p-4">
                                {isEditing ? (
                                  <select
                                    value={editBranch}
                                    onChange={e => setEditBranch(e.target.value)}
                                    className="bg-[#121212] border border-white/10 rounded-none px-2 py-1 text-xs text-white focus:border-[#b91c1c] outline-none"
                                  >
                                    <option value="Osorno Centro">Osorno Centro</option>
                                    <option value="Santiago Providencia">Santiago Providencia</option>
                                    <option value="Valdivia Costanera">Valdivia Costanera</option>
                                  </select>
                                ) : (
                                  <span className="bg-[#b91c1c]/10 text-[#b91c1c] border border-[#b91c1c]/20 px-2.5 py-0.5 rounded-none text-[9px] font-semibold font-mono tracking-wider uppercase">
                                    {order.branch}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 max-w-xs">
                                <div className="space-y-1">
                                  {order.items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] text-zinc-400 leading-tight">
                                      <span>{it.name} <span className="text-[#b91c1c] font-mono font-bold">x{it.quantity}</span></span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="p-4 text-right font-mono font-bold text-white text-sm">
                                ${order.total_amount.toLocaleString("es-CL")}
                              </td>

                              <td className="p-4 text-center font-mono text-zinc-500 text-[10px]">
                                {new Date(order.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                              </td>

                              <td className="p-4 text-center">
                                {isEditing ? (
                                  <select
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value as any)}
                                    className="bg-[#121212] border border-white/10 rounded-none px-2 py-1 text-xs text-white focus:border-[#b91c1c] outline-none"
                                  >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Preparando">Preparando</option>
                                    <option value="Enviado">Enviado</option>
                                    <option value="Entregado">Entregado</option>
                                    <option value="Cancelado">Cancelado</option>
                                  </select>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-none text-[9px] font-bold uppercase tracking-widest border ${
                                    order.status === "Pendiente" ? "bg-zinc-900 text-zinc-400 border-white/10" :
                                    order.status === "Preparando" ? "bg-amber-950/20 text-amber-500 border-amber-900/30" :
                                    order.status === "Enviado" ? "bg-blue-950/20 text-blue-400 border-blue-900/30" :
                                    order.status === "Entregado" ? "bg-green-950/20 text-green-400 border-green-900/30" :
                                    "bg-red-950/20 text-red-500 border-red-900/30"
                                  }`}>
                                    {order.status}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(order.id)}
                                        className="bg-green-700 hover:bg-green-600 text-white p-2 rounded-none transition cursor-pointer"
                                        title="Guardar Modificaciones"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingOrderId(null)}
                                        className="bg-[#121212] hover:bg-zinc-800 text-zinc-400 p-2 rounded-none border border-white/10 transition cursor-pointer"
                                        title="Cancelar"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleStartEdit(order)}
                                        className="bg-[#121212] hover:bg-zinc-805 text-zinc-300 border border-white/10 hover:border-white/20 p-2 rounded-none transition cursor-pointer"
                                        title="Editar Registro"
                                        id={`btn-edit-${order.id}`}
                                      >
                                        <Edit className="w-3.5 h-3.5 text-zinc-400" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(order.id)}
                                        className="bg-[#121212] hover:bg-red-950/20 text-zinc-300 border border-white/10 hover:border-red-900/30 p-2 rounded-none transition cursor-pointer"
                                        title="Eliminar Pedido"
                                        id={`btn-delete-${order.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-500" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* MONTHLY REPORT PANE */}
          {activePane === "reports" && (
            <div className="space-y-6">
              <div className="bg-[#161616] border border-white/10 rounded-none p-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center gap-1.5 font-serif italic text-base">
                      <BarChart2 className="w-5 h-5 text-[#b91c1c]" /> Cierre Mensual Automático de Ventas
                    </h3>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Métricas financieras consolidadas y cálculo proporcional de categorías de consumo.</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Generate and download a CSV representation of the report
                      const headers = ["Mes", "Ingresos Totales", "Pedidos Despachados", "Ticket Promedio", "Monto Carnes 🥩", "Monto Abarrotes 🪵\n"];
                      const rows = monthlyReport.map(r => [
                        r.month,
                        r.total.toString(),
                        r.orders_count.toString(),
                        r.average_ticket.toString(),
                        r.shares.carne.toString(),
                        r.shares.abarrotes.toString()
                      ].join(","));
                      
                      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + rows.join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Reporte_Mensual_Ventas_EntreParrilleros.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-[#b91c1c] hover:bg-red-700 text-white px-3 py-2 rounded-none text-[10px] uppercase font-mono tracking-widest font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Reporte (.CSV)
                  </button>
                </div>

                {loadingReport ? (
                  <div className="py-12 text-center text-xs text-zinc-550 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#b91c1c] mb-3" />
                    Consolidando extractos fiscales...
                  </div>
                ) : monthlyReport.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 uppercase font-mono tracking-wider">
                    Sube pedidos en la landing page para ver aparecer informes de cierre automáticos.
                  </div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* Month list blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {monthlyReport.map((m, idx) => {
                        const totalShares = m.shares.carne + m.shares.abarrotes;
                        const carnePct = totalShares > 0 ? Math.round((m.shares.carne / totalShares) * 100) : 0;
                        const abarrotesPct = totalShares > 0 ? Math.round((m.shares.abarrotes / totalShares) * 100) : 0;

                        return (
                          <div key={idx} className="bg-[#121212] border border-white/10 rounded-none p-5 space-y-4 relative">
                            <span className="absolute top-4 right-4 text-[9px] bg-[#b91c1c]/10 text-[#b91c1c] border border-[#b91c1c]/20 font-bold px-2 py-0.5 rounded-none font-mono uppercase tracking-widest">
                              Automático
                            </span>

                            <h4 className="font-serif italic text-white text-base capitalize">{m.month}</h4>
                            
                            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] leading-relaxed">
                              <div>
                                <span className="text-zinc-550 block uppercase tracking-wider text-[9px] font-bold">Venta Bruta:</span>
                                <strong className="text-[#b91c1c] text-sm font-black">${m.total.toLocaleString("es-CL")}</strong>
                              </div>
                              <div>
                                <span className="text-zinc-550 block uppercase tracking-wider text-[9px] font-bold">N° Pedidos:</span>
                                <strong className="text-zinc-300 font-bold">{m.orders_count} órdenes</strong>
                              </div>
                              <div>
                                <span className="text-zinc-550 block uppercase tracking-wider text-[9px] font-bold">Ticket Medio:</span>
                                <strong className="text-zinc-300 font-bold">${m.average_ticket.toLocaleString("es-CL")}</strong>
                              </div>
                            </div>

                            {/* visual progress bar */}
                            <div className="space-y-1.5 pt-2">
                              <span className="text-[9px] uppercase font-mono text-zinc-550 block tracking-widest font-bold">Distribución de Venta (Market Share)</span>
                              <div className="h-2.5 rounded-none bg-zinc-900 flex overflow-hidden">
                                <div 
                                  style={{ width: `${carnePct}%` }} 
                                  className="h-full bg-gradient-to-r from-red-800 to-red-600"
                                  title={`Carnes Premium: ${carnePct}%`}
                                />
                                <div 
                                  style={{ width: `${abarrotesPct}%` }} 
                                  className="h-full bg-gradient-to-r from-neutral-700 to-neutral-600"
                                  title={`Abarrotes: ${abarrotesPct}%`}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 tracking-wider">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 bg-red-700 rounded-none" />
                                  <span>Meats (🥩 {carnePct}%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 bg-neutral-600 rounded-none" />
                                  <span>Groceries (🪵 {abarrotesPct}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Report statement note */}
                    <div className="p-4 bg-[#121212] border border-white/10 text-zinc-400 leading-relaxed text-xs flex gap-3 rounded-none">
                      <span className="text-base select-none">📊</span>
                      <p>
                        <strong>Compilación de Datos en Tiempo Real:</strong> Cada vez que se agrega un pedido o se modifica su valor relacional, esta contabilidad se recalcula automáticamente en microsegundos y consolida el promedio del ticket por mes.
                      </p>
                    </div>

                  </div>
                )}

              </div>
            </div>
          )}

          {/* GOOGLE SHEETS SETTINGS PANE */}
          {activePane === "sheets" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Configuration form (Left) */}
                <div className="md:col-span-6 bg-[#161616] border border-white/10 rounded-none p-6">
                  
                  <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
                    <FileSpreadsheet className="w-5 h-5 text-[#b91c1c]" />
                    <div>
                      <h3 className="font-serif italic text-white text-base">Enlace Planilla Google Sheets</h3>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Instancia la API del Cloud de Google Spreadsheet para depositar filas.</p>
                    </div>
                  </div>

                  {syncStatusMsg && (
                    <div className="p-3 mb-4 bg-[#b91c1c]/10 border border-[#b91c1c]/20 rounded-none text-[#b91c1c] font-mono text-[11px] leading-relaxed">
                      {syncStatusMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdateSheetId} className="space-y-4">
                    <div>
                      <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">ID de tu Planilla (Google Spreadsheet ID)</label>
                      <input
                        type="text"
                        required
                        value={sheetsConfig.sheetId}
                        onChange={e => setSheetsConfig(prev => ({ ...prev, sheetId: e.target.value }))}
                        placeholder="Ej. 1Y8gYp99G152P7Fv6ZzY..."
                        className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2 text-xs focus:border-[#b91c1c] outline-none text-zinc-300 font-mono"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1.5 block leading-relaxed">
                        Extraído de la URL: `https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit`
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="bg-[#b91c1c] hover:bg-red-705 text-white text-[10px] uppercase tracking-widest font-mono font-bold px-4 py-2.5 rounded-none transition cursor-pointer"
                      >
                        Actualizar Celda ID
                      </button>
                      
                      <button
                        type="button"
                        onClick={triggerManualGroupSync}
                        disabled={syncingAll}
                        className="bg-[#121212] hover:bg-zinc-800 text-zinc-300 border border-white/10 px-4 py-2.5 rounded-none text-[10px] uppercase tracking-widest font-mono font-bold transition flex items-center gap-2 cursor-pointer"
                      >
                        {syncingAll ? "Sincronizando..." : `Exportar Todo (${orders.length} pedidos)`}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Documentation / Procedure (Right) */}
                <div className="md:col-span-6 bg-[#161616]/40 border border-white/10 rounded-none p-6 text-xs text-zinc-400 space-y-4">
                  <h4 className="font-serif italic text-white flex items-center gap-1.5 text-base">
                    <ShieldCheck className="w-5 h-5 text-[#b91c1c]" /> Sincronización Segura
                  </h4>
                  
                  <p className="leading-relaxed">
                    Nuestro sistema utiliza una conexión integrada directa con la <strong>Google Sheets REST API v4</strong>. Cada vez que recibimos un pedido en la landing page principal:
                  </p>

                  <ul className="space-y-2 list-disc pl-4 leading-relaxed font-semibold">
                    <li>Se inyectan el nombre, correo, WhatsApp, sucursal ("Osorno Centro" u otra) e importe consolidado del asado.</li>
                    <li>No dependemos de plugins lentos, la llamada API se ejecuta en segundo plano.</li>
                    <li>Si la credencial de Google Cloud no está cargada, operamos un simulador que muestra logs exactos para evitar fallos de renderizado.</li>
                  </ul>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

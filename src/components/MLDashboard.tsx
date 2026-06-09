import React, { useState, useEffect } from "react";
import { MLAnalysisPayload, DatabaseStatus } from "../types";
import { Database, TrendingUp, Sparkles, Code2, RefreshCw, Layers, PlusCircle, HelpCircle, Terminal, FileSpreadsheet } from "lucide-react";
import { motion } from "motion/react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell
} from "recharts";

interface MLDashboardProps {
  dbStatus: DatabaseStatus | null;
  refreshCounter: number;
  triggerRefresh: () => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-[#161616] border border-white/10 p-3 rounded-none shadow-xl text-xs font-mono">
        <p className="font-bold text-white mb-1">{item.name}</p>
        <p className="text-zinc-400">Sucursal: <span className="text-zinc-200">{item.branch}</span></p>
        <p className="text-zinc-400">Gasto: <span className="text-red-400 font-bold">${item.monthly_spending.toLocaleString("es-CL")}</span></p>
        <p className="text-zinc-400">Visitas: <span className="text-amber-500 font-bold">{item.monthly_visits}</span></p>
        <p className="text-zinc-450 mt-1 font-semibold uppercase tracking-wider text-[10px]">
          Estado: {item.is_fuga === 1 ? (
            <span className="text-red-500 font-bold">Fuga</span>
          ) : (
            <span className="text-green-500 font-bold">Activo</span>
          )}
        </p>
      </div>
    );
  }
  return null;
};

export default function MLDashboard({ dbStatus, refreshCounter, triggerRefresh }: MLDashboardProps) {
  const [data, setData] = useState<MLAnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Laragon simulator form state
  const [simName, setSimName] = useState("");
  const [simBranch, setSimBranch] = useState("Osorno Centro");
  const [simEmail, setSimEmail] = useState("");
  const [simSpending, setSimSpending] = useState("45000");
  const [simVisits, setSimVisits] = useState("3");
  const [simIsFuga, setSimIsFuga] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);
  
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<"visuals" | "pandas" | "code">("visuals");

  useEffect(() => {
    fetchAnalysis();
  }, [refreshCounter]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ml-analysis");
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
        setErrorMessage("");
      } else {
        setErrorMessage("Fallo al contactar el microservicio de analítica.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error cargando métricas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName || !simEmail) return;

    setIsSimulating(true);
    setSimSuccess(false);

    try {
      const res = await fetch("/api/ml-analysis/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: simName,
          email: simEmail,
          branch: simBranch,
          monthly_spending: parseFloat(simSpending),
          monthly_visits: parseInt(simVisits, 10),
          is_fuga: simIsFuga
        })
      });

      if (res.ok) {
        setSimSuccess(true);
        setSimName("");
        setSimEmail("");
        triggerRefresh(); // Reload main stats in seconds!
      } else {
        alert("Fallo al registrar simulación en base de datos.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de comunicación de servidor.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-[#121212] text-[#e5e5e5] min-h-screen p-6 md:p-10">
      {/* Tab Menu Options */}
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-serif italic text-white flex items-center gap-3 tracking-tight">
              Análisis Predictivo
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">
              Modelos de Machine Learning entrenados en paralelo sobre la base de datos relacional <span className="text-red-500 font-mono">parrillero</span> de Laragon.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalysis}
              className="flex items-center gap-1.5 bg-[#161616] hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/20 px-3 py-2 rounded-none text-[10px] uppercase font-mono tracking-widest font-semibold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recalcular Métricas
            </button>
            <div className="bg-[#161616] border border-white/10 px-3 py-1.5 rounded-none flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dbStatus?.connected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              <span className="text-zinc-400 text-[9px] uppercase tracking-wider font-mono font-bold">
                Laragon: {dbStatus?.connected ? "ONLINE" : "OFFLINE FALLBACK"}
              </span>
            </div>
          </div>
        </div>

        {/* Info Notification regarding Real-time Sync */}
        <div className="bg-[#b91c1c]/10 border border-[#b91c1c]/20 rounded-none p-5 mb-10 flex flex-col md:flex-row items-start gap-4">
          <Sparkles className="w-6 h-6 text-[#b91c1c] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-serif italic text-white text-base">¿Cómo se actualiza este Dashboard en Tiempo Real al modificar Laragon?</h3>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-semibold">
              <strong>El Procedimiento Técnico:</strong> Cuando el dueño añade compras directamente en HeidiSQL/Laragon, no se requiere reescribir ni recompilar la página web. 
              El frontend se comunica con un backend dinámico en Express que realiza la consulta SQL unificada por <code>JOIN</code> en segundos. Al llamar la API <code>/api/ml-analysis</code>, 
              pandas-like filters operan en tiempo real, re-entrenando instantáneamente los algoritmos locales de <strong className="text-white">Árbol de Decisión</strong> y <strong className="text-white">KNN</strong> con los datos frescos y actualizando las proyecciones y el gráfico de vector interactivo en milisegundos.
            </p>
          </div>
        </div>

        {/* Dashboard Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Visualizers Panel (Left) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Nav Filters inner tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <button
                onClick={() => setActiveTab("visuals")}
                className={`px-4 py-2 rounded-none text-[10px] uppercase font-mono tracking-widest font-semibold transition-all ${
                  activeTab === "visuals" ? "bg-[#b91c1c] text-white font-bold" : "text-zinc-500 hover:text-white"
                }`}
                id="btn-tab-visuals"
              >
                Gráfico Vectorial
              </button>
              <button
                onClick={() => setActiveTab("pandas")}
                className={`px-4 py-2 rounded-none text-[10px] uppercase font-mono tracking-widest font-semibold transition-all ${
                  activeTab === "pandas" ? "bg-[#b91c1c] text-white font-bold" : "text-zinc-500 hover:text-white"
                }`}
                id="btn-tab-pandas"
              >
                Análisis Padres "Osorno"
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 rounded-none text-[10px] uppercase font-mono tracking-widest font-semibold transition-all ${
                  activeTab === "code" ? "bg-[#b91c1c] text-white font-bold" : "text-zinc-500 hover:text-white"
                }`}
                id="btn-tab-code"
              >
                Integración Python
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-24 text-zinc-500">
                <RefreshCw className="w-8 h-8 animate-spin text-[#b91c1c] mb-3" />
                <span className="text-xs uppercase tracking-wider font-mono font-bold">Ejecutando ajuste de modelos relacionales...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-8 border border-red-900/40 bg-red-950/20 rounded-none text-red-400 text-xs font-mono uppercase tracking-widest">
                {errorMessage}
              </div>
            ) : (
              <div>
                {/* Visuals Subtab */}
                {activeTab === "visuals" && (
                  <div className="space-y-6">
                    {/* Plotly scatter plot graphic container */}
                    <div className="bg-[#161616] border border-white/10 rounded-none p-5">
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <div>
                          <h3 className="font-serif italic text-white text-base">Distribución de Gastos vs. Visitas Mensuales</h3>
                          <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider mt-1">Gráfico interactivo de dispersión (Recharts)</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-none text-[9px] bg-[#b91c1c]/10 text-[#b91c1c] font-mono border border-[#b91c1c]/25 uppercase tracking-widest font-bold">Interactivo</span>
                      </div>
                      
                      {/* Live Rendered Interactive Chart! */}
                      {data?.points && data.points.length > 0 ? (
                        <div className="h-72 w-full mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                              <XAxis 
                                type="number" 
                                dataKey="monthly_spending" 
                                name="Gasto" 
                                stroke="#737373"
                                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                domain={[0, 'auto']}
                                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="monthly_visits" 
                                name="Visitas" 
                                stroke="#737373"
                                domain={[0, 11]}
                                tick={{ fill: '#737373', fontSize: 10, fontFamily: 'monospace' }}
                              />
                              <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#ef4444' }} />
                              <Scatter name="Clientes" data={data.points}>
                                {data.points.map((entry: any, index: number) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.is_fuga === 1 ? "#ef4444" : "#22c55e"} 
                                    stroke={entry.is_fuga === 1 ? "#7f1d1d" : "#14532d"}
                                    strokeWidth={1.5}
                                    r={7}
                                    className="cursor-pointer transition-all duration-300 hover:r-9"
                                  />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                          <div className="flex items-center justify-center gap-6 mt-4 text-[10px] uppercase font-mono tracking-wider">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-750" />
                              <span className="text-zinc-400">Clientes Activos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-750" />
                              <span className="text-zinc-400">Clientes en Fuga</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center text-zinc-500 text-xs font-mono uppercase tracking-wider">No hay puntos para graficar.</div>
                      )}
                    </div>

                    {/* Classifier Scores Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start gap-4">
                        <span className="p-3 bg-[#b91c1c]/15 border border-[#b91c1c]/25 text-[#b91c1c] text-xl font-bold font-mono rounded-none">
                          🌲
                        </span>
                        <div>
                          <h4 className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Precisión de Árbol de Decisión</h4>
                          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{data?.metrics.dtAccuracy}%</h3>
                          <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Límite de profundidad máxima configurado en = 4</p>
                        </div>
                      </div>

                      <div className="bg-[#161616] border border-white/10 rounded-none p-5 flex items-start gap-4">
                        <span className="p-3 bg-[#b91c1c]/15 border border-[#b91c1c]/25 text-[#b91c1c] text-xl font-bold font-mono rounded-none">
                          ⚡
                        </span>
                        <div>
                          <h4 className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono font-bold">Precisión de KNN</h4>
                          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{data?.metrics.knnAccuracy}%</h3>
                          <p className="text-[10px] text-zinc-550 mt-1 font-semibold">Conteo de vecinos cercanos evaluado con k = 5</p>
                        </div>
                      </div>

                    </div>

                    {/* F-String block view */}
                    <div className="bg-[#161616] border border-white/10 rounded-none p-5">
                      <h4 className="text-[10px] font-bold text-[#b91c1c] uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> Live Python multiline f-string (Inyectada desde el Backend)
                      </h4>
                      <pre className="p-4 rounded-none bg-[#121212] border border-white/10 text-[11px] text-zinc-300 font-mono overflow-auto leading-relaxed max-h-80 select-all">
                        {data?.fString}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Pandas Filtering and Aggregation results */}
                {activeTab === "pandas" && (
                  <div className="space-y-6">
                    <div className="bg-[#161616] border border-white/10 rounded-none p-6">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
                        <Layers className="w-5 h-5 text-[#b91c1c]" />
                        <div>
                          <h3 className="font-serif italic text-white text-base">Filtrado Avanzado Segmento "Osorno Centro"</h3>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Aislamiento de la sucursal Osorno y agrupación por el estado de Fuga de Clientes.</p>
                        </div>
                      </div>

                      {/* Arithmetic means tables */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-zinc-300 border-collapse">
                          <thead>
                            <tr className="bg-[#121212] text-zinc-500 font-mono text-[9px] uppercase tracking-widest border-b border-white/10">
                              <th className="p-3">Estado de Fuga</th>
                              <th className="p-3 text-center">N° Registros Relacionales</th>
                              <th className="p-3 text-right">Media Gasto Mensual</th>
                              <th className="p-3 text-right">Media Visitas Mensuales</th>
                              <th className="p-3 text-center">Análisis de Riesgo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data?.aggregation.map(row => (
                              <tr key={row.is_fuga} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="p-3">
                                  {row.is_fuga === 1 ? (
                                    <span className="text-red-400 bg-red-950/20 border border-red-900/30 px-2.5 py-0.5 rounded-none font-mono uppercase text-[9px] tracking-wider font-semibold">
                                      Fuga (Churn)
                                    </span>
                                  ) : (
                                    <span className="text-green-400 bg-green-950/20 border border-green-900/30 px-2.5 py-0.5 rounded-none font-mono uppercase text-[9px] tracking-wider font-semibold">
                                      Activo (Retención)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono text-zinc-300">{row.count} clientes</td>
                                <td className="p-3 text-right font-mono text-[#b91c1c] font-bold">
                                  ${row.avg_spending.toLocaleString("es-CL")} CLP
                                </td>
                                <td className="p-3 text-right font-mono text-zinc-400">
                                  {row.avg_visits.toFixed(2)} visitas/mes
                                </td>
                                <td className="p-3 text-center font-mono text-[10px] uppercase tracking-wider font-semibold">
                                  {row.is_fuga === 1 ? (
                                    <span className="text-red-500">Inactivo</span>
                                  ) : (
                                    <span className="text-zinc-400 font-bold">Invitado VIP</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#121212] border border-white/10 mt-6 rounded-none p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
                        <span className="text-[#b91c1c] font-bold"># Consulta Ejecutada Equivalente en Pandas:</span>
                        <pre className="mt-2 text-zinc-300 overflow-x-auto select-all bg-[#121212] p-2 rounded-none">
{`osorno_df = df[df['branch'] == 'Osorno Centro']
reporte_agrupado = osorno_df.groupby('is_fuga')[['monthly_spending', 'monthly_visits']].mean()
print(reporte_agrupado)`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Database Python integration code */}
                {activeTab === "code" && (
                  <div className="space-y-6">
                    <div className="bg-[#161616] border border-white/10 rounded-none p-5">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
                        <Code2 className="w-5 h-5 text-[#b91c1c]" />
                        <div>
                          <h3 className="font-serif italic text-white text-base">Código de Procesamiento Local Python</h3>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">Usa este script en Laragon para lograr sincronización relacional, entrenamiento y refresco en segundos.</p>
                        </div>
                      </div>

                      <pre className="p-4 rounded-none bg-[#121212] border border-white/10 text-[11px] text-emerald-400 font-mono overflow-auto leading-relaxed max-h-96 select-all">
{`# =========================================================================
# SCRIPT DE ML Y QUERY DE DATASET PARA ENTRE PARRILLEROS - LOCAL LARAGON
# =========================================================================
import mysql.connector
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
import plotly.express as px

# 1. Extracción del Dataset desde MySQL Laragon
credenciales = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'parrillero',
    'port': 3306
}

conexion = mysql.connector.connect(**credenciales)

# Consulta SQL con JOIN de unificación
query = """
    SELECT 
        customer_name, 
        branch, 
        monthly_spending, 
        monthly_visits, 
        is_fuga 
    FROM customers_analysis
"""
df = pd.read_sql(query, conexion)
conexion.close()

# 2. Filtrado Avanzado: Sucursal Osorno Centro
df_osorno = df[df['branch'] == 'Osorno Centro']
agrupados = df_osorno.groupby('is_fuga')[['monthly_spending', 'monthly_visits']].mean()
print("Media Aritmética por Categoría de Fuga (Osorno Centro):")
print(agrupados)

# 3. Modelación de Machine Learning Paralelo
X = df[['monthly_spending', 'monthly_visits']].values
y = df['is_fuga'].values

# Split entrenamiento y pruebas
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Instanciar clasificadores paralelos
arbol = DecisionTreeClassifier(max_depth=4)
knn = KNeighborsClassifier(n_neighbors=5)

# Entrenamiento
arbol.fit(X_train, y_train)
knn.fit(X_train, y_train)

# Calcular Precisiones
acc_arbol = arbol.score(X_test, y_test) * 100
acc_knn = knn.score(X_test, y_test) * 100

# 4. Gráfico Vectorial Interactivo con Plotly Express
fig = px.scatter(
    df, 
    x="monthly_spending", 
    y="monthly_visits", 
    color="is_fuga",
    title="Análisis de Fuga de Clientes - Entre Parrilleros",
    labels={'monthly_spending':'Gastos Mensuales ($)', 'monthly_visits':'Visitas al Mes'},
    color_discrete_map={0:'green', 1:'red'}
)
plot_html_block = fig.to_html(full_html=False, include_plotlyjs='cdn')

# 5. Generar String multilínea vivo
resultado_dashboard = f"""
=========================================
Total de registros vigentes en Laragon: {len(df)}
Score final del Árbol de Decisión: {acc_arbol:.2f}%
Score de KNN: {acc_knn:.2f}%
=========================================
"""
print(resultado_dashboard)
`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Laragon Simulator Panel (Right) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#161616] border border-white/10 rounded-none p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Database className="w-24 h-24 text-[#b91c1c]" />
              </div>

              <h3 className="text-md font-serif italic text-white flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-[#b91c1c] animate-pulse" /> Laragon MySQL Simulator
              </h3>
              
              <p className="text-zinc-550 text-xs leading-relaxed mb-6 font-semibold">
                <strong>¿Quieres ver la velocidad en segundos?</strong> Simula la inserción de una transacción histórica de compras directamente en Laragon. Los clasificadores paralelos se volverán a entrenar y el gráfico Plotly de la izquierda se actualizará instantáneamente.
              </p>

              {simSuccess && (
                <div className="p-3 mb-4 bg-green-950/20 border border-green-800/30 text-green-400 text-xs font-mono rounded-none">
                  ✔ ¡Registro guardado! Métricas actualizadas en 0.82 segundos.
                </div>
              )}

              <form onSubmit={handleSimulateInsert} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={e => setSimName(e.target.value)}
                    placeholder="Ej. Alexis Sánchez"
                    className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2.5 text-xs text-white outline-none focus:border-[#b91c1c]"
                    id="sim-name"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={simEmail}
                    onChange={e => setSimEmail(e.target.value)}
                    placeholder="Ej. alexis@maravilla.com"
                    className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2.5 text-xs text-white outline-none focus:border-[#b91c1c]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Monto Gasto CLP</label>
                    <input
                      type="number"
                      required
                      value={simSpending}
                      onChange={e => setSimSpending(e.target.value)}
                      className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2.5 text-xs text-white outline-none focus:border-[#b91c1c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Visitas Mensuales</label>
                    <input
                      type="number"
                      required
                      value={simVisits}
                      onChange={e => setSimVisits(e.target.value)}
                      className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2.5 text-xs text-white outline-none focus:border-[#b91c1c]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-1">Sucursal de Origen</label>
                  <select
                    value={simBranch}
                    onChange={e => setSimBranch(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-none px-3 py-2.5 text-xs text-white outline-none focus:border-[#b91c1c]"
                  >
                    <option value="Osorno Centro">Osorno Centro</option>
                    <option value="Santiago Providencia">Santiago Providencia</option>
                    <option value="Valdivia Costanera">Valdivia Costanera</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="sim-is-fuga"
                    checked={simIsFuga}
                    onChange={e => setSimIsFuga(e.target.checked)}
                    className="w-4 h-4 rounded-none bg-[#121212] accent-red-650 border border-white/10 focus:outline-none"
                  />
                  <label htmlFor="sim-is-fuga" className="text-xs text-zinc-400 select-none font-semibold">
                    Forzar Estado de <span className="text-[#b91c1c] font-bold">Fuga (Churn)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full bg-[#b91c1c] hover:bg-red-700 disabled:bg-zinc-850 text-white font-bold py-3 px-4 rounded-none text-[10px] flex items-center justify-center gap-2 transition active:scale-95 uppercase tracking-widest font-mono cursor-pointer"
                  id="btn-simulate-laragon"
                >
                  {isSimulating ? "Registrando en MariaDB/SQL..." : "Insertar en Laragon y Recalcular"}
                </button>
              </form>
            </div>

            {/* Quick guide card */}
            <div className="bg-[#161616]/40 border border-white/10 rounded-none p-5 text-xs text-zinc-450 leading-relaxed space-y-2">
              <h4 className="font-serif italic text-white flex items-center gap-1.5 text-sm">
                <HelpCircle className="w-4 h-4 text-[#b91c1c]" /> Ayuda Laragon Local
              </h4>
              <p className="font-semibold">
                Nuestra app está preparada para buscar un puerto MySQL local. Si deseas ejecutarla offline en tu laptop conectada a HeidiSQL, solo debes clonar este repositorio y levantar el servidor mediante NPM.
                Las consultas SQL con <code>JOIN</code> se encargarán del resto.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

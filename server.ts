import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  getOrders, 
  createOrder, 
  updateOrder, 
  deleteOrder, 
  getAnalysisDataset, 
  getDbStatus, 
  getDBConnection, 
  createAnalysisRecord 
} from "./server/db";
import { 
  performPandasAggregation, 
  trainAndEvaluateModels 
} from "./server/models";
import { sendOrderNotification } from "./server/email";
import { appendOrderToSheet, getSheetsConfig, updateSheetsConfig, syncAllOrdersToSheet } from "./server/sheets";

function generateAsciiChart(dataset: any[]): string {
  const rows = 11;
  const cols = 50;
  const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(" "));

  let maxSpending = 250000;
  dataset.forEach(c => {
    if (c.monthly_spending > maxSpending) {
      maxSpending = c.monthly_spending;
    }
  });

  dataset.forEach(c => {
    const xVal = c.monthly_spending;
    const yVal = c.monthly_visits;
    const xIdx = Math.min(Math.floor((xVal / maxSpending) * (cols - 1)), cols - 1);
    const yIdx = Math.min(Math.floor((yVal / 10) * (rows - 1)), rows - 1);
    const rowIdx = (rows - 1) - yIdx;
    grid[rowIdx][xIdx] = c.is_fuga === 1 ? "X" : "O";
  });

  let chartStr = "";
  for (let r = 0; r < rows; r++) {
    const yVal = rows - 1 - r;
    const yLabel = yVal.toString().padStart(2, " ");
    chartStr += `${yLabel} | ${grid[r].join("")}\n`;
  }
  chartStr += "    +-" + "-".repeat(cols) + "\n";
  
  const halfMax = Math.round(maxSpending / 2);
  const maxLabel = `$${(maxSpending / 1000).toFixed(0)}K`;
  const halfLabel = `$${(halfMax / 1000).toFixed(0)}K`;
  
  const spacesHalf = Math.floor(cols / 2) - 4;
  const spacesMax = cols - spacesHalf - 9;
  chartStr += `      $0${" ".repeat(spacesHalf > 0 ? spacesHalf : 1)}${halfLabel}${" ".repeat(spacesMax > 0 ? spacesMax : 1)}${maxLabel} (Gasto Mensual)\n`;
  chartStr += "\n Leyenda: [O] Clientes Activos  [X] Clientes en Fuga (Churn)";
  
  return chartStr;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Global Middlewares
  app.use(express.json());

  // ==========================================
  // API ROUTES (DECLARED FIRST)
  // ==========================================

  // 1. DATABASE CONNECTIVITY STATUS
  app.get("/api/database-status", async (req, res) => {
    // Attempt lazy check
    await getDBConnection();
    const status = getDbStatus();
    res.json(status);
  });

  // Test custom Laragon credentials
  app.post("/api/test-laragon-connection", async (req, res) => {
    const { host, user, password, database, port } = req.body;
    
    if (host) process.env.MYSQL_HOST = host;
    if (user !== undefined) process.env.MYSQL_USER = user;
    if (password !== undefined) process.env.MYSQL_PASSWORD = password;
    if (database) process.env.MYSQL_DATABASE = database;
    if (port) process.env.MYSQL_PORT = port.toString();

    // force reconnection
    const result = await getDBConnection();
    const status = getDbStatus();
    res.json({
      success: !result.isFallback,
      status,
      message: !result.isFallback 
        ? "¡Conexión establecida con éxito a Laragon MySQL!" 
        : `Fallo al conectar: ${result.error || "Timeout o credenciales incorrectas"}`
    });
  });

  // 2. CRUD ORDERS
  app.get("/api/orders", async (req, res) => {
    try {
      const ordersList = await getOrders();
      res.json(ordersList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { customer_name, email, phone, branch, items, total_amount, status } = req.body;
      
      if (!customer_name || !email || !items || !total_amount) {
        return res.status(400).json({ error: "Faltan datos obligatorios para el pedido." });
      }

      // Create in db (auto fallback if offline)
      const freshOrder = await createOrder({
        customer_name,
        email,
        phone: phone || "",
        branch: branch || "Osorno Centro",
        items,
        total_amount: parseInt(total_amount, 10),
        status: status || "Pendiente"
      });

      // Send automatic notification email
      const emailResult = await sendOrderNotification(freshOrder);

      // Append to Google Sheet (using fallback or real API if provided token)
      const oauthToken = req.headers.authorization?.split(" ")[1]; // Bearer <token>
      const sheetsResult = await appendOrderToSheet(freshOrder, oauthToken);

      res.status(201).json({
        message: "Pedido registrado con éxito.",
        order: freshOrder,
        notification: {
          email: emailResult,
          sheets: sheetsResult
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateOrder(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      res.json({ message: "Pedido actualizado", order: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await deleteOrder(id);
      if (!success) {
        return res.status(404).json({ error: "Pedido no encontrado para eliminar" });
      }
      res.json({ success: true, message: "Pedido eliminado correctamente." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. ADVANCED MACHINE LEARNING & PANDAS AGGREGATION ENDPOINT
  app.get("/api/ml-analysis", async (req, res) => {
    try {
      const dataset = await getAnalysisDataset();
      
      // Pandas operations
      const branchAverages = performPandasAggregation(dataset);
      
      // Parallel Models ML training
      const modelMetrics = trainAndEvaluateModels(dataset);

      // Raw scatter plot points for Plotly-like component rendering on the frontend
      const scatterPoints = dataset.map(item => ({
        name: item.customer_name,
        monthly_spending: item.monthly_spending,
        monthly_visits: item.monthly_visits,
        is_fuga: item.is_fuga, // 1 = Fugado, 0 = Activo
        branch: item.branch
      }));

      // Inyectar de forma viva los valores en un F-STRING multilínea como pide el requerimiento
      const scoreDT = modelMetrics.dtAccuracy;
      const scoreKNN = modelMetrics.knnAccuracy;
      const totalRegs = dataset.length;

      // Plotly Vector Dynamic Map Simulación en HTML
      const plotlyExpressBlock = `<div class="plotly-vector-chart bg-slate-900 border border-amber-900/30 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h4 class="text-sm font-semibold uppercase tracking-wider text-amber-500 font-mono">Plotly Express Vector Scatter Engine</h4>
    <span class="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-400 font-mono border border-red-900/40">Fuga Status Overlayed</span>
  </div>
  <svg viewBox="0 0 500 300" class="w-full h-64 overflow-visible">
    <!-- Grid -->
    <line x1="50" y1="240" x2="480" y2="240" stroke="#334155" stroke-dasharray="2 2" />
    <line x1="50" y1="20" x2="50" y2="240" stroke="#334155" stroke-dasharray="2 2" />
    
    <!-- Y-Axis labels (Visitas Mensuales) -->
    <text x="40" y="240" fill="#94a3b8" font-size="9" text-anchor="end" font-family="monospace">0</text>
    <text x="40" y="130" fill="#94a3b8" font-size="9" text-anchor="end" font-family="monospace">5 visits</text>
    <text x="40" y="30" fill="#94a3b8" font-size="9" text-anchor="end" font-family="monospace">10 visits</text>
    <text x="20" y="130" fill="#f59e0b" font-size="10" transform="rotate(-90 20 130)" text-anchor="middle" font-family="sans-serif">Visitas Mensuales</text>

    <!-- X-Axis labels (Monto Gasto Mensual) -->
    <text x="50" y="255" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">$0</text>
    <text x="265" y="255" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">$100.000</text>
    <text x="480" y="255" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">$200.000+</text>
    <text x="265" y="275" fill="#f59e0b" font-size="10" text-anchor="middle" font-family="sans-serif">Monto de Gasto Mensual ($ CLP)</text>

    <!-- Plot points dynamically -->
    ${dataset.map(c => {
      // Scale: Spending [0 - 250000] -> X [50 - 450]
      // Scale: Visits [0 - 10] -> Y [240 - 30]
      const minX = 50, maxX = 450;
      const minY = 240, maxY = 30;
      
      const xNorm = Math.min(Math.max((c.monthly_spending) / 250000, 0), 1);
      const yNorm = Math.min(Math.max((c.monthly_visits) / 10, 0), 1);
      
      const xPos = minX + xNorm * (maxX - minX);
      const yPos = minY - yNorm * (minY - maxY);
      
      const fillC = c.is_fuga === 1 ? "#ef4444" : "#22c55e"; // Red for Fuga, Green for Active
      const strokeC = c.is_fuga === 1 ? "#7f1d1d" : "#14532d";
      
      return `<g class="group pointer-events-auto">
        <circle cx="${xPos}" cy="${yPos}" r="6.5" fill="${fillC}" stroke="${strokeC}" stroke-width="1.5" class="transition-all duration-300 hover:r-9 cursor-pointer" />
        <title>${c.customer_name} (${c.branch})\nGastos: $${c.monthly_spending.toLocaleString("es-CL")}\nVisitas: ${c.monthly_visits}\nEstado: ${c.is_fuga === 1 ? 'Fuga' : 'Activo'}</title>
      </g>`;
    }).join("\n")}
  </svg>
  <div class="flex items-center justify-center gap-6 mt-4 text-xs">
    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-green-500 border border-green-700"></span><span class="text-slate-300 font-mono">Clientes Activos</span></div>
    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500 border border-red-700"></span><span class="text-slate-300 font-mono">Clientes en Fuga (Churn)</span></div>
  </div>
</div>`;

      // Generate ASCII representation of the scatter plot
      const asciiChart = generateAsciiChart(dataset);

      // Live multi-line f-string formatted for Python backend
      const fStringMultiline = `f"""
========================================================================
    DASHBOARD ENTRE PARRILLEROS - REPORTES DE MÉTRICAS Y ML VIVOS
========================================================================
🏠 Base de Datos Laragon MySQL : 'parrillero' (HeidiSQL 127.0.0.1:3306)
📈 Total de registros de análisis vigentes en Laragon : ${totalRegs} clientes
🌲 Score final de precisión - Àrbol de Decisión (max_depth=4) : ${scoreDT}%
⚡ Score de precisión - Nearest Neighbors (KNN, neighbors=5) : ${scoreKNN}%

[Gráfico de Dispersión ASCII - Interrelación de Gastos/Visitas]
${asciiChart}
========================================================================
"""`;

      // Return unified payload
      res.json({
        aggregation: branchAverages,
        metrics: modelMetrics,
        fString: fStringMultiline,
        points: scatterPoints,
        chartHtml: plotlyExpressBlock
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulator route to add buy transactions directly into Laragon (simulated in-memory)
  app.post("/api/ml-analysis/simulate", async (req, res) => {
    try {
      const { customer_name, email, branch, monthly_spending, monthly_visits, is_fuga } = req.body;
      
      if (!customer_name || !email || monthly_spending === undefined || monthly_visits === undefined) {
        return res.status(400).json({ error: "Faltan valores válidos para crear transacción." });
      }

      const recordCreated = await createAnalysisRecord({
        customer_name,
        email,
        branch: branch || "Osorno Centro",
        monthly_spending: parseInt(monthly_spending, 10),
        monthly_visits: parseInt(monthly_visits, 10),
        is_fuga: is_fuga ? 1 : 0
      });

      res.status(201).json({
        message: "Nueva transacción de cliente registrada con éxito.",
        record: recordCreated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. SHEETS SYNC ENDPOINTS
  app.get("/api/sheets-config", (req, res) => {
    res.json(getSheetsConfig());
  });

  app.post("/api/sheets-config", (req, res) => {
    const { sheetId } = req.body;
    const ok = updateSheetsConfig(sheetId);
    res.json({ success: ok, config: getSheetsConfig() });
  });

  app.post("/api/sheets-sync-all", async (req, res) => {
    try {
      const currentOrders = await getOrders();
      const oauthToken = req.headers.authorization?.split(" ")[1];
      const status = await syncAllOrdersToSheet(currentOrders, oauthToken);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. MONTHLY SALES REPORT GENERATION SCRIPT
  app.get("/api/monthly-sales-report", async (req, res) => {
    try {
      const ordersList = await getOrders();
      const activeTotal = ordersList.filter(o => o.status !== "Cancelado");
      
      // Group sales by month
      const monthsMap: Record<string, { total: number; count: number; meat: number; grocery: number }> = {};
      
      activeTotal.forEach(order => {
        const date = new Date(order.created_at);
        const key = date.toLocaleString("es-CL", { month: "long", year: "numeric" });
        
        if (!monthsMap[key]) {
          monthsMap[key] = { total: 0, count: 0, meat: 0, grocery: 0 };
        }
        
        monthsMap[key].count += 1;
        monthsMap[key].total += order.total_amount;
        
        order.items.forEach(item => {
          if (item.category === "carne") {
            monthsMap[key].meat += (item.price * item.quantity);
          } else {
            monthsMap[key].grocery += (item.price * item.quantity);
          }
        });
      });

      res.json({
        generated_at: new Date().toISOString(),
        summary: Object.keys(monthsMap).map(m => ({
          month: m,
          total: monthsMap[m].total,
          orders_count: monthsMap[m].count,
          average_ticket: monthsMap[m].count > 0 ? Math.round(monthsMap[m].total / monthsMap[m].count) : 0,
          shares: {
            carne: monthsMap[m].meat,
            abarrotes: monthsMap[m].grocery
          }
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // VITE SERVICE MIDDLEWARE & SPA FALLBACK
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();

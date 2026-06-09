import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Ideal credentials for Laragon MySQL
const DB_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const DB_USER = process.env.MYSQL_USER || "root";
const DB_PASS = process.env.MYSQL_PASSWORD || "";
const DB_NAME = process.env.MYSQL_DATABASE || "parrillero";
const DB_PORT = parseInt(process.env.MYSQL_PORT || "3306", 10);

export interface OrderItem {
  name: string;
  category: "carne" | "abarrotes";
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  customer_name: string;
  email: string;
  phone: string;
  branch: string;
  items: OrderItem[];
  total_amount: number;
  status: "Pendiente" | "Preparando" | "Enviado" | "Entregado" | "Cancelado";
  created_at: string;
}

export interface CustomerAnalysis {
  id: number;
  customer_name: string;
  email: string;
  branch: string;
  monthly_spending: number;
  monthly_visits: number;
  is_fuga: 0 | 1; // 1 = Fuga (churned), 0 = Activo
}

// In-Memory dataset for cloud fallback and testing
let ordersFallback: Order[] = [
  {
    id: 1,
    customer_name: "Gonzalo Retamal",
    email: "gonzalo@gmail.com",
    phone: "+56 9 8273 1192",
    branch: "Osorno Centro",
    items: [
      { name: "Asado de Tira Premium", category: "carne", quantity: 2, price: 15990 },
      { name: "Carbón Espino Especial", category: "abarrotes", quantity: 1, price: 5990 }
    ],
    total_amount: 37970,
    status: "Entregado",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: 2,
    customer_name: "María José Oyarzún",
    email: "mariajose@outlook.com",
    phone: "+56 9 1234 5678",
    branch: "Osorno Centro",
    items: [
      { name: "Lomo Vetado Angus", category: "carne", quantity: 1, price: 18990 },
      { name: "Sal de Cahuil Especiada", category: "abarrotes", quantity: 2, price: 3490 }
    ],
    total_amount: 25970,
    status: "Pendiente",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: 3,
    customer_name: "Carlos Ibáñez",
    email: "carlos.ibanez@yahoo.cl",
    phone: "+56 9 5555 4444",
    branch: "Osorno Centro",
    items: [
      { name: "Bife Chorizo", category: "carne", quantity: 3, price: 14990 }
    ],
    total_amount: 44970,
    status: "Preparando",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    customer_name: "Daniela Fuentes",
    email: "daniela.f@gmail.com",
    phone: "+56 9 9999 1111",
    branch: "Osorno Centro",
    items: [
      { name: "Pack Choricero Surtido", category: "carne", quantity: 2, price: 9990 },
      { name: "Pisco Artesanal Mistral 40°", category: "abarrotes", quantity: 1, price: 12990 }
    ],
    total_amount: 32970,
    status: "Entregado",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Seed dataset for Analysis (contains Osorno Centro and others)
let customersAnalysisFallback: CustomerAnalysis[] = [
  { id: 1, customer_name: "Gonzalo Retamal", email: "gonzalo@gmail.com", branch: "Osorno Centro", monthly_spending: 95000, monthly_visits: 5, is_fuga: 0 },
  { id: 2, customer_name: "María José Oyarzún", email: "mariajose@outlook.com", branch: "Osorno Centro", monthly_spending: 62000, monthly_visits: 3, is_fuga: 0 },
  { id: 3, customer_name: "Carlos Ibáñez", email: "carlos.ibanez@yahoo.cl", branch: "Osorno Centro", monthly_spending: 12000, monthly_visits: 1, is_fuga: 1 },
  { id: 4, customer_name: "Daniela Fuentes", email: "daniela.f@gmail.com", branch: "Osorno Centro", monthly_spending: 110000, monthly_visits: 6, is_fuga: 0 },
  { id: 5, customer_name: "Andrés Muñoz", email: "andres.m@live.cl", branch: "Osorno Centro", monthly_spending: 8000, monthly_visits: 1, is_fuga: 1 },
  { id: 6, customer_name: "Patricia Soto", email: "patricia.soto@gmail.com", branch: "Osorno Centro", monthly_spending: 55000, monthly_visits: 3, is_fuga: 0 },
  { id: 7, customer_name: "Ricardo Lagos", email: "r_lagos@gmail.com", branch: "Osorno Centro", monthly_spending: 5000, monthly_visits: 1, is_fuga: 1 },
  { id: 8, customer_name: "Mauricio Pinilla", email: "mpinilla@gmail.com", branch: "Osorno Centro", monthly_spending: 14000, monthly_visits: 2, is_fuga: 1 },
  { id: 9, customer_name: "Felipe Camiroaga", email: "fcamiroaga@tvn.cl", branch: "Santiago Providencia", monthly_spending: 180000, monthly_visits: 8, is_fuga: 0 },
  { id: 10, customer_name: "Alexis Sánchez", email: "alexis@maravilla.com", branch: "Santiago Providencia", monthly_spending: 240000, monthly_visits: 10, is_fuga: 0 },
  { id: 11, customer_name: "Arturo Vidal", email: "kingarturo@gmail.com", branch: "Santiago Providencia", monthly_spending: 20000, monthly_visits: 1, is_fuga: 1 },
  { id: 12, customer_name: "Francisca Silva", email: "fran.silva@gmail.com", branch: "Valdivia Costanera", monthly_spending: 88000, monthly_visits: 4, is_fuga: 0 },
  { id: 13, customer_name: "Pedro Anguita", email: "panguita@gmail.com", branch: "Valdivia Costanera", monthly_spending: 11000, monthly_visits: 1, is_fuga: 1 },
  { id: 14, customer_name: "Clara Edwards", email: "cedwards@gmail.com", branch: "Osorno Centro", monthly_spending: 75000, monthly_visits: 4, is_fuga: 0 },
  { id: 15, customer_name: "Jorge Valdivia", email: "mago@gmail.com", branch: "Osorno Centro", monthly_spending: 15000, monthly_visits: 1, is_fuga: 1 }
];

let dbConnection: mysql.Connection | null = null;
let isMySQLConnected = false;
let connErrorMessage = "";

// Initialize and check connection to Laragon MySQL
export async function getDBConnection(): Promise<{ connection: mysql.Connection | null; isFallback: boolean; error?: string }> {
  if (isMySQLConnected && dbConnection) {
    try {
      // test connection is alive
      await dbConnection.query("SELECT 1");
      return { connection: dbConnection, isFallback: false };
    } catch (e) {
      isMySQLConnected = false;
      dbConnection = null;
    }
  }

  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      port: DB_PORT,
      connectTimeout: 2000 // fail fast if not on local Laragon
    });
    
    dbConnection = conn;
    isMySQLConnected = true;
    connErrorMessage = "";
    console.log("✅ Successfully connected to Laragon MySQL database 'parrillero'!");

    // Ensure Tables Exist
    await ensureTablesExist(conn);

    return { connection: conn, isFallback: false };
  } catch (error: any) {
    connErrorMessage = error.message;
    dbConnection = null;
    isMySQLConnected = false;
    return { connection: null, isFallback: true, error: error.message };
  }
}

// Function to automatically create and seed tables inside local MySQL in Laragon
async function ensureTablesExist(conn: mysql.Connection) {
  try {
    // 1. Create orders table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`phone\` VARCHAR(50) NOT NULL,
        \`branch\` VARCHAR(255) NOT NULL,
        \`items\` TEXT NOT NULL,
        \`total_amount\` INT NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create customer analysis table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`customers_analysis\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`branch\` VARCHAR(255) NOT NULL,
        \`monthly_spending\` INT NOT NULL,
        \`monthly_visits\` INT NOT NULL,
        \`is_fuga\` TINYINT(1) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed tables if empty
    const [orderCountRows]: any = await conn.query("SELECT COUNT(*) as count FROM \`orders\`");
    if (orderCountRows[0].count === 0) {
      console.log("🌱 Seeding empty 'orders' table in MySQL...");
      for (const ord of ordersFallback) {
        await conn.query(
          "INSERT INTO \`orders\` (id, customer_name, email, phone, branch, items, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [ord.id, ord.customer_name, ord.email, ord.phone, ord.branch, JSON.stringify(ord.items), ord.total_amount, ord.status, new Date(ord.created_at)]
        );
      }
    }

    const [customerCountRows]: any = await conn.query("SELECT COUNT(*) as count FROM \`customers_analysis\`");
    if (customerCountRows[0].count === 0) {
      console.log("🌱 Seeding empty 'customers_analysis' table in MySQL...");
      for (const cust of customersAnalysisFallback) {
        await conn.query(
          "INSERT INTO \`customers_analysis\` (id, customer_name, email, branch, monthly_spending, monthly_visits, is_fuga) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [cust.id, cust.customer_name, cust.email, cust.branch, cust.monthly_spending, cust.monthly_visits, cust.is_fuga]
        );
      }
    }
  } catch (err) {
    console.error("⚠️ Error preparing MySQL database schemas:", err);
  }
}

// DB state getter for dashboard UI
export function getDbStatus() {
  return {
    connected: isMySQLConnected,
    host: DB_HOST,
    database: DB_NAME,
    user: DB_USER,
    port: DB_PORT,
    error: connErrorMessage || null
  };
}

// CRUD - GET ORDERS
export async function getOrders(): Promise<Order[]> {
  const { connection, isFallback } = await getDBConnection();
  if (isFallback || !connection) {
    return ordersFallback;
  }
  try {
    const [rows]: any = await connection.query("SELECT * FROM \`orders\` ORDER BY created_at DESC");
    return rows.map((r: any) => ({
      id: r.id,
      customer_name: r.customer_name,
      email: r.email,
      phone: r.phone,
      branch: r.branch,
      items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
      total_amount: r.total_amount,
      status: r.status,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  } catch (err) {
    console.error("⚠️ Failed to query MySQL orders, using fallback: ", err);
    return ordersFallback;
  }
}

// CRUD - CREATE ORDER
export async function createOrder(orderData: Omit<Order, "id" | "created_at">): Promise<Order> {
  const { connection, isFallback } = await getDBConnection();
  const newOrder: Order = {
    ...orderData,
    id: isFallback ? ordersFallback.length + 1 : 0, // Assigned below or by auto-increment
    created_at: new Date().toISOString()
  };

  // Also adjust customer statistics for this client to feedback model!
  const spending = orderData.total_amount;
  const visits = 1;
  const newCustAnal: CustomerAnalysis = {
    id: customersAnalysisFallback.length + 1,
    customer_name: orderData.customer_name,
    email: orderData.email,
    branch: orderData.branch,
    monthly_spending: spending,
    monthly_visits: visits,
    is_fuga: 0 // New ordering customer, active
  };
  
  // Always update fallbacks
  customersAnalysisFallback.push(newCustAnal);

  if (isFallback || !connection) {
    ordersFallback.unshift(newOrder);
    return newOrder;
  }

  try {
    const [result]: any = await connection.query(
      "INSERT INTO \`orders\` (customer_name, email, phone, branch, items, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [orderData.customer_name, orderData.email, orderData.phone, orderData.branch, JSON.stringify(orderData.items), orderData.total_amount, orderData.status]
    );
    newOrder.id = result.insertId;

    // Check if customer exists in analysis, if so increment, otherwise insert
    const [custEx]: any = await connection.query("SELECT * FROM \`customers_analysis\` WHERE email = ?", [orderData.email]);
    if (custEx.length > 0) {
      await connection.query(
        "UPDATE \`customers_analysis\` SET monthly_spending = monthly_spending + ?, monthly_visits = monthly_visits + 1, is_fuga = 0 WHERE email = ?",
        [orderData.total_amount, orderData.email]
      );
    } else {
      await connection.query(
        "INSERT INTO \`customers_analysis\` (customer_name, email, branch, monthly_spending, monthly_visits, is_fuga) VALUES (?, ?, ?, ?, ?, ?, 0)",
        [orderData.customer_name, orderData.email, orderData.branch, orderData.total_amount, 1]
      );
    }

    return newOrder;
  } catch (err) {
    console.error("⚠️ MySQL insert failed, saving to fallback memory", err);
    ordersFallback.unshift(newOrder);
    return newOrder;
  }
}

// CRUD - UPDATE ORDER
export async function updateOrder(id: number, updatedData: Partial<Order>): Promise<Order | null> {
  const { connection, isFallback } = await getDBConnection();
  
  if (isFallback || !connection) {
    const idx = ordersFallback.findIndex(o => o.id === id);
    if (idx !== -1) {
      ordersFallback[idx] = { ...ordersFallback[idx], ...updatedData };
      return ordersFallback[idx];
    }
    return null;
  }

  try {
    const fieldsToSet: string[] = [];
    const values: any[] = [];

    if (updatedData.customer_name) { fieldsToSet.push("\`customer_name\` = ?"); values.push(updatedData.customer_name); }
    if (updatedData.email) { fieldsToSet.push("\`email\` = ?"); values.push(updatedData.email); }
    if (updatedData.phone) { fieldsToSet.push("\`phone\` = ?"); values.push(updatedData.phone); }
    if (updatedData.branch) { fieldsToSet.push("\`branch\` = ?"); values.push(updatedData.branch); }
    if (updatedData.items) { fieldsToSet.push("\`items\` = ?"); values.push(JSON.stringify(updatedData.items)); }
    if (updatedData.total_amount !== undefined) { fieldsToSet.push("\`total_amount\` = ?"); values.push(updatedData.total_amount); }
    if (updatedData.status) { fieldsToSet.push("\`status\` = ?"); values.push(updatedData.status); }

    if (fieldsToSet.length === 0) return null;

    values.push(id);
    await connection.query(
      `UPDATE \`orders\` SET ${fieldsToSet.join(", ")} WHERE id = ?`,
      values
    );

    const [rows]: any = await connection.query("SELECT * FROM \`orders\` WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      customer_name: r.customer_name,
      email: r.email,
      phone: r.phone,
      branch: r.branch,
      items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
      total_amount: r.total_amount,
      status: r.status,
      created_at: new Date(r.created_at).toISOString()
    };
  } catch (err) {
    console.error("⚠️ Failed updating MySQL order:", err);
    // Try fallback editing anyways
    const idx = ordersFallback.findIndex(o => o.id === id);
    if (idx !== -1) {
      ordersFallback[idx] = { ...ordersFallback[idx], ...updatedData };
      return ordersFallback[idx];
    }
    return null;
  }
}

// CRUD - DELETE ORDER
export async function deleteOrder(id: number): Promise<boolean> {
  const { connection, isFallback } = await getDBConnection();
  
  // Delete from fallback list
  const initialLen = ordersFallback.length;
  ordersFallback = ordersFallback.filter(o => o.id !== id);
  const deletedInFallback = ordersFallback.length < initialLen;

  if (isFallback || !connection) {
    return deletedInFallback;
  }

  try {
    const [result]: any = await connection.query("DELETE FROM \`orders\` WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error("⚠️ MySQL delete failed:", err);
    return deletedInFallback;
  }
}

// GET DATASET FOR ML MODELS (PANDAS-LIKE RAW TABLE)
export async function getAnalysisDataset(): Promise<CustomerAnalysis[]> {
  const { connection, isFallback } = await getDBConnection();
  if (isFallback || !connection) {
    return customersAnalysisFallback;
  }
  try {
    const [rows]: any = await connection.query("SELECT * FROM \`customers_analysis\`");
    return rows.map((r: any) => ({
      id: r.id,
      customer_name: r.customer_name,
      email: r.email,
      branch: r.branch,
      monthly_spending: r.monthly_spending,
      monthly_visits: r.monthly_visits,
      is_fuga: r.is_fuga ? 1 : 0
    }));
  } catch (err) {
    console.error("⚠️ Failed querying customer analysis list from MySQL:", err);
    return customersAnalysisFallback;
  }
}

// FOR SIMULATION PURPOSES: Settle a manual customer_analysis record via Laragon simulator
export async function createAnalysisRecord(data: Omit<CustomerAnalysis, "id">): Promise<CustomerAnalysis> {
  const { connection, isFallback } = await getDBConnection();
  const newRec = {
    ...data,
    id: isFallback ? customersAnalysisFallback.length + 1 : 0
  };

  customersAnalysisFallback.push(newRec);

  if (isFallback || !connection) {
    return newRec;
  }

  try {
    const [res]: any = await connection.query(
      "INSERT INTO \`customers_analysis\` (customer_name, email, branch, monthly_spending, monthly_visits, is_fuga) VALUES (?, ?, ?, ?, ?, ?)",
      [data.customer_name, data.email, data.branch, data.monthly_spending, data.monthly_visits, data.is_fuga]
    );
    newRec.id = res.insertId;
    return newRec;
  } catch (err) {
    console.error("⚠️ Failed inserting analysis row into MySQL:", err);
    return newRec;
  }
}

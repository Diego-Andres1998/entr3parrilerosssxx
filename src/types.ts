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

export interface DatabaseStatus {
  connected: boolean;
  host: string;
  database: string;
  user: string;
  port: number;
  error: string | null;
}

export interface AggregationResult {
  is_fuga: number;
  count: number;
  avg_spending: number;
  avg_visits: number;
}

export interface ModelMetrics {
  dtAccuracy: number;
  knnAccuracy: number;
  totalRecords: number;
  trainSize: number;
  testSize: number;
}

export interface MLAnalysisPayload {
  aggregation: AggregationResult[];
  metrics: ModelMetrics;
  fString: string;
  points: Array<{
    name: string;
    monthly_spending: number;
    monthly_visits: number;
    is_fuga: number;
    branch: string;
  }>;
  chartHtml: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: "carne" | "abarrotes";
  price: number;
  description: string;
  image: string;
  badge?: string;
}

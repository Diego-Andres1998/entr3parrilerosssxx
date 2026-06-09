import { Order } from "./db";

export interface SheetsSyncStatus {
  synced: boolean;
  simulated: boolean;
  message: string;
  sheetId: string;
  addedRowsCount: number;
}

// Configurable Sheet ID
let ACTIVE_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "1Y8gYp99G152P7Fv6ZzY_zH7pYshWJ5f7H-8f7Z-example";
let GOOGLE_CLIENT_CONNECTED = false;

export function getSheetsConfig() {
  return {
    sheetId: ACTIVE_SPREADSHEET_ID,
    connected: GOOGLE_CLIENT_CONNECTED
  };
}

export function updateSheetsConfig(sheetId: string) {
  if (sheetId) {
    ACTIVE_SPREADSHEET_ID = sheetId;
    return true;
  }
  return false;
}

export async function appendOrderToSheet(order: Order, oauthToken?: string): Promise<SheetsSyncStatus> {
  const formattedItems = order.items.map(i => `${i.name} (x${i.quantity})`).join(", ");
  const rowData = [
    order.id.toString(),
    new Date(order.created_at).toLocaleString("es-CL"),
    order.customer_name,
    order.email,
    order.phone,
    order.branch,
    formattedItems,
    order.total_amount.toString(),
    order.status
  ];

  // If ACTIVE_SPREADSHEET_ID is a Google Apps Script Web App URL
  if (ACTIVE_SPREADSHEET_ID && (ACTIVE_SPREADSHEET_ID.startsWith("http://") || ACTIVE_SPREADSHEET_ID.startsWith("https://"))) {
    try {
      const response = await fetch(ACTIVE_SPREADSHEET_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ row: rowData })
      });

      if (response.ok) {
        console.log(`📊 Successfully synchronized order #${order.id} with Google Sheets via Web App/Apps Script!`);
        GOOGLE_CLIENT_CONNECTED = true;
        return {
          synced: true,
          simulated: false,
          message: "Sincronizado correctamente con tu Google Sheets en tiempo real vía Apps Script.",
          sheetId: ACTIVE_SPREADSHEET_ID,
          addedRowsCount: 1
        };
      } else {
        const errText = await response.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      console.warn("⚠️ Google Apps Script error, falling back to simulation:", err.message);
      return {
        synced: false,
        simulated: true,
        message: `Fallo al escribir en Google Sheets (Apps Script): ${err.message}`,
        sheetId: ACTIVE_SPREADSHEET_ID,
        addedRowsCount: 1
      };
    }
  }

  if (oauthToken) {
    try {
      // Real API request to Google Sheets Append API
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ACTIVE_SPREADSHEET_ID}/values/A1:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${oauthToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [rowData]
        })
      });

      if (response.ok) {
        console.log(`📊 Successfully synchronized order #${order.id} with Google Sheets!`);
        GOOGLE_CLIENT_CONNECTED = true;
        return {
          synced: true,
          simulated: false,
          message: "Sincronizado correctamente con tu Google Sheets en tiempo real.",
          sheetId: ACTIVE_SPREADSHEET_ID,
          addedRowsCount: 1
        };
      } else {
        const errText = await response.text();
        throw new Error(errText);
      }
    } catch (err: any) {
      console.warn("⚠️ Google Sheets API error, falling back to simulated integration:", err.message);
      return {
        synced: false,
        simulated: true,
        message: `Fallo de autorización al escribir API de Sheets: ${err.message}. Operando en modo de simulación.`,
        sheetId: ACTIVE_SPREADSHEET_ID,
        addedRowsCount: 1
      };
    }
  }

  // Fallback simulator is active
  console.log(`📊 [SIMULACIÓN GOOGLE SHEETS] Append Row a planilla ID '${ACTIVE_SPREADSHEET_ID}':`, rowData);
  return {
    synced: false,
    simulated: true,
    message: "Pedido guardado y listo para sincronizar. (Conecta con Google Sheets configurando tu ID de planilla o pegando tu URL de Apps Script).",
    sheetId: ACTIVE_SPREADSHEET_ID,
    addedRowsCount: 1
  };
}

export async function syncAllOrdersToSheet(orders: Order[], oauthToken?: string): Promise<SheetsSyncStatus> {
  // If ACTIVE_SPREADSHEET_ID is a Google Apps Script Web App URL
  if (ACTIVE_SPREADSHEET_ID && (ACTIVE_SPREADSHEET_ID.startsWith("http://") || ACTIVE_SPREADSHEET_ID.startsWith("https://"))) {
    try {
      const response = await fetch(ACTIVE_SPREADSHEET_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rows: orders.map(order => [
            order.id.toString(),
            new Date(order.created_at).toLocaleString("es-CL"),
            order.customer_name,
            order.email,
            order.phone,
            order.branch,
            order.items.map(i => `${i.name} (x${i.quantity})`).join(", "),
            order.total_amount.toString(),
            order.status
          ])
        })
      });

      if (response.ok) {
        GOOGLE_CLIENT_CONNECTED = true;
        return {
          synced: true,
          simulated: false,
          message: `Sincronizados correctamente ${orders.length} pedidos históricos en Google Sheets vía Apps Script.`,
          sheetId: ACTIVE_SPREADSHEET_ID,
          addedRowsCount: orders.length
        };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err: any) {
      return {
        synced: false,
        simulated: true,
        message: `Fallo al sincronizar vía Apps Script: ${err.message}`,
        sheetId: ACTIVE_SPREADSHEET_ID,
        addedRowsCount: orders.length
      };
    }
  }

  if (oauthToken) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ACTIVE_SPREADSHEET_ID}/values/A1:append?valueInputOption=USER_ENTERED`;
      
      const values = orders.map(order => [
        order.id.toString(),
        new Date(order.created_at).toLocaleString("es-CL"),
        order.customer_name,
        order.email,
        order.phone,
        order.branch,
        order.items.map(i => `${i.name} (x${i.quantity})`).join(", "),
        order.total_amount.toString(),
        order.status
      ]);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${oauthToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values })
      });

      if (response.ok) {
        GOOGLE_CLIENT_CONNECTED = true;
        return {
          synced: true,
          simulated: false,
          message: `Sincronizados correctamente ${orders.length} pedidos históricos en tu Google Sheets.`,
          sheetId: ACTIVE_SPREADSHEET_ID,
          addedRowsCount: orders.length
        };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (err: any) {
      return {
        synced: false,
        simulated: true,
        message: `Fallo de conexión: ${err.message}.`,
        sheetId: ACTIVE_SPREADSHEET_ID,
        addedRowsCount: orders.length
      };
    }
  }

  return {
    synced: false,
    simulated: true,
    message: "Sincronizados localmente. Para grabarlos en Sheets, conéctate vía Google OAuth o introduce una URL de Apps Script válida.",
    sheetId: ACTIVE_SPREADSHEET_ID,
    addedRowsCount: orders.length
  };
}

import nodemailer from "nodemailer";
import { Order } from "./db";

export interface EmailStatus {
  sent: boolean;
  simulated: boolean;
  message: string;
  recipient: string;
  htmlContent: string;
}

// Mail configuration (can be specified in .env)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SENDER = process.env.SMTP_SENDER || '"Notificaciones Entre Parrilleros" <ventas@entreparrilleros.cl>';
const NOTIFICATION_RECIPIENT = process.env.NOTIFICATION_RECIPIENT || "contacto@entreparrilleros.cl";

export async function sendOrderNotification(order: Order): Promise<EmailStatus> {
  // 1. Generate elegant HTML email content
  const itemsRows = order.items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 6px; font-size: 14px; color: #1e293b;">
        <strong style="color: #0f172a;">${item.name}</strong><br/>
        <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">${item.category}</span>
      </td>
      <td style="padding: 12px 6px; text-align: center; font-size: 14px; color: #334155;">x${item.quantity}</td>
      <td style="padding: 12px 6px; text-align: right; font-size: 14px; color: #334155;">$${item.price.toLocaleString("es-CL")}</td>
      <td style="padding: 12px 6px; text-align: right; font-weight: 600; font-size: 14px; color: #0f172a;">$${(item.price * item.quantity).toLocaleString("es-CL")}</td>
    </tr>
  `).join("");

  const formattedTotal = order.total_amount.toLocaleString("es-CL");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nuevo Pedido Recibido</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background-color: #7f1d1d; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">¡Nuevo Pedido Recibido!</h1>
          <p style="color: #fca5a5; margin: 8px 0 0 0; font-size: 14px;">Entre Parrilleros - Carnes y Abarrotes</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155; line-height: 1.5; margin-top: 0;">
            Hola Equipo de <strong>Entre Parrilleros</strong>,
          </p>
          <p style="font-size: 15px; color: #334155; line-height: 1.5;">
            Se ha registrado un nuevo pedido en la landing page. A continuación se presentan los detalles del cliente y de los productos solicitados:
          </p>

          <!-- Client details box -->
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Datos del Solicitante</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Cliente:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;"><strong>${order.customer_name}</strong></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Email:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;"><a href="mailto:${order.email}" style="color: #7f1d1d; text-decoration: none;">${order.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Teléfono:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;">${order.phone || "No especificado"}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Sucursal:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;"><span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600;">${order.branch}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>ID Pedido:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; font-family: monospace;">#${order.id || "TEMP"}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Fecha/Hora:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;">${new Date(order.created_at).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">Detalle del Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #cbd5e1; text-align: left;">
                <th style="padding: 8px 6px; font-size: 13px; color: #475569; font-weight: 600;">Producto</th>
                <th style="padding: 8px 6px; font-size: 13px; color: #475569; font-weight: 600; text-align: center;">Cantidad</th>
                <th style="padding: 8px 6px; font-size: 13px; color: #475569; font-weight: 600; text-align: right;">Unitario</th>
                <th style="padding: 8px 6px; font-size: 13px; color: #475569; font-weight: 600; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 16px 6px 4px 6px;"></td>
                <td style="padding: 16px 6px 4px 6px; text-align: right; font-size: 14px; color: #64748b; font-weight: 600;">MONTO TOTAL:</td>
                <td style="padding: 16px 6px 4px 6px; text-align: right; font-size: 18px; color: #7f1d1d; font-weight: 700;">$${formattedTotal}</td>
              </tr>
            </tfoot>
          </table>

          <div style="text-align: center; margin: 32px 0 12px 0;">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/admin" target="_blank" style="background-color: #7f1d1d; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver Pedidos en Panel Administrativo
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            Este es un correo automático enviado por el Portal de Ventas de Entre Parrilleros.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 2. Check if SMTP is configured
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // Use SSL for port 465, TLS starttls for 587
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: SMTP_SENDER,
        to: NOTIFICATION_RECIPIENT,
        cc: order.email, // Carbon Copy to the client
        subject: `[Nuevo Pedido #${order.id}] ${order.customer_name} - ${order.branch}`,
        html: emailHtml
      });

      console.log(`✉️ Email successfully dispatched to owner ${NOTIFICATION_RECIPIENT} and client ${order.email}!`);
      return {
        sent: true,
        simulated: false,
        message: `Correo real enviado exitosamente mediante SMTP a ${NOTIFICATION_RECIPIENT} y copia para ${order.email}.`,
        recipient: NOTIFICATION_RECIPIENT,
        htmlContent: emailHtml
      };
    } catch (err: any) {
      console.warn("⚠️ nodemailer failed, falling back to simulated mail dashboard log:", err.message);
      return {
        sent: false,
        simulated: true,
        message: `Fallo SMTP temporal (${err.message}). Simulado en panel administrativo.`,
        recipient: NOTIFICATION_RECIPIENT,
        htmlContent: emailHtml
      };
    }
  } else {
    // Return simulated status
    console.log(`✉️ [SIMULACIÓN] Correo automático listo. Destinatario: ${NOTIFICATION_RECIPIENT}, Copia: ${order.email}, Total: $${formattedTotal}`);
    return {
      sent: false,
      simulated: true,
      message: "Correo simulado con éxito. (Configura SMTP en .env para despachar correos reales).",
      recipient: NOTIFICATION_RECIPIENT,
      htmlContent: emailHtml
    };
  }
}

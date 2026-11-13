import { Order } from '@/types';
import { formatIDR, formatTo62Phone } from './formatters';

export interface WhatsAppLog {
  id: string;
  recipient: string;
  message: string;
  type: 'CUSTOMER_PAID' | 'CUSTOMER_READY' | 'OPERATIONAL_GROUP' | 'COURIER_CHAT';
  timestamp: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
}

declare global {
  // eslint-disable-next-line no-var
  var __BGN_WA_LOGS__: WhatsAppLog[] | undefined;
}

if (!global.__BGN_WA_LOGS__) {
  global.__BGN_WA_LOGS__ = [];
}

export function getWhatsAppLogs(): WhatsAppLog[] {
  return global.__BGN_WA_LOGS__ || [];
}

// Send WhatsApp via Fonnte or Wablas API
async function sendViaGateway(
  target: string,
  message: string
): Promise<{ success: boolean; status: 'SENT' | 'SIMULATED' | 'FAILED' }> {
  const token = process.env.FONNTE_TOKEN || process.env.WABLAS_TOKEN;
  const endpoint = process.env.FONNTE_TOKEN
    ? 'https://api.fonnte.com/send'
    : process.env.WABLAS_TOKEN
    ? 'https://jakarta.wablas.com/api/send-message'
    : null;

  if (!endpoint || !token) {
    // Simulated delivery log
    return { success: true, status: 'SIMULATED' };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        phone: target,
        message,
      }),
    });
    return { success: res.ok, status: res.ok ? 'SENT' : 'FAILED' };
  } catch (err) {
    console.error('[WhatsApp Gateway] Error:', err);
    return { success: false, status: 'FAILED' };
  }
}

// 1. WhatsApp Template: Pembayaran Lunas & Nomor Antrean Terbit
export async function sendOrderPaidNotification(order: Order) {
  const phone = formatTo62Phone(order.customer_whatsapp);
  const itemsList = (order.items || [])
    .map((it) => {
      const opts =
        it.selected_options && Object.keys(it.selected_options).length > 0
          ? ` (${Object.entries(it.selected_options)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')})`
          : '';
      return `• ${it.quantity}x ${it.product_name}${opts}`;
    })
    .join('\n');

  const message = `🎉 *PEMBAYARAN BERHASIL (KEDAI BGN BERSATOE)* 🎉
Halo Kak *${order.customer_name}*, terima kasih telah memesan di KEDAI BGN BERSATOE!

📌 *Nomor Antrean: ${order.queue_number || 'A-001'}*
🆔 Kode Pesanan: ${order.order_code}
💰 Total Pembayaran: ${formatIDR(order.gross_amount)}

📋 *Detail Pesanan:*
${itemsList}

📍 *Metode Pemenuhan:* ${
    order.fulfillment_type === 'DELIVERY'
      ? `Antar ke Kampus (Lokasi: ${order.campus_location || 'Telkom Jakarta'})`
      : 'Ambil Sendiri'
  }
⏰ *Waktu:* ${order.scheduled_time}

Pesanan Kakak telah kami catat dan disiapkan sesuai jadwal pengantaran atau pengambilan.`;

  const { status } = await sendViaGateway(phone, message);
  global.__BGN_WA_LOGS__?.push({
    id: 'wa-' + Math.random().toString(36).substring(2, 9),
    recipient: phone,
    message,
    type: 'CUSTOMER_PAID',
    timestamp: new Date().toISOString(),
    status,
  });
}

// 2. WhatsApp Template: Makanan Siap Diantar / Siap Diambil
export async function sendOrderReadyNotification(order: Order) {
  const phone = formatTo62Phone(order.customer_whatsapp);
  const isDelivery = order.fulfillment_type === 'DELIVERY';

  const message = `🔔 *PESANAN SIAP - KEDAI BGN BERSATOE* 🔔
Halo Kak *${order.customer_name}*, kabar gembira!

🍽️ Nomor Antrean *${order.queue_number}* (${order.order_code}) *SUDAH SIAP!*

${
  isDelivery
    ? `🛵 *Kurir sedang menuju titik kumpul:*
📍 Lokasi: ${order.campus_location || 'Area Kampus'}
Patokan: ${order.location_notes || '-'}
Mohon tetap aktifkan WhatsApp Kakak agar kurir dapat menyerahkan pesanan dengan lancar!`
    : `🛍️ *Silakan ambil pesanan Kakak di Kedai BGN Bersatoe.*
Tunjukkan pesan ini atau Nomor Antrean *${order.queue_number}* ke kasir/staf kami.`
}

Selamat menikmati hidangan lezat Berasa Gurih & Nikmat!`;

  const { status } = await sendViaGateway(phone, message);
  global.__BGN_WA_LOGS__?.push({
    id: 'wa-' + Math.random().toString(36).substring(2, 9),
    recipient: phone,
    message,
    type: 'CUSTOMER_READY',
    timestamp: new Date().toISOString(),
    status,
  });
}

// 3. WhatsApp Template: Ringkasan Pesanan Baru ke Grup Operasional BGN
export async function sendOperationalGroupSummary(order: Order) {
  const groupTarget = process.env.WHATSAPP_OPERATIONAL_GROUP_ID || 'BGN_OPS_GROUP';
  const itemsList = (order.items || [])
    .map((it) => `${it.quantity}x ${it.product_name}`)
    .join(', ');

  const message = `📢 *[NOTIFIKASI OPERASIONAL BGN]* 
Antrean: *${order.queue_number}* | Kode: ${order.order_code}
Pelanggan: ${order.customer_name} (${order.customer_whatsapp})
Tipe: ${order.fulfillment_type === 'DELIVERY' ? `Delivery (${order.campus_location})` : 'Pick-up'}
Jadwal: ${order.scheduled_time}
Total: ${formatIDR(order.gross_amount)}
Menu: ${itemsList}`;

  const { status } = await sendViaGateway(groupTarget, message);
  global.__BGN_WA_LOGS__?.push({
    id: 'wa-' + Math.random().toString(36).substring(2, 9),
    recipient: groupTarget,
    message,
    type: 'OPERATIONAL_GROUP',
    timestamp: new Date().toISOString(),
    status,
  });
}

// 4. Click-to-Chat WhatsApp Link Generator for Couriers
export function generateCourierWhatsAppUrl(order: Order): string {
  const phone = formatTo62Phone(order.customer_whatsapp);
  const text = encodeURIComponent(
    `Halo Kak ${order.customer_name}, saya Kurir KEDAI BGN BERSATOE. Saya sudah tiba di ${
      order.campus_location || 'titik kumpul kampus'
    } untuk mengantarkan pesanan Antrean ${order.queue_number}. Apakah Kakak sudah di lokasi?`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

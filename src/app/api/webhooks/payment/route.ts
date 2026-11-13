import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getOrderByIdOrCode,
  settlePaymentInMemory,
  expirePaymentInMemory,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import {
  appendToGoogleSheet,
  formatIDR,
  formatWIB,
  formatTo62Phone,
} from '@/lib/google-sheets';
import {
  sendOrderPaidNotification,
  sendOperationalGroupSummary,
} from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orderId = body.order_id || body.orderId || body.id;
    const statusCode = body.status_code || body.statusCode || '200';
    const grossAmount = body.gross_amount || body.grossAmount;
    const transactionStatus = body.transaction_status || body.status || 'settlement';
    const signatureKey = body.signature_key || body.signature;
    const paymentType = (body.payment_type || body.paymentMethod || 'QRIS').toUpperCase();
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'BGN_DEV_SERVER_KEY';

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing order_id' },
        { status: 400 }
      );
    }

    // 1. Signature Key Verification (SHA-512)
    // Only enforced in production or if signatureKey is provided
    if (process.env.NODE_ENV === 'production' && process.env.MIDTRANS_SERVER_KEY) {
      if (!signatureKey) {
        return NextResponse.json(
          { success: false, message: 'Signature key missing' },
          { status: 401 }
        );
      }
      const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
      const expectedSignature = crypto
        .createHash('sha512')
        .update(rawString)
        .digest('hex');

      if (signatureKey !== expectedSignature) {
        return NextResponse.json(
          { success: false, message: 'Invalid cryptographic signature hash' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch Order
    const order = getOrderByIdOrCode(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. Status Handler: EXPIRE / CANCEL
    if (transactionStatus === 'expire' || transactionStatus === 'cancel') {
      const res = expirePaymentInMemory(order.id);
      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin
          .from('orders')
          .update({ order_status: 'EXPIRED', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        await supabaseAdmin
          .from('payments')
          .update({ payment_status: 'EXPIRE', updated_at: new Date().toISOString() })
          .eq('order_id', order.id);
      }
      return NextResponse.json({
        success: true,
        message: 'Order status updated to EXPIRED',
        order_status: 'EXPIRED',
      });
    }

    // 4. Status Handler: SETTLEMENT / CAPTURE (Payment Success)
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      // Settle in memory (handles idempotency and issues queue number A-XXX)
      const settlement = settlePaymentInMemory(order.id, body.transaction_id || `GW-${order.order_code}`);
      
      if (!settlement) {
        return NextResponse.json(
          { success: false, message: 'Settlement failed' },
          { status: 500 }
        );
      }

      // If already settled before (idempotency guard), return 200 OK immediately
      if (settlement.alreadySettled) {
        return NextResponse.json({
          success: true,
          message: 'Webhook idempotent: transaction already settled previously',
          order_code: order.order_code,
          queue_number: order.queue_number,
        });
      }

      // Update Supabase if configured
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          await supabaseAdmin.rpc('process_payment_settlement', {
            p_order_id: order.id,
            p_gateway_ref: body.transaction_id || `GW-${order.order_code}`,
            p_payment_method: paymentType,
          });
        } catch (dbErr) {
          console.warn('[Supabase Settle RPC Error]:', dbErr);
          // Fallback direct update
          await supabaseAdmin
            .from('orders')
            .update({
              order_status: 'PAID',
              queue_number: settlement.queueNumber,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          await supabaseAdmin
            .from('payments')
            .update({
              payment_status: 'SETTLEMENT',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', order.id);
        }
      }

      // 5. AUTO-SYNC TO GOOGLE SHEETS DIVISI KEUANGAN (10 Kolom Standar)
      const itemsSummary = (order.items || [])
        .map((it) => {
          const opts = Object.entries(it.selected_options || {})
            .map(([, v]) => v)
            .join(', ');
          return `${it.quantity}x ${it.product_name}${opts ? ` (${opts})` : ''}`;
        })
        .join('; ');

      const paymentRecord = settlement.payment;
      const mdrFee = paymentRecord ? paymentRecord.mdr_fee_amount : 0;
      const netRev = paymentRecord ? paymentRecord.net_revenue : order.gross_amount;

      const sheetRowData = {
        transaction_id: order.order_code,
        timestamp_wib: formatWIB(new Date().toISOString()),
        customer_name: order.customer_name,
        contact: formatTo62Phone(order.customer_whatsapp),
        items_summary: itemsSummary,
        gross_amount_formatted: formatIDR(order.gross_amount),
        payment_method: paymentRecord ? paymentRecord.payment_method : 'QRIS',
        mdr_fee_formatted: formatIDR(mdrFee),
        net_revenue_formatted: formatIDR(netRev),
        order_status: 'Menunggu Diproses',
      };

      const syncResult = await appendToGoogleSheet(sheetRowData);
      if (paymentRecord) {
        paymentRecord.sheet_sync_status = syncResult.success;
        paymentRecord.sheet_row_number = syncResult.rowNumber;
      }

      // 6. TRIGGER AUTOMATED WHATSAPP NOTIFICATIONS
      // (a) Customer WhatsApp Notification (Queue Number & Receipt)
      sendOrderPaidNotification(order).catch((err) =>
        console.error('Failed to send customer WhatsApp notification:', err)
      );

      // (b) Operational Group WhatsApp Notification
      sendOperationalGroupSummary(order).catch((err) =>
        console.error('Failed to send operational WhatsApp summary:', err)
      );

      return NextResponse.json({
        success: true,
        message: 'Payment settled successfully',
        order_code: order.order_code,
        queue_number: settlement.queueNumber,
        sheet_sync: syncResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Status ${transactionStatus} acknowledged`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Payment Webhook Error:', err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

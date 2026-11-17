import { NextResponse } from 'next/server';
import {
  getAllOrders,
  updateOrderStatusInMemory,
  upsertOrderInMemory,
  getPaymentByOrderId,
  clearAllOrdersInMemory,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { updateGoogleSheetOrderStatus } from '@/lib/google-sheets';
import { sendOrderReadyNotification } from '@/lib/whatsapp';
import { OrderStatus } from '@/types';
import { getAdminPassword } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const location = searchParams.get('location');
    const orderType = searchParams.get('order_type');

    let orders = getAllOrders();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            payments(*)
          `)
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('order_status', status);
        }
        if (location && location !== 'ALL') {
          query = query.eq('campus_location', location);
        }

        const { data: dbOrders, error } = await query;
        if (!error && dbOrders && dbOrders.length > 0) {
          const mappedOrders = dbOrders.map((o) => {
            const payments = Array.isArray(o.payments) ? o.payments : [];
            const latestPayment = payments.length > 0 ? payments[0] : null;
            const paymentMethod = (o.payment_method as string) || latestPayment?.payment_method || 'CASH';
            const proofUrl =
              o.delivery_proof_url ||
              (latestPayment?.deeplink_url &&
              (latestPayment.deeplink_url.startsWith('http') || latestPayment.deeplink_url.startsWith('data:'))
                ? latestPayment.deeplink_url
                : null);
            return {
              ...o,
              payment_method: paymentMethod,
              delivery_proof_url: proofUrl,
            };
          });
          return NextResponse.json({ success: true, orders: mappedOrders });
        }
      } catch (dbErr) {
        console.warn('[Supabase Orders Fetch Error]:', dbErr);
      }
    }

    if (status) {
      orders = orders.filter((o) => o.order_status === status);
    }
    if (location && location !== 'ALL') {
      orders = orders.filter((o) => o.campus_location === location);
    }
    if (orderType && orderType !== 'ALL') {
      orders = orders.filter((o) => o.order_type === orderType);
    }

    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus, proofBase64, deliveryProofUrl } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId or newStatus' },
        { status: 400 }
      );
    }

    const validStatuses: OrderStatus[] = [
      'WAITING_PAYMENT',
      'PAID',
      'COOKING',
      'READY_FOR_DELIVERY',
      'COMPLETED',
      'EXPIRED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status: ${newStatus}` },
        { status: 400 }
      );
    }

    let savedProofUrl = deliveryProofUrl || null;

    if (proofBase64 && isSupabaseConfigured && supabaseAdmin) {
      try {
        const matches = proofBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const buffer = matches
          ? Buffer.from(matches[2], 'base64')
          : Buffer.from(proofBase64, 'base64');
        const safeOrderId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `proof-${safeOrderId}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('proofs')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('proofs')
            .getPublicUrl(fileName);
          savedProofUrl = publicUrlData.publicUrl;
        } else {
          console.warn('[Supabase Storage Upload Error]:', uploadError);
          savedProofUrl = proofBase64;
        }
      } catch (uploadErr) {
        console.warn('[Upload Proof Exception]:', uploadErr);
        savedProofUrl = proofBase64;
      }
    } else if (proofBase64) {
      savedProofUrl = proofBase64;
    }

    // 1. Look up existing order in Supabase
    let orderToUpdate: any = null;
    let paymentRecord: any = null;

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        let query = supabaseAdmin
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            payments(*)
          `);

        if (isUuid) {
          query = query.eq('id', orderId);
        } else {
          query = query.eq('order_code', orderId);
        }

        const { data: dbOrders, error: findErr } = await query.limit(1);
        if (!findErr && dbOrders && dbOrders.length > 0) {
          orderToUpdate = dbOrders[0];
          const payments = Array.isArray(orderToUpdate.payments) ? orderToUpdate.payments : [];
          paymentRecord = payments.length > 0 ? payments[0] : null;
        }
      } catch (findErr) {
        console.warn('[Supabase Order Lookup Error]:', findErr);
      }
    }

    // 2. Also check in-memory store
    const memOrder = updateOrderStatusInMemory(orderId, newStatus, savedProofUrl);

    // If not found in Supabase and not in memory, return 404
    if (!orderToUpdate && !memOrder) {
      return NextResponse.json(
        { success: false, message: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // 3. Update Supabase order and payment records
    if (orderToUpdate && isSupabaseConfigured && supabaseAdmin) {
      try {
        const updatePayload: Record<string, unknown> = {
          order_status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (memOrder?.queue_number || orderToUpdate.queue_number) {
          updatePayload.queue_number = memOrder?.queue_number || orderToUpdate.queue_number;
        }

        await supabaseAdmin
          .from('orders')
          .update(updatePayload)
          .eq('id', orderToUpdate.id);

        if (['PAID', 'COOKING', 'READY_FOR_DELIVERY', 'COMPLETED'].includes(newStatus) || savedProofUrl) {
          const payPayload: Record<string, unknown> = {
            payment_status: 'SETTLEMENT',
            paid_at: new Date().toISOString(),
          };
          if (savedProofUrl) {
            payPayload.deeplink_url = savedProofUrl;
          }

          if (paymentRecord) {
            await supabaseAdmin
              .from('payments')
              .update(payPayload)
              .eq('id', paymentRecord.id);
          } else {
            await supabaseAdmin.from('payments').insert({
              id: crypto.randomUUID(),
              order_id: orderToUpdate.id,
              gateway_reference_id: `CASH-${orderToUpdate.order_code}`,
              payment_method: orderToUpdate.payment_method || 'CASH',
              payment_status: 'SETTLEMENT',
              gross_amount: orderToUpdate.gross_amount,
              mdr_percentage: 0,
              mdr_fee_amount: 0,
              net_revenue: orderToUpdate.gross_amount,
              deeplink_url: savedProofUrl || null,
              paid_at: new Date().toISOString(),
            });
          }
        }
      } catch (dbErr) {
        console.warn('[Supabase Order Status Update Error]:', dbErr);
      }
    }

    const finalOrder = {
      ...(orderToUpdate || memOrder),
      order_status: newStatus,
      delivery_proof_url: savedProofUrl || orderToUpdate?.delivery_proof_url || memOrder?.delivery_proof_url,
      payment_method: orderToUpdate?.payment_method || paymentRecord?.payment_method || memOrder?.payment_method || 'CASH',
    };

    upsertOrderInMemory(finalOrder, paymentRecord);

    // 4. Trigger WhatsApp notification to customer if status ready
    if (newStatus === 'READY_FOR_DELIVERY') {
      sendOrderReadyNotification(finalOrder).catch((err) =>
        console.error('Failed to send WhatsApp Ready notification:', err)
      );
    }

    // 5. Update Column 10 in Google Sheets when completed
    if (newStatus === 'COMPLETED') {
      const payment = getPaymentByOrderId(finalOrder.id) || paymentRecord;
      const rowNumber = payment?.sheet_row_number || 2;
      updateGoogleSheetOrderStatus(rowNumber, finalOrder.order_code, 'Selesai').catch((err) =>
        console.error('Failed to update Google Sheets order status:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Status pesanan berhasil diperbarui menjadi ${newStatus}`,
      order: finalOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = body.password || req.headers.get('x-admin-password');

    if (password !== getAdminPassword()) {
      return NextResponse.json(
        { success: false, message: 'Password admin tidak valid untuk menghapus pesanan.' },
        { status: 403 }
      );
    }

    clearAllOrdersInMemory();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabaseAdmin.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (dbErr) {
        console.warn('[Supabase Bulk Delete Error]:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seluruh data pesanan uji coba berhasil dibersihkan.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

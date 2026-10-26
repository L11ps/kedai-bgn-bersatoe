import { NextResponse } from 'next/server';
import {
  getAllOrders,
  updateOrderStatusInMemory,
  getPaymentByOrderId,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { updateGoogleSheetOrderStatus } from '@/lib/google-sheets';
import { sendOrderReadyNotification } from '@/lib/whatsapp';
import { OrderStatus } from '@/types';

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
          return NextResponse.json({ success: true, orders: dbOrders });
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
    const { orderId, newStatus } = await req.json();

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

    const order = updateOrderStatusInMemory(orderId, newStatus);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('orders')
          .update({ order_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', order.id);
      } catch (dbErr) {
        console.warn('[Supabase Order Status Update Error]:', dbErr);
      }
    }

    // Trigger WhatsApp notification to customer if status ready
    if (newStatus === 'READY_FOR_DELIVERY') {
      sendOrderReadyNotification(order).catch((err) =>
        console.error('Failed to send WhatsApp Ready notification:', err)
      );
    }

    // Update Column 10 in Google Sheets when completed
    if (newStatus === 'COMPLETED') {
      const payment = getPaymentByOrderId(order.id);
      const rowNumber = payment?.sheet_row_number || 2;
      updateGoogleSheetOrderStatus(rowNumber, order.order_code, 'Selesai').catch((err) =>
        console.error('Failed to update Google Sheets order status:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

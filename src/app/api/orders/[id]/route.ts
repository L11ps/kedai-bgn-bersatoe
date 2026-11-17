import { NextResponse } from 'next/server';
import {
  getOrderByIdOrCode,
  getPaymentByOrderId,
  upsertOrderInMemory,
  deleteOrderInMemory,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { getAdminPassword } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let order = getOrderByIdOrCode(id);

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabaseAdmin
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            payments(*)
          `);

        if (isUuid) {
          query = query.eq('id', id);
        } else {
          query = query.eq('order_code', id);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          order = data;
        }
      } catch (dbErr) {
        console.warn('[Supabase Single Order Error]:', dbErr);
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    const payment = getPaymentByOrderId(order.id) || order.payments?.[0];
    const paymentMethod = (order.payment_method as string) || payment?.payment_method || 'CASH';
    const proofUrl =
      order.delivery_proof_url ||
      (payment?.deeplink_url && (payment.deeplink_url.startsWith('http') || payment.deeplink_url.startsWith('data:'))
        ? payment.deeplink_url
        : null);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        payment_method: paymentMethod,
        delivery_proof_url: proofUrl,
        payment,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.order) {
      upsertOrderInMemory(body.order, body.payment);
      return NextResponse.json({ success: true, message: 'Order synchronized' });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid payload' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const password = body.password || req.headers.get('x-admin-password');

    // Strict validation for admin password
    if (password !== getAdminPassword()) {
      return NextResponse.json(
        { success: false, message: 'Password admin tidak valid untuk menghapus pesanan.' },
        { status: 403 }
      );
    }

    // 1. Delete from in-memory store
    deleteOrderInMemory(id);

    // 2. Delete from Supabase if active
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let targetOrderId = id;
        if (!isUuid) {
          const { data: found } = await supabaseAdmin
            .from('orders')
            .select('id')
            .eq('order_code', id)
            .limit(1);
          if (found && found.length > 0) {
            targetOrderId = found[0].id;
          }
        }

        await supabaseAdmin.from('payments').delete().eq('order_id', targetOrderId);
        await supabaseAdmin.from('order_items').delete().eq('order_id', targetOrderId);
        await supabaseAdmin.from('orders').delete().eq('id', targetOrderId);
      } catch (dbErr) {
        console.warn('[Supabase Order Delete Error]:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pesanan ${id} berhasil dihapus permanen.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

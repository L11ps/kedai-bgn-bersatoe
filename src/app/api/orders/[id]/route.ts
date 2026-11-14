import { NextResponse } from 'next/server';
import {
  getOrderByIdOrCode,
  getPaymentByOrderId,
  upsertOrderInMemory,
  deleteOrderInMemory,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let order = getOrderByIdOrCode(id);

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            payments(*)
          `)
          .or(`id.eq.${id},order_code.eq.${id}`)
          .single();

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

    return NextResponse.json({
      success: true,
      order: {
        ...order,
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

    // Strict validation for admin password "bgnsukses777"
    if (password !== 'bgnsukses777') {
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
        await supabaseAdmin.from('payments').delete().or(`order_id.eq.${id}`);
        await supabaseAdmin.from('order_items').delete().or(`order_id.eq.${id}`);
        await supabaseAdmin.from('orders').delete().or(`id.eq.${id},order_code.eq.${id}`);
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

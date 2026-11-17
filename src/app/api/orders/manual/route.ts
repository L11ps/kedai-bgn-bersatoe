import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { ADMIN_COOKIE_NAME, isValidSession } from '@/lib/auth';
import { getProducts, upsertOrderInMemory } from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { appendToGoogleSheet, formatIDR, formatWIB, formatTo62Phone } from '@/lib/google-sheets';
import { Order, OrderItem, Payment } from '@/types';

export const dynamic = 'force-dynamic';

interface ManualOrderItemInput {
  product_id: string;
  quantity: number;
  selected_options?: Record<string, string>;
  special_notes?: string;
}

interface ManualOrderRequest {
  transaction_date: string; // Format YYYY-MM-DD
  transaction_time?: string; // Format "12:00 WIB"
  campus_location: 'Kampus B Halimun' | 'Kampus C Minangkabau';
  location_notes?: string;
  customer_name?: string;
  customer_whatsapp?: string;
  payment_method: 'CASH' | 'QRIS';
  items: ManualOrderItemInput[];
}

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Autentikasi Admin
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const isAuth = await isValidSession(token);

    if (!isAuth) {
      return NextResponse.json(
        { success: false, message: 'Sesi admin tidak valid. Silakan login kembali.' },
        { status: 401 }
      );
    }

    // 2. Parse Body Request
    const body: ManualOrderRequest = await req.json();

    if (!body.transaction_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.transaction_date)) {
      return NextResponse.json(
        { success: false, message: 'Format tanggal transaksi harus YYYY-MM-DD (contoh: 2026-11-16).' },
        { status: 400 }
      );
    }

    const validCampuses = ['Kampus B Halimun', 'Kampus C Minangkabau'];
    if (!validCampuses.includes(body.campus_location)) {
      return NextResponse.json(
        { success: false, message: 'Pilih lokasi kampus yang valid.' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pilih minimal satu menu pesanan.' },
        { status: 400 }
      );
    }

    // 3. Validasi Menu & Hitung Total Harga
    const allProducts = getProducts();
    let totalGrossAmount = 0;
    const validatedItems: OrderItem[] = [];

    const orderId = crypto.randomUUID();

    for (const itemInput of body.items) {
      if (!itemInput.quantity || itemInput.quantity <= 0) continue;
      const product = allProducts.find((p) => p.id === itemInput.product_id);
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Menu dengan ID ${itemInput.product_id} tidak ditemukan.` },
          { status: 404 }
        );
      }

      const qty = Math.min(Math.max(1, itemInput.quantity), 100);
      const subtotal = product.price * qty;
      totalGrossAmount += subtotal;

      validatedItems.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: qty,
        selected_options: itemInput.selected_options || {},
        special_notes: itemInput.special_notes || 'Penjualan Langsung OTS / Manual',
        subtotal,
      });
    }

    if (validatedItems.length === 0 || totalGrossAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Jumlah porsi menu minimal 1 porsi.' },
        { status: 400 }
      );
    }

    // 4. Format Tanggal Indonesia & Waktu Jadwal
    const [yearStr, monthStr, dayStr] = body.transaction_date.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);

    const dateObj = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0);
    const indoDateLabel = dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const timeLabel = (body.transaction_time || '12:00 WIB').trim();
    const scheduledTime = `${indoDateLabel} pukul ${timeLabel}`;
    const dateCodePart = `${yearStr}${monthStr}${dayStr}`;

    // 5. Generate Order Code & Queue Number Khusus OTS
    let otsSeq = 1;
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { count } = await supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .like('order_code', `BGN-OTS-${dateCodePart}-%`);
        otsSeq = (count || 0) + 1;
      } catch (countErr) {
        console.warn('[Count OTS Orders Error]:', countErr);
        otsSeq = Math.floor(100 + Math.random() * 900);
      }
    }

    const assignedOrderCode = `BGN-OTS-${dateCodePart}-${String(otsSeq).padStart(3, '0')}`;
    const assignedQueueNumber = `OTS-${String(otsSeq).padStart(2, '0')}`;

    const paymentMethod = body.payment_method === 'QRIS' ? 'QRIS' : 'CASH';
    const createdAtIso = dateObj.toISOString();

    const newOrder: Order = {
      id: orderId,
      order_code: assignedOrderCode,
      customer_name: (body.customer_name || '').trim() || 'Pembeli Langsung (OTS)',
      customer_whatsapp: (body.customer_whatsapp || '').trim() || '080000000000',
      order_type: 'READY',
      fulfillment_type: 'DELIVERY',
      campus_location: body.campus_location,
      location_notes: (body.location_notes || '').trim() || 'Penjualan Langsung di Tempat (OTS)',
      order_notes: 'Pesanan manual diinput oleh admin.',
      scheduled_time: scheduledTime,
      gross_amount: totalGrossAmount,
      order_status: 'COMPLETED',
      queue_number: assignedQueueNumber,
      items: validatedItems,
      payment_method: paymentMethod,
      created_at: createdAtIso,
      updated_at: new Date().toISOString(),
    };

    const paymentId = crypto.randomUUID();
    const newPayment: Payment = {
      id: paymentId,
      order_id: orderId,
      gateway_reference_id: `MANUAL-${Date.now()}`,
      payment_method: paymentMethod,
      payment_status: 'SETTLEMENT',
      gross_amount: totalGrossAmount,
      mdr_percentage: 0,
      mdr_fee_amount: 0,
      net_revenue: totalGrossAmount,
      paid_at: createdAtIso,
      created_at: createdAtIso,
    };

    newOrder.payments = [newPayment];

    // 6. Simpan ke Supabase jika tersedia
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error: insOrderErr } = await supabaseAdmin.from('orders').insert({
          id: newOrder.id,
          order_code: newOrder.order_code,
          customer_name: newOrder.customer_name,
          customer_whatsapp: newOrder.customer_whatsapp,
          fulfillment_type: newOrder.fulfillment_type,
          campus_location: newOrder.campus_location,
          location_notes: newOrder.location_notes,
          scheduled_time: newOrder.scheduled_time,
          gross_amount: newOrder.gross_amount,
          order_status: newOrder.order_status,
          queue_number: newOrder.queue_number,
          created_at: newOrder.created_at,
        });

        if (insOrderErr) {
          console.error('[Supabase Insert Manual Order Error]:', insOrderErr);
          return NextResponse.json(
            { success: false, message: `Gagal menyimpan ke database Supabase: ${insOrderErr.message}` },
            { status: 500 }
          );
        }

        const itemsToInsert = validatedItems.map((it) => ({
          id: crypto.randomUUID(),
          order_id: newOrder.id,
          product_id: null,
          product_name: it.product_name,
          unit_price: it.unit_price,
          quantity: it.quantity,
          selected_options: it.selected_options || {},
          special_notes: it.special_notes || 'OTS',
          subtotal: it.subtotal,
        }));

        const { error: insItemsErr } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
        if (insItemsErr) {
          console.error('[Supabase Insert Items Error]:', insItemsErr);
        }

        const { error: insPayErr } = await supabaseAdmin.from('payments').insert({
          id: newPayment.id,
          order_id: newOrder.id,
          gateway_reference_id: newPayment.gateway_reference_id,
          payment_method: newPayment.payment_method,
          payment_status: 'SETTLEMENT',
          gross_amount: newPayment.gross_amount,
          mdr_percentage: 0,
          mdr_fee_amount: 0,
          net_revenue: newPayment.net_revenue,
          paid_at: newPayment.paid_at,
        });
        if (insPayErr) {
          console.error('[Supabase Insert Payment Error]:', insPayErr);
        }
      } catch (dbErr) {
        console.error('[Supabase Insert Exception]:', dbErr);
        return NextResponse.json(
          { success: false, message: 'Terjadi kegagalan komunikasi dengan database Supabase.' },
          { status: 500 }
        );
      }
    }

    // 7. Simpan ke in-memory store
    upsertOrderInMemory(newOrder, newPayment);

    // 8. Sinkronisasi ke Google Sheets secara background jika tersedia
    try {
      const itemsSummary = validatedItems
        .map((it) => {
          const optStr =
            it.selected_options && Object.keys(it.selected_options).length > 0
              ? ` (${Object.values(it.selected_options).join(', ')})`
              : '';
          return `${it.quantity}x ${it.product_name}${optStr}`;
        })
        .join('; ');

      const sheetRowData = {
        transaction_id: newOrder.order_code,
        timestamp_wib: formatWIB(newOrder.created_at),
        customer_name: newOrder.customer_name,
        contact: formatTo62Phone(newOrder.customer_whatsapp),
        items_summary: itemsSummary,
        gross_amount_formatted: formatIDR(newOrder.gross_amount),
        payment_method: paymentMethod === 'CASH' ? 'CASH (Tunai di Tempat OTS)' : 'QRIS (OTS)',
        mdr_fee_formatted: formatIDR(0),
        net_revenue_formatted: formatIDR(newOrder.gross_amount),
        order_status: 'Selesai (Lunas Langsung)',
      };

      await appendToGoogleSheet(sheetRowData);
    } catch (sheetErr) {
      console.warn('[Manual Order Sheet Sync Error]:', sheetErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan manual berhasil dicatat dan masuk ke rekapitulasi keuangan.',
      order: newOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Manual Order Route Exception]:', err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
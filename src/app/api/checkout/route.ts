import { NextResponse } from 'next/server';
import { CheckoutPayload } from '@/types';
import { getProducts, createOrderInMemory, getPaymentByOrderId, getAllOrders } from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { appendToGoogleSheet, formatIDR, formatWIB, formatTo62Phone } from '@/lib/google-sheets';
import { sendOrderPaidNotification, sendOperationalGroupSummary } from '@/lib/whatsapp';

async function getNextOrderSequence(dateStr: string): Promise<number> {
  let maxSeq = 0;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data: todayOrders } = await supabaseAdmin
        .from('orders')
        .select('order_code')
        .ilike('order_code', `BGN-${dateStr}-%`);

      if (todayOrders && todayOrders.length > 0) {
        for (const ord of todayOrders) {
          const m = ord.order_code?.match(/(\d+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxSeq) maxSeq = num;
          }
        }
      }
    } catch (err) {
      console.warn('[Get Next Order Sequence Error]:', err);
    }
  }

  // Also verify against in-memory orders
  const memOrders = getAllOrders();
  for (const ord of memOrders) {
    if (ord.order_code?.startsWith(`BGN-${dateStr}-`)) {
      const m = ord.order_code.match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }

  return maxSeq + 1;
}

export async function POST(req: Request) {
  try {
    const body: CheckoutPayload = await req.json();

    // 1. Validation: Customer Name (min 3 chars)
    if (!body.customer_name || body.customer_name.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'Nama pemesan wajib diisi minimal 3 karakter.' },
        { status: 400 }
      );
    }

    // 2. Validation: WhatsApp Indonesian format (08xx or 628xx)
    const phoneClean = body.customer_whatsapp ? body.customer_whatsapp.replace(/\s+/g, '') : '';
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    if (!phoneRegex.test(phoneClean)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nomor WhatsApp tidak valid. Masukkan nomor WhatsApp Indonesia (contoh: 08123456789 atau 628123456789).',
        },
        { status: 400 }
      );
    }

    // 3. Validation: Campus Location (Halimun & Minangkabau)
    const validCampuses = ['Kampus B Halimun', 'Kampus C Minangkabau'];
    if (!validCampuses.includes(body.campus_location)) {
      return NextResponse.json(
        { success: false, message: 'Pilih lokasi kampus yang valid (Kampus Halimun atau Kampus Minangkabau).' },
        { status: 400 }
      );
    }

    if (!body.location_notes || body.location_notes.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: 'Detail titik temu / ruangan di kampus wajib diisi minimal 3 karakter.',
        },
        { status: 400 }
      );
    }

    // 4. Validation: Scheduled Time / Delivery Date & Slot
    if (!body.scheduled_time) {
      return NextResponse.json(
        { success: false, message: 'Pilih jadwal tanggal dan jam pengantaran pesanan.' },
        { status: 400 }
      );
    }

    // 5. Validation: Cart Items
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Keranjang belanja kosong.' },
        { status: 400 }
      );
    }

    // 6. SERVER-SIDE PRICE CALCULATION
    const currentProducts = getProducts();
    let serverGrossAmount = 0;
    const validatedCartItems = [];

    for (const item of body.items) {
      const prod = currentProducts.find((p) => p.id === item.product_id);
      if (!prod) {
        return NextResponse.json(
          { success: false, message: `Produk dengan ID ${item.product_id} tidak ditemukan.` },
          { status: 404 }
        );
      }

      if (!prod.is_available) {
        return NextResponse.json(
          { success: false, message: `Menu "${prod.name}" sedang tidak tersedia.` },
          { status: 400 }
        );
      }

      const itemQty = Math.max(1, Math.min(item.quantity, 50));
      const itemSubtotal = prod.price * itemQty;
      serverGrossAmount += itemSubtotal;

      validatedCartItems.push({
        id: 'ci-' + Math.random().toString(36).substring(2, 9),
        product_id: prod.id,
        name: prod.name,
        price: prod.price,
        image_url: prod.image_url,
        quantity: itemQty,
        selected_options: {},
        special_notes: (item.special_notes || '').slice(0, 100),
      });
    }

    // 7. Payment Method Handling (QRIS vs CASH)
    const paymentMethod = body.payment_method === 'CASH' ? 'CASH' : 'QRIS';
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 15 * 60 * 1000);
    const expiryIso = expiryDate.toISOString();

    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const year = jakartaTime.getFullYear();
    const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
    const day = String(jakartaTime.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const seqNum = await getNextOrderSequence(dateStr);
    const assignedOrderCode = `BGN-${dateStr}-${String(seqNum % 10000).padStart(4, '0')}`;
    const assignedQueueNumber = `A-${String(seqNum % 1000).padStart(3, '0')}`;

    let redirectUrl: string | undefined = undefined;
    let snapToken: string | undefined = undefined;

    // 8. Static QRIS Payment Handling (Midtrans di-hold sementara proses pengajuan)
    if (paymentMethod === 'QRIS') {
      redirectUrl = '/images/qris-statis.jpeg';
    }

    // 9. Create Order in Memory Store
    const { order, payment } = createOrderInMemory({
      customer_name: body.customer_name.trim(),
      customer_whatsapp: phoneClean,
      order_type: 'PO',
      campus_location: body.campus_location,
      location_notes: body.location_notes.trim(),
      order_notes: body.order_notes?.trim() || undefined,
      scheduled_time: body.scheduled_time,
      payment_method: paymentMethod,
      items: validatedCartItems,
      gross_amount: serverGrossAmount,
      redirect_url: redirectUrl,
      expiry_time: expiryIso,
      order_code: assignedOrderCode,
      queue_number: assignedQueueNumber,
    });

    // 10. Persist to Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error: insErr } = await supabaseAdmin.from('orders').insert({
          id: order.id,
          order_code: order.order_code,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
          fulfillment_type: 'DELIVERY',
          campus_location: order.campus_location,
          location_notes: order.location_notes,
          scheduled_time: order.scheduled_time,
          gross_amount: order.gross_amount,
          order_status: order.order_status,
          queue_number: order.queue_number,
        });

        if (insErr && insErr.code === '23505') {
          // If collision occurs, increment sequence and retry
          const retrySeq = seqNum + 1;
          const retryOrderCode = `BGN-${dateStr}-${String(retrySeq % 10000).padStart(4, '0')}`;
          const retryQueueNumber = `A-${String(retrySeq % 1000).padStart(3, '0')}`;
          order.order_code = retryOrderCode;
          order.queue_number = retryQueueNumber;
          await supabaseAdmin.from('orders').insert({
            id: order.id,
            order_code: retryOrderCode,
            customer_name: order.customer_name,
            customer_whatsapp: order.customer_whatsapp,
            fulfillment_type: 'DELIVERY',
            campus_location: order.campus_location,
            location_notes: order.location_notes,
            scheduled_time: order.scheduled_time,
            gross_amount: order.gross_amount,
            order_status: order.order_status,
            queue_number: retryQueueNumber,
          });
        }

        // Insert order_items
        if (order.items && order.items.length > 0) {
          const orderItemsToInsert = order.items.map((it) => ({
            order_id: order.id,
            product_id: null,
            product_name: it.product_name,
            unit_price: it.unit_price,
            quantity: it.quantity,
            selected_options: it.selected_options || {},
            special_notes: it.special_notes || '',
            subtotal: it.subtotal,
          }));
          await supabaseAdmin.from('order_items').insert(orderItemsToInsert);
        }

        // Insert payments
        const paymentRecord = getPaymentByOrderId(order.id);
        if (paymentRecord) {
          await supabaseAdmin.from('payments').insert({
            id: paymentRecord.id,
            order_id: order.id,
            gateway_reference_id: paymentRecord.gateway_reference_id,
            payment_method: paymentRecord.payment_method,
            payment_status: paymentRecord.payment_status,
            gross_amount: paymentRecord.gross_amount,
            mdr_percentage: paymentRecord.mdr_percentage,
            mdr_fee_amount: paymentRecord.mdr_fee_amount,
            net_revenue: paymentRecord.net_revenue,
            qr_string: paymentRecord.qr_string || null,
            deeplink_url: paymentRecord.deeplink_url || null,
            expiry_time: paymentRecord.expiry_time || null,
            paid_at: paymentRecord.paid_at || null,
          });
        }
      } catch (dbErr) {
        console.warn('[Supabase Insert Error]:', dbErr);
      }
    }

    // 11. Auto-sync to Google Sheets and notify WhatsApp group
    const itemsSummary = validatedCartItems
      .map((it) => `${it.quantity}x ${it.name}`)
      .join('; ');

    const sheetRowData = {
      transaction_id: order.order_code,
      timestamp_wib: formatWIB(new Date().toISOString()),
      customer_name: order.customer_name,
      contact: formatTo62Phone(order.customer_whatsapp),
      items_summary: itemsSummary,
      gross_amount_formatted: formatIDR(order.gross_amount),
      payment_method: paymentMethod === 'CASH' ? 'CASH (Tunai di Tempat)' : 'QRIS (Statis - Menunggu Konfirmasi WA)',
      mdr_fee_formatted: formatIDR(0),
      net_revenue_formatted: formatIDR(order.gross_amount),
      order_status: paymentMethod === 'CASH' ? 'Menunggu Pengantaran (CASH)' : 'Menunggu Verifikasi Pembayaran (QRIS)',
    };

    appendToGoogleSheet(sheetRowData).catch((err) =>
      console.error('[Google Sheet Sync Error]:', err)
    );

    if (paymentMethod === 'CASH') {
      sendOrderPaidNotification(order).catch((err) =>
        console.error('[WhatsApp Notification Error (CASH)]:', err)
      );
    }

    sendOperationalGroupSummary(order).catch((err) =>
      console.error('[WhatsApp Group Error]:', err)
    );

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_code: order.order_code,
      queue_number: order.queue_number,
      gross_amount: serverGrossAmount,
      payment_method: paymentMethod,
      redirect_url: redirectUrl,
      snap_token: snapToken,
      expiry_time: expiryIso,
      order,
      payment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Checkout Error:', err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

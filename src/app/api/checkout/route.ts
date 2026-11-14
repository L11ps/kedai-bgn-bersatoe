import { NextResponse } from 'next/server';
import { CheckoutPayload } from '@/types';
import { getProducts, createOrderInMemory } from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { appendToGoogleSheet, formatIDR, formatWIB, formatTo62Phone } from '@/lib/google-sheets';
import { sendOrderPaidNotification, sendOperationalGroupSummary } from '@/lib/whatsapp';

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

    let redirectUrl: string | undefined = undefined;
    let snapToken: string | undefined = undefined;

    // 8. If QRIS, Call Real Midtrans Snap API
    if (paymentMethod === 'QRIS') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY || 'Mid-server-4RfU8KEF~CpMJ_FH0NdS-RR5';
      const isProduction = !serverKey.startsWith('SB-');
      const snapEndpoint = isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

      const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
      const tempOrderCode = `BGN-${Date.now()}`;

      try {
        const midtransRes = await fetch(snapEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: tempOrderCode,
              gross_amount: serverGrossAmount,
            },
            customer_details: {
              first_name: body.customer_name.trim(),
              phone: phoneClean,
            },
            item_details: validatedCartItems.map((it) => ({
              id: it.product_id,
              price: it.price,
              quantity: it.quantity,
              name: it.name.slice(0, 50),
            })),
            enabled_payments: ['qris'],
          }),
        });

        const midtransData = await midtransRes.json();
        if (midtransRes.ok && midtransData.token) {
          snapToken = midtransData.token;
          redirectUrl = midtransData.redirect_url;
        } else {
          console.warn('[Midtrans API Warning]:', midtransData);
        }
      } catch (midtransErr) {
        console.error('[Midtrans API Error]:', midtransErr);
      }
    }

    // 9. Create Order in Memory Store
    const { order, payment } = createOrderInMemory({
      customer_name: body.customer_name.trim(),
      customer_whatsapp: phoneClean,
      order_type: 'PO',
      campus_location: body.campus_location,
      location_notes: body.location_notes.trim(),
      scheduled_time: body.scheduled_time,
      payment_method: paymentMethod,
      items: validatedCartItems,
      gross_amount: serverGrossAmount,
      redirect_url: redirectUrl,
      expiry_time: expiryIso,
    });

    // 10. Persist to Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('orders').insert({
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
      } catch (dbErr) {
        console.warn('[Supabase Insert Error]:', dbErr);
      }
    }

    // 11. If CASH, auto-sync to Google Sheets and notify WhatsApp immediately
    if (paymentMethod === 'CASH') {
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
        payment_method: 'CASH (Tunai di Tempat)',
        mdr_fee_formatted: formatIDR(0),
        net_revenue_formatted: formatIDR(order.gross_amount),
        order_status: 'Menunggu Pengantaran (CASH)',
      };

      appendToGoogleSheet(sheetRowData).catch((err) =>
        console.error('[Google Sheet Sync Error (CASH)]:', err)
      );

      sendOrderPaidNotification(order).catch((err) =>
        console.error('[WhatsApp Notification Error (CASH)]:', err)
      );

      sendOperationalGroupSummary(order).catch((err) =>
        console.error('[WhatsApp Group Error (CASH)]:', err)
      );
    }

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

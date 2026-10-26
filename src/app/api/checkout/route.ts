import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { CheckoutPayload } from '@/types';
import { getProducts, createOrderInMemory, getProductStockForCampus } from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

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

    // 3. Validation: Campus Location & Location Notes
    const validCampuses = ['Kampus B Halimun', 'Kampus C Minangkabau', 'Kampus SB Daan Mogot'];
    if (!validCampuses.includes(body.campus_location)) {
      return NextResponse.json(
        { success: false, message: 'Pilih lokasi kampus yang valid.' },
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

    // 4. Validation: Scheduled Time
    if (!body.scheduled_time) {
      return NextResponse.json(
        { success: false, message: 'Pilih jam pengantaran / pengambilan pesanan.' },
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

    // 6. SERVER-SIDE STOCK & PRICE CALCULATION
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

      // Check stock based on order_type
      if (body.order_type === 'READY') {
        const availableStock = getProductStockForCampus(prod, body.campus_location);
        if (availableStock <= 0) {
          return NextResponse.json(
            {
              success: false,
              message: `Menu "${prod.name}" sudah habis hari ini di ${body.campus_location}. Silakan pesan untuk Pre-Order Besok.`,
            },
            { status: 400 }
          );
        }
        if (item.quantity > availableStock) {
          return NextResponse.json(
            {
              success: false,
              message: `Stok "${prod.name}" di ${body.campus_location} hanya tersisa ${availableStock} porsi.`,
            },
            { status: 400 }
          );
        }
      } else if (body.order_type === 'PO') {
        if (!prod.po_available) {
          return NextResponse.json(
            {
              success: false,
              message: `Menu "${prod.name}" sedang tidak menerima Pre-Order Besok.`,
            },
            { status: 400 }
          );
        }
      }

      // Check required variants
      for (const variant of prod.variants) {
        if (variant.is_required && !item.selected_options?.[variant.group_name]) {
          return NextResponse.json(
            {
              success: false,
              message: `Opsi wajib "${variant.group_name}" untuk ${prod.name} belum dipilih.`,
            },
            { status: 400 }
          );
        }
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
        selected_options: item.selected_options || {},
        special_notes: (item.special_notes || '').slice(0, 100),
      });
    }

    // 7. Expiry time: 15 minutes from now
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 15 * 60 * 1000);
    const expiryIso = expiryDate.toISOString();

    // 8. Generate Dynamic QRIS string & QR data URL
    const qrisPayload = `00020101021226670014ID.LINKAJA.WWW011893600911002160912302150000000000000000303UME51440014ID.CO.QRIS.WWW0215ID10200216091230303UME52045812530336054${String(
      serverGrossAmount
    ).length.toString().padStart(2, '0')}${serverGrossAmount}5802ID5919KEDAI BGN BERSATOE6007JAKARTA61051174062240120BGN${Date.now()}6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrisPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Error generating QR code image:', err);
    }

    // 9. Create Order in Memory Store (reduces campus stock if READY)
    const { order } = createOrderInMemory({
      customer_name: body.customer_name.trim(),
      customer_whatsapp: phoneClean,
      order_type: body.order_type,
      campus_location: body.campus_location,
      location_notes: body.location_notes.trim(),
      scheduled_time: body.scheduled_time,
      payment_method: 'QRIS',
      items: validatedCartItems,
      gross_amount: serverGrossAmount,
      qr_string: qrisPayload,
      expiry_time: expiryIso,
    });

    // 10. Persist to Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error: orderErr } = await supabaseAdmin.from('orders').insert({
          id: order.id,
          order_code: order.order_code,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
          fulfillment_type: 'DELIVERY',
          campus_location: order.campus_location,
          location_notes: order.location_notes,
          scheduled_time: order.scheduled_time,
          gross_amount: order.gross_amount,
          order_status: 'WAITING_PAYMENT',
        });
        if (orderErr) {
          console.error('[Supabase Order Insert Error]:', orderErr);
        }
      } catch (dbErr) {
        console.warn('[Supabase Insert Error]:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_code: order.order_code,
      gross_amount: serverGrossAmount,
      payment_method: 'QRIS',
      qr_string: qrisPayload,
      qr_data_url: qrDataUrl,
      expiry_time: expiryIso,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Checkout Error:', err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

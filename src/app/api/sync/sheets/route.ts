import { NextResponse } from 'next/server';
import { getSheetSyncLogs, appendToGoogleSheet, formatIDR, formatWIB, formatTo62Phone } from '@/lib/google-sheets';
import { getOrderByIdOrCode } from '@/lib/order-store';

export async function GET() {
  try {
    const logs = getSheetSyncLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { orderCode } = await req.json();
    if (!orderCode) {
      return NextResponse.json(
        { success: false, message: 'Missing orderCode' },
        { status: 400 }
      );
    }

    const order = getOrderByIdOrCode(orderCode);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const itemsSummary = (order.items || [])
      .map((it) => `${it.quantity}x ${it.product_name}`)
      .join('; ');

    const payment = order.payments?.[0];
    const mdrFee = payment ? payment.mdr_fee_amount : 0;
    const netRev = payment ? payment.net_revenue : order.gross_amount;

    const rowData = {
      transaction_id: order.order_code,
      timestamp_wib: formatWIB(order.created_at),
      customer_name: order.customer_name,
      contact: formatTo62Phone(order.customer_whatsapp),
      items_summary: itemsSummary,
      gross_amount_formatted: formatIDR(order.gross_amount),
      payment_method: payment ? payment.payment_method : 'QRIS',
      mdr_fee_formatted: formatIDR(mdrFee),
      net_revenue_formatted: formatIDR(netRev),
      order_status: order.order_status === 'COMPLETED' ? 'Selesai' : 'Menunggu Diproses',
    };

    const res = await appendToGoogleSheet(rowData);
    return NextResponse.json({
      success: true,
      message: 'Sheet sync retry executed',
      result: res,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

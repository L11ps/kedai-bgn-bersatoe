import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId, status = 'settlement', paymentMethod = 'QRIS' } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Call internal webhook handler directly
    const webhookUrl = new URL('/api/webhooks/payment', req.url);
    const webhookRes = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        status_code: '200',
        transaction_status: status,
        payment_type: paymentMethod,
        transaction_id: `SIM-${Date.now()}`,
      }),
    });

    const data = await webhookRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

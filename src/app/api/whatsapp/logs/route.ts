import { NextResponse } from 'next/server';
import { getWhatsAppLogs } from '@/lib/whatsapp';

export async function GET() {
  try {
    const logs = getWhatsAppLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

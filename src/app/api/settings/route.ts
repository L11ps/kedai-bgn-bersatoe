import { NextResponse } from 'next/server';
import {
  getOperationalSettings,
  updateOperationalSettings,
  getAvailableDeliveryDates,
} from '@/lib/order-store';

export async function GET() {
  try {
    const settings = getOperationalSettings();
    const availableDates = getAvailableDeliveryDates(7);
    return NextResponse.json({
      success: true,
      settings,
      availableDates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = updateOperationalSettings(body);
    const availableDates = getAvailableDeliveryDates(7);

    return NextResponse.json({
      success: true,
      message: 'Pengaturan operasional berhasil diperbarui',
      settings: updated,
      availableDates,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

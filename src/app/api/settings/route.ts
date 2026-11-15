import { NextResponse } from 'next/server';
import {
  getOperationalSettings,
  updateOperationalSettings,
  getAvailableDeliveryDates,
} from '@/lib/order-store';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch remote settings from Supabase Storage if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('proofs')
          .download('settings.json');
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            updateOperationalSettings(parsed);
          }
        }
      } catch (remoteErr) {
        console.warn('[Settings Remote Load Error]:', remoteErr);
      }
    }

    const settings = getOperationalSettings();
    const availableDates = getAvailableDeliveryDates(7);
    return NextResponse.json(
      {
        success: true,
        settings,
        availableDates,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
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

    // Persist to Supabase Storage if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.storage
          .from('proofs')
          .upload('settings.json', JSON.stringify(updated), {
            contentType: 'application/json',
            upsert: true,
          });
      } catch (uploadErr) {
        console.warn('[Settings Remote Save Error]:', uploadErr);
      }
    }

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

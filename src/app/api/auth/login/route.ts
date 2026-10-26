import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE_NAME,
  getAdminPassword,
  generateSessionToken,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputPassword = typeof body.password === 'string' ? body.password.trim() : '';

    const adminPassword = getAdminPassword();

    if (!inputPassword || inputPassword !== adminPassword) {
      return NextResponse.json(
        { success: false, message: 'Password admin tidak valid.' },
        { status: 401 }
      );
    }

    const token = await generateSessionToken(adminPassword);
    const cookieStore = await cookies();

    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      message: 'Autentikasi berhasil.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

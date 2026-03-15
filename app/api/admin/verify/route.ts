import { NextResponse } from 'next/server';
import { getAdminPassword, createSessionToken, SESSION_COOKIE, SESSION_DURATION } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminPassword = await getAdminPassword();

    if (!adminPassword) {
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_PASSWORD not set' }, { status: 500 });
    }

    if (body.password !== adminPassword) {
      return NextResponse.json({ valid: false }, { status: 403 });
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ valid: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

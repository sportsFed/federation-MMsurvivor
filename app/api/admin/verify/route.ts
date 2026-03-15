import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_PASSWORD not set' }, { status: 500 });
    }

    if (body.password !== adminPassword) {
      return NextResponse.json({ valid: false }, { status: 403 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

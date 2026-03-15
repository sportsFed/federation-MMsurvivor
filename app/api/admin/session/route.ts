import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const valid = await validateAdminSession(request);
  if (!valid) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}

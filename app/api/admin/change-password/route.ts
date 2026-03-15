import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateAdminSession, getAdminPassword } from '@/lib/adminAuth';
import { db } from '@/lib/firebase/adminApp';

export async function POST(request: NextRequest) {
  if (!(await validateAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing currentPassword or newPassword' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const adminPassword = await getAdminPassword();
    if (currentPassword !== adminPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    await db.collection('config').doc('adminAuth').set({ password: newPassword }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

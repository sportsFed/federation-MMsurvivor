import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

export async function DELETE(request: Request) {
  try {
    const { uid, adminPassword } = await request.json();

    if (adminPassword !== (process.env.ADMIN_PASSWORD ?? 'chone1234')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    await db.collection('entries').doc(uid).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

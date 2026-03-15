import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

export async function POST(request: Request) {
  try {
    const { uid, isTestEntry, adminPassword } = await request.json();

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    await db.collection('entries').doc(uid).update({ isTestEntry: !!isTestEntry });

    return NextResponse.json({ success: true, isTestEntry: !!isTestEntry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

export async function POST(request: Request) {
  try {
    const { uid, adminPassword } = await request.json();

    if (adminPassword !== 'chone1234') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const entryRef = db.collection('entries').doc(uid);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const currentValue = entrySnap.data()?.isEliminated ?? false;
    await entryRef.update({ isEliminated: !currentValue });

    return NextResponse.json({ success: true, isEliminated: !currentValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

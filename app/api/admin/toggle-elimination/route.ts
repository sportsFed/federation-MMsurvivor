import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await request.json();

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

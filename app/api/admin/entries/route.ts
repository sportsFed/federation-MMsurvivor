import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  if (!(await validateAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await db.collection('entries').orderBy('displayName', 'asc').get();
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ entries });
  } catch {
    // Fallback: try without orderBy in case index doesn't exist
    try {
      const snapshot = await db.collection('entries').get();
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ entries });
    } catch (fallbackErr: any) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
    }
  }
}

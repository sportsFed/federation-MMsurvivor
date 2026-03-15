import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, newName } = await request.json();

    if (!teamId || !newName || typeof newName !== 'string' || !newName.trim()) {
      return NextResponse.json({ error: 'Missing or invalid teamId / newName' }, { status: 400 });
    }

    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    await teamRef.update({ name: newName.trim() });

    return NextResponse.json({ success: true, name: newName.trim() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

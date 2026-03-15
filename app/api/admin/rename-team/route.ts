import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

export async function POST(request: Request) {
  try {
    const { teamId, newName, adminPassword } = await request.json();

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

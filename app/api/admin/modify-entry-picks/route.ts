import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  if (!(await validateAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, targetUserId, pickIndex, overridePick } = body as {
    action: 'void_pick' | 'override_pick';
    targetUserId: string;
    pickIndex: number;
    overridePick?: {
      team: string;
      round: string;
      dateKey: string;
      gameId: string;
      isProjectionPick: boolean;
    };
  };

  if (!action || !targetUserId || typeof pickIndex !== 'number') {
    return NextResponse.json({ error: 'Missing required fields: action, targetUserId, pickIndex' }, { status: 400 });
  }
  if (action !== 'void_pick' && action !== 'override_pick') {
    return NextResponse.json({ error: 'action must be void_pick or override_pick' }, { status: 400 });
  }
  if (action === 'override_pick' && !overridePick) {
    return NextResponse.json({ error: 'overridePick is required for override_pick action' }, { status: 400 });
  }

  try {
    const entryRef = db.collection('entries').doc(targetUserId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) {
      return NextResponse.json({ error: `Entry not found for userId: ${targetUserId}` }, { status: 404 });
    }

    const entryData = entrySnap.data() as any;
    const survivorPicks: any[] = entryData.survivorPicks ?? [];

    if (pickIndex < 0 || pickIndex >= survivorPicks.length) {
      return NextResponse.json({ error: `pickIndex ${pickIndex} is out of range (entry has ${survivorPicks.length} picks)` }, { status: 400 });
    }

    const removedPick = survivorPicks[pickIndex];
    const batch = db.batch();

    let updatedPicks: any[];
    let auditAction: string;
    let auditExtra: Record<string, any> = {};

    if (action === 'void_pick') {
      updatedPicks = survivorPicks.filter((_, i) => i !== pickIndex);
      auditAction = 'admin_pick_void';
      auditExtra = { removedPick };
    } else {
      updatedPicks = survivorPicks.map((p, i) => (i === pickIndex ? overridePick : p));
      auditAction = 'admin_pick_override';
      auditExtra = { removedPick, newPick: overridePick };
    }

    batch.update(entryRef, { survivorPicks: updatedPicks });

    const logRef = db.collection('pickLog').doc();
    batch.set(logRef, {
      action: auditAction,
      targetUserId,
      pickIndex,
      timestamp: new Date().toISOString(),
      ...auditExtra,
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('modify-entry-picks error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { getAuth } from 'firebase-admin/auth';

/**
 * DELETE /api/picks/void
 *
 * Removes a pending survivor pick before tip-off.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Body:
 *   - dateKey: string          – Eastern date key of the pick to void (e.g. "__sat__")
 *   - isProjectionPick: boolean
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate via Firebase ID token
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    let displayName: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
      displayName = decoded.name ?? decoded.email ?? '';
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json() as {
      dateKey: string;
      isProjectionPick: boolean;
    };

    const { dateKey, isProjectionPick } = body;

    if (!dateKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Read the entry
    const entryRef = db.collection('entries').doc(uid);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = entrySnap.data() as any;

    if (entry.isEliminated) {
      return NextResponse.json({ error: 'Your entry has been eliminated' }, { status: 409 });
    }

    const existingPicks: any[] = entry.survivorPicks ?? [];

    // 3. Find the matching pick
    const pick = existingPicks.find(
      (p: any) => p.dateKey === dateKey && (p.isProjectionPick ?? false) === (isProjectionPick ?? false)
    );

    if (!pick) {
      return NextResponse.json({ error: 'Pick not found' }, { status: 404 });
    }

    // 4. Lock check — look up the game's tipoff time
    if (pick.gameId) {
      const gameSnap = await db.collection('games').doc(pick.gameId).get();
      const gameData = gameSnap.exists ? (gameSnap.data() as any) : null;
      const gameTime: string | null =
        gameData?.gameTime ?? gameData?.tipoff ?? gameData?.scheduledAt ?? null;

      if (gameTime) {
        const now = new Date();
        if (now >= new Date(gameTime)) {
          return NextResponse.json(
            { error: 'Pick is locked — game has already started' },
            { status: 409 }
          );
        }
      }
    }

    // 5. Build the updated picks array (remove the voided pick)
    const updatedPicks = existingPicks.filter(
      (p: any) =>
        !(p.dateKey === dateKey && (p.isProjectionPick ?? false) === (isProjectionPick ?? false))
    );

    // 6. Atomic batch write
    const batch = db.batch();
    batch.update(entryRef, { survivorPicks: updatedPicks });

    const logRef = db.collection('pickLog').doc();
    batch.set(logRef, {
      userId: uid,
      displayName: entry.displayName ?? displayName,
      dateKey,
      isProjectionPick: isProjectionPick ?? false,
      action: 'voided',
      previousTeam: pick.team,
      timestamp: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({ success: true, action: 'voided' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

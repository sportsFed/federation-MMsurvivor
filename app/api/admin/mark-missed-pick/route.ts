import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

/**
 * Return the Eastern Time date key (e.g. "3/20/2026") for an ISO timestamp.
 */
function getEasternDateKey(isoTime: string): string {
  return new Date(isoTime).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dateKey: string | undefined = body.dateKey;
    const dryRun: boolean = body.dryRun === true;

    if (!dateKey) {
      return NextResponse.json({ error: 'Missing dateKey' }, { status: 400 });
    }

    // Build the set of game IDs for the given Eastern-time date key
    const gamesSnap = await db.collection('games').get();
    const gameIdsForDate = new Set<string>();
    for (const doc of gamesSnap.docs) {
      const gameTime: string | undefined = doc.data().gameTime;
      if (gameTime && getEasternDateKey(gameTime) === dateKey) {
        gameIdsForDate.add(doc.id);
      }
    }

    if (gameIdsForDate.size === 0) {
      return NextResponse.json({ success: false, error: 'No games found for dateKey' });
    }

    // Load only non-eliminated entries — already-eliminated entries are skipped (idempotent)
    const activeSnap = await db
      .collection('entries')
      .where('isEliminated', '==', false)
      .get();

    const toEliminate: Array<{ id: string; displayName: string; consolationPoints: number }> = [];

    for (const entryDoc of activeSnap.docs) {
      const entry = entryDoc.data();
      const survivorPicks: Array<{ gameId?: string }> = entry.survivorPicks ?? [];

      const hasPick = survivorPicks.some(
        (p) => typeof p.gameId === 'string' && gameIdsForDate.has(p.gameId),
      );

      if (!hasPick) {
        toEliminate.push({
          id: entryDoc.id,
          displayName:
            (entry.displayName as string | undefined) ??
            (entry.teamName as string | undefined) ??
            entryDoc.id,
          consolationPoints: (entry.consolationPoints as number | undefined) ?? 0,
        });
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldEliminate: toEliminate.map((e) => e.displayName),
      });
    }

    if (toEliminate.length === 0) {
      return NextResponse.json({ success: true, eliminated: 0, displayNames: [] });
    }

    const now = new Date();
    const batch = db.batch();

    for (const entry of toEliminate) {
      const entryRef = db.collection('entries').doc(entry.id);
      batch.update(entryRef, {
        isEliminated: true,
        eliminationReason: 'missed_pick',
        eliminationDate: dateKey,
        consolationPoints: entry.consolationPoints,
      });

      const logRef = db.collection('pickLog').doc();
      batch.set(logRef, {
        action: 'admin_manual_eliminate_missed_pick',
        userId: entry.id,
        displayName: entry.displayName,
        date: dateKey,
        timestamp: now.toISOString(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      eliminated: toEliminate.length,
      displayNames: toEliminate.map((e) => e.displayName),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

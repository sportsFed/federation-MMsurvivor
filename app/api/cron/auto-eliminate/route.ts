import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

/**
 * Return the Eastern Time date key (e.g. "3/20/2026") for an ISO timestamp.
 */
function getEasternDateKey(isoTime: string): string {
  return new Date(isoTime).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Load all games with a valid gameTime
    const gamesSnap = await db.collection('games').get();
    const allGames = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Group games by Eastern-time date key, tracking the latest tip-off per date
    const dateLatestTipoff = new Map<string, Date>(); // dateKey → latest tipoff Date
    const dateGameIds = new Map<string, Set<string>>(); // dateKey → set of gameIds

    for (const game of allGames) {
      const gameTime: string | null = game.gameTime ?? null;
      if (!gameTime) continue;
      const dateKey = getEasternDateKey(gameTime);
      const tipoff = new Date(gameTime);

      const existing = dateLatestTipoff.get(dateKey);
      if (!existing || tipoff > existing) {
        dateLatestTipoff.set(dateKey, tipoff);
      }

      const gameIds = dateGameIds.get(dateKey) ?? new Set<string>();
      gameIds.add(game.id);
      dateGameIds.set(dateKey, gameIds);
    }

    // 3. For each date where the latest tip-off has passed, eliminate active entries with no pick
    const activeEntriesSnap = await db.collection('entries').where('isEliminated', '==', false).get();

    let eliminated = 0;

    for (const [dateKey, latestTipoff] of dateLatestTipoff.entries()) {
      // Only process dates where the last game of the day has already tipped off
      if (latestTipoff > now) continue;

      const gameIdsForDate = dateGameIds.get(dateKey) ?? new Set<string>();
      if (gameIdsForDate.size === 0) continue;

      const batch = db.batch();
      let batchHasWrites = false;

      for (const entryDoc of activeEntriesSnap.docs) {
        const entry = entryDoc.data() as any;
        const survivorPicks: any[] = entry.survivorPicks ?? [];

        // Check if this entry has at least one pick for a game on this date
        const hasPick = survivorPicks.some((p: any) => p.gameId && gameIdsForDate.has(p.gameId) && p.isProjectionPick !== true);

        if (!hasPick) {
          // Eliminate the entry — missed picks earn seed ÷ 100 consolation; seed is undefined so consolation = 0 by definition
          batch.update(entryDoc.ref, {
            isEliminated: true,
            eliminationReason: 'missed_pick',
            eliminationDate: dateKey,
            consolationPoints: (entry.consolationPoints ?? 0), // preserve existing; consolationPoints field always written for consistent score-final-four reconstruction
          });

          // Write audit log
          const displayName: string = entry.displayName ?? entry.teamName ?? entryDoc.id;
          const logRef = db.collection('pickLog').doc();
          batch.set(logRef, {
            action: 'auto_eliminated_missed_pick',
            userId: entryDoc.id,
            displayName,
            date: dateKey,
            timestamp: now.toISOString(),
          });

          batchHasWrites = true;
          eliminated++;
        }
      }

      if (batchHasWrites) {
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true, eliminated });
  } catch (error) {
    console.error('Auto-eliminate error:', error);
    return NextResponse.json({ success: false, error: 'Auto-eliminate failed' }, { status: 500 });
  }
}

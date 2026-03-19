import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import {
  listFrameworkGamesByRound,
  mapFirestoreGameToBracketKey,
  deriveDayFromGameTime,
} from '@/lib/bracket/framework';
import type { GameDay } from '@/lib/bracket/framework';

/**
 * Shift an ISO game-time string forward by exactly two calendar days.
 * For the NCAA Tournament, R64 (Thu/Fri) and R32 (Sat/Sun) fall entirely
 * within one DST period, so adding 48 hours preserves the local time of day.
 */
function shiftByTwoDays(isoTime: string): string {
  const ms = new Date(isoTime).getTime() + 2 * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

/** Map an R64 framework day to the corresponding R32 day (+2 days). */
function r32DayFromR64Day(r64Day: GameDay): GameDay {
  if (r64Day === 'thursday') return 'saturday';
  if (r64Day === 'friday') return 'sunday';
  return 'tbd';
}

/**
 * POST /api/admin/reset-r32-skeleton
 *
 * Deletes all existing R32 skeleton games and immediately re-generates them
 * from the current R64 game times. Idempotent — safe to call multiple times.
 *
 * Returns: { deleted: number, created: number }
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Delete all existing R32 skeleton games in batches of 400 ──
    const existingSnap = await db
      .collection('games')
      .where('isSkeletonGame', '==', true)
      .where('round', '==', 'Round of 32')
      .get();

    let deleted = 0;
    const BATCH_LIMIT = 400;
    let batch = db.batch();
    let opsInBatch = 0;

    for (const doc of existingSnap.docs) {
      batch.delete(doc.ref);
      opsInBatch++;
      deleted++;
      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) {
      await batch.commit();
    }

    // ── 2. Fetch R64 games and build bracketKey → gameTime map ──
    const r64Snap = await db.collection('games').where('round', '==', 'Round of 64').get();
    const r64GameTimeMap = new Map<string, string | null>();
    for (const doc of r64Snap.docs) {
      const data = doc.data();
      const bracketKey = mapFirestoreGameToBracketKey({
        region: data.region,
        homeSeed: data.homeSeed,
        awaySeed: data.awaySeed,
      });
      if (bracketKey) {
        r64GameTimeMap.set(bracketKey, data.gameTime ?? null);
      }
    }

    // ── 3. Re-create all R32 skeleton games (always overwrite, no skip check) ──
    const r32Games = listFrameworkGamesByRound('Round of 32');
    let created = 0;

    for (const game of r32Games) {
      const docRef = db.collection('games').doc(game.id);

      let gameTime: string | null = null;
      let day: GameDay = game.day;

      const firstParticipant = game.participants[0];
      if (firstParticipant.type === 'winnerOf') {
        const upstreamId = firstParticipant.gameId;
        const upstreamR64Time = r64GameTimeMap.get(upstreamId) ?? null;
        if (upstreamR64Time) {
          gameTime = shiftByTwoDays(upstreamR64Time);
        }
        day = r32DayFromR64Day(deriveDayFromGameTime(upstreamR64Time));
      }

      await docRef.set({
        bracketKey: game.id,
        round: 'Round of 32',
        region: game.region,
        day,
        homeTeam: null,
        awayTeam: null,
        homeSeed: null,
        awaySeed: null,
        gameTime,
        isComplete: false,
        winner: null,
        isSkeletonGame: true,
        createdAt: new Date().toISOString(),
      });

      created++;
    }

    return NextResponse.json({ deleted, created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

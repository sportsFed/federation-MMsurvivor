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
 * Atomically deletes all existing R32 skeleton docs from Firestore and
 * regenerates them from the current R64 game data.  Safe to run multiple
 * times — each run always produces { deleted: 16, created: 16 } (assuming
 * all 16 R32 framework games are present and R64 data is clean).
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Resolve the canonical set of R32 game IDs from the framework ──
    const r32Games = listFrameworkGamesByRound('Round of 32');
    const r32GameIds = r32Games.map((g) => g.id);

    // ── 2. Delete any existing R32 docs in batches ──
    const BATCH_SIZE = 500; // Firestore batch limit
    let deleted = 0;

    for (let i = 0; i < r32GameIds.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const id of r32GameIds.slice(i, i + BATCH_SIZE)) {
        batch.delete(db.collection('games').doc(id));
      }
      await batch.commit();
      deleted += r32GameIds.slice(i, i + BATCH_SIZE).length;
    }

    // ── 3. Fetch current R64 games from Firestore and build bracketKey → gameTime map ──
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

    // ── 4. Regenerate all R32 skeleton docs (no skip — we just deleted them) ──
    let created = 0;

    for (const game of r32Games) {
      let gameTime: string | null = null;
      let day: GameDay = game.day;

      const firstParticipant = game.participants[0];
      if (firstParticipant.type === 'winnerOf') {
        const upstreamId = firstParticipant.gameId; // e.g. "E-R64-G1"
        const upstreamR64Time = r64GameTimeMap.get(upstreamId) ?? null;
        if (upstreamR64Time) {
          gameTime = shiftByTwoDays(upstreamR64Time);
        }
        day = r32DayFromR64Day(deriveDayFromGameTime(upstreamR64Time));
      }

      await db.collection('games').doc(game.id).set({
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

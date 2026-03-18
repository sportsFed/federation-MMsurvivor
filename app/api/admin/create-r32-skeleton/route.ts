import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import {
  listFrameworkGamesByRound,
  getFrameworkGame,
  mapFirestoreGameToBracketKey,
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

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Fetch all R64 games from Firestore and build bracketKey → gameTime map ──
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

    // ── 2. Create R32 skeleton games, inheriting times from upstream R64 games ──
    const r32Games = listFrameworkGamesByRound('Round of 32');
    let created = 0;
    let skipped = 0;

    for (const game of r32Games) {
      const docRef = db.collection('games').doc(game.id);
      const existing = await docRef.get();

      if (existing.exists) {
        skipped++;
        continue;
      }

      // Derive gameTime and day from the first upstream R64 game
      let gameTime: string | null = null;
      let day: GameDay = game.day;

      const firstParticipant = game.participants[0];
      if (firstParticipant.type === 'winnerOf') {
        const upstreamId = firstParticipant.gameId; // e.g. "E-R64-G1"
        const upstreamR64Time = r64GameTimeMap.get(upstreamId) ?? null;
        if (upstreamR64Time) {
          // Shift two days forward so Thursday R64 → Saturday R32, Friday R64 → Sunday R32.
          // Both upstream R64 games for a given R32 slot are on the same day, so using
          // the first upstream game's time is sufficient — admins can fine-tune via "Set time".
          gameTime = shiftByTwoDays(upstreamR64Time);
        }
        // Derive the R32 day from the upstream R64 framework game's day
        const upstreamFrameworkGame = getFrameworkGame(upstreamId);
        if (upstreamFrameworkGame) {
          day = r32DayFromR64Day(upstreamFrameworkGame.day);
        }
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

    return NextResponse.json({ created, skipped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

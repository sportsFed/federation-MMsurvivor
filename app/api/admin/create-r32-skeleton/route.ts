import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { listFrameworkGamesByRound } from '@/lib/bracket/framework';

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

      await docRef.set({
        bracketKey: game.id,
        round: 'Round of 32',
        region: game.region,
        day: game.day,
        homeTeam: null,
        awayTeam: null,
        homeSeed: null,
        awaySeed: null,
        gameTime: null,
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

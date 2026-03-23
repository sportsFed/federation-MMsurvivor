import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

interface E8Participant {
  type: 'winnerOf';
  gameId: string;
}

interface E8GameSpec {
  bracketKey: string;
  round: 'Elite Eight';
  region: string;
  day: string;
  gameTime: string;
  homeTeam: null;
  homeSeed: null;
  awayTeam: null;
  awaySeed: null;
  isSkeletonGame: true;
  isComplete: false;
  winner: null;
  participants: E8Participant[];
}

const E8_GAMES: E8GameSpec[] = [
  {
    bracketKey: 'W-E8-G1',
    round: 'Elite Eight',
    region: 'West',
    day: 'saturday',
    gameTime: '2026-03-28T20:00:00-04:00',
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'W-S16-G1' },
      { type: 'winnerOf', gameId: 'W-S16-G2' },
    ],
  },
  {
    bracketKey: 'S-E8-G1',
    round: 'Elite Eight',
    region: 'South',
    day: 'saturday',
    gameTime: '2026-03-28T22:30:00-04:00',
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'S-S16-G1' },
      { type: 'winnerOf', gameId: 'S-S16-G2' },
    ],
  },
  {
    bracketKey: 'E-E8-G1',
    round: 'Elite Eight',
    region: 'East',
    day: 'sunday',
    gameTime: '2026-03-29T18:00:00-04:00',
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'E-S16-G1' },
      { type: 'winnerOf', gameId: 'E-S16-G2' },
    ],
  },
  {
    bracketKey: 'MW-E8-G1',
    round: 'Elite Eight',
    region: 'Midwest',
    day: 'sunday',
    gameTime: '2026-03-29T20:30:00-04:00',
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'MW-S16-G1' },
      { type: 'winnerOf', gameId: 'MW-S16-G2' },
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const force = request.nextUrl.searchParams.get('force') === 'true';
    let created = 0;
    let skipped = 0;
    let forceOverwritten = 0;

    for (const game of E8_GAMES) {
      const docRef = db.collection('games').doc(game.bracketKey);

      if (!force) {
        const existing = await docRef.get();
        if (existing.exists) {
          skipped++;
          continue;
        }
      }

      await docRef.set({
        ...game,
        createdAt: new Date().toISOString(),
      });

      if (force) {
        forceOverwritten++;
      } else {
        created++;
      }
    }

    if (force) {
      return NextResponse.json({ created: 0, forceOverwritten });
    }
    return NextResponse.json({ created, skipped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

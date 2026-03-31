import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

interface F4Participant {
  type: 'winnerOf';
  gameId: string;
}

interface F4GameSpec {
  bracketKey: string;
  round: 'Final Four' | 'National Championship';
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
  participants: F4Participant[];
}

const F4_GAMES: F4GameSpec[] = [
  {
    bracketKey: 'F4-G1',
    round: 'Final Four',
    region: 'Midwest/West',
    day: 'saturday',
    gameTime: '2026-04-05T00:00:00-04:00', // Saturday April 4 8PM ET
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'MW-E8-G1' },
      { type: 'winnerOf', gameId: 'W-E8-G1' },
    ],
  },
  {
    bracketKey: 'F4-G2',
    round: 'Final Four',
    region: 'East/South',
    day: 'saturday',
    gameTime: '2026-04-05T02:30:00-04:00', // Saturday April 4 ~10:30PM ET
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'E-E8-G1' },
      { type: 'winnerOf', gameId: 'S-E8-G1' },
    ],
  },
  {
    bracketKey: 'NATTY-G1',
    round: 'National Championship',
    region: 'National',
    day: 'monday',
    gameTime: '2026-04-07T01:00:00-04:00', // Monday April 6 9PM ET
    homeTeam: null,
    homeSeed: null,
    awayTeam: null,
    awaySeed: null,
    isSkeletonGame: true,
    isComplete: false,
    winner: null,
    participants: [
      { type: 'winnerOf', gameId: 'F4-G1' },
      { type: 'winnerOf', gameId: 'F4-G2' },
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

    for (const game of F4_GAMES) {
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

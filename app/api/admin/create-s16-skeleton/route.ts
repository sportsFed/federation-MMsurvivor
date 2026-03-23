import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

interface S16GameSpec {
  bracketKey: string;
  round: 'Sweet Sixteen';
  region: string;
  day: string;
  gameTime: string;
  homeTeam: string;
  homeSeed: number;
  awayTeam: string;
  awaySeed: number;
  isSkeletonGame: false;
  isComplete: false;
  winner: null;
}

const S16_GAMES: S16GameSpec[] = [
  {
    bracketKey: 'W-S16-G1',
    round: 'Sweet Sixteen',
    region: 'West',
    day: 'thursday',
    gameTime: '2026-03-26T23:10:00-04:00',
    homeTeam: 'Texas',
    homeSeed: 11,
    awayTeam: 'Purdue',
    awaySeed: 2,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'W-S16-G2',
    round: 'Sweet Sixteen',
    region: 'West',
    day: 'thursday',
    gameTime: '2026-03-27T01:45:00-04:00',
    homeTeam: 'Arkansas',
    homeSeed: 4,
    awayTeam: 'Arizona',
    awaySeed: 1,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'S-S16-G1',
    round: 'Sweet Sixteen',
    region: 'South',
    day: 'thursday',
    gameTime: '2026-03-26T23:30:00-04:00',
    homeTeam: 'Iowa',
    homeSeed: 9,
    awayTeam: 'Nebraska',
    awaySeed: 4,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'S-S16-G2',
    round: 'Sweet Sixteen',
    region: 'South',
    day: 'thursday',
    gameTime: '2026-03-27T02:05:00-04:00',
    homeTeam: 'Illinois',
    homeSeed: 3,
    awayTeam: 'Houston',
    awaySeed: 2,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'E-S16-G1',
    round: 'Sweet Sixteen',
    region: 'East',
    day: 'friday',
    gameTime: '2026-03-27T23:10:00-04:00',
    homeTeam: "St. John's (NY)",
    homeSeed: 5,
    awayTeam: 'Duke',
    awaySeed: 1,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'E-S16-G2',
    round: 'Sweet Sixteen',
    region: 'East',
    day: 'friday',
    gameTime: '2026-03-28T01:45:00-04:00',
    homeTeam: 'Michigan St.',
    homeSeed: 3,
    awayTeam: 'UConn',
    awaySeed: 2,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'MW-S16-G1',
    round: 'Sweet Sixteen',
    region: 'Midwest',
    day: 'friday',
    gameTime: '2026-03-27T23:35:00-04:00',
    homeTeam: 'Alabama',
    homeSeed: 4,
    awayTeam: 'Michigan',
    awaySeed: 1,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
  },
  {
    bracketKey: 'MW-S16-G2',
    round: 'Sweet Sixteen',
    region: 'Midwest',
    day: 'friday',
    gameTime: '2026-03-28T02:10:00-04:00',
    homeTeam: 'Tennessee',
    homeSeed: 6,
    awayTeam: 'Iowa State',
    awaySeed: 2,
    isSkeletonGame: false,
    isComplete: false,
    winner: null,
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

    for (const game of S16_GAMES) {
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

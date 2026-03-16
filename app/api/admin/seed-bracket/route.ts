import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { clearCollection } from '@/lib/firestoreUtils';

// Tip-off times (EDT = UTC-4) for each Round of 64 matchup keyed as "Region-homeSeed-awaySeed"
const GAME_TIMES: Record<string, string> = {
  // Thursday, March 19
  'East-6-11':    '2026-03-19T12:15:00-04:00',
  'South-3-14':   '2026-03-19T12:40:00-04:00',
  'South-5-12':   '2026-03-19T13:40:00-04:00',
  'West-4-13':    '2026-03-19T14:00:00-04:00',
  'East-3-14':    '2026-03-19T14:45:00-04:00',
  'South-6-11':   '2026-03-19T15:10:00-04:00',
  'South-4-13':   '2026-03-19T16:10:00-04:00',
  'West-5-12':    '2026-03-19T16:30:00-04:00',
  'Midwest-1-16': '2026-03-19T18:50:00-04:00',
  'East-8-9':     '2026-03-19T19:10:00-04:00',
  'South-7-10':   '2026-03-19T19:25:00-04:00',
  'West-3-14':    '2026-03-19T19:35:00-04:00',
  'Midwest-8-9':  '2026-03-19T21:20:00-04:00',
  'East-1-16':    '2026-03-19T21:40:00-04:00',
  'South-2-15':   '2026-03-19T21:55:00-04:00',
  'West-6-11':    '2026-03-19T22:05:00-04:00',
  // Friday, March 20
  'South-8-9':    '2026-03-20T12:15:00-04:00',
  'East-2-15':    '2026-03-20T12:40:00-04:00',
  'Midwest-7-10': '2026-03-20T13:40:00-04:00',
  'East-4-13':    '2026-03-20T14:00:00-04:00',
  'South-1-16':   '2026-03-20T14:45:00-04:00',
  'East-7-10':    '2026-03-20T15:10:00-04:00',
  'Midwest-2-15': '2026-03-20T16:10:00-04:00',
  'East-5-12':    '2026-03-20T16:30:00-04:00',
  'Midwest-4-13': '2026-03-20T18:50:00-04:00',
  'Midwest-6-11': '2026-03-20T19:10:00-04:00',
  'West-2-15':    '2026-03-20T19:25:00-04:00',
  'West-1-16':    '2026-03-20T19:35:00-04:00',
  'Midwest-5-12': '2026-03-20T21:20:00-04:00',
  'Midwest-3-14': '2026-03-20T21:40:00-04:00',
  'West-7-10':    '2026-03-20T21:55:00-04:00',
  'West-8-9':     '2026-03-20T22:05:00-04:00',
};

// Standard matchup pairings for Round of 64: 1v16, 2v15, 3v14, 4v13, 5v12, 6v11, 7v10, 8v9
const MATCHUP_PAIRS = [
  [1, 16],
  [2, 15],
  [3, 14],
  [4, 13],
  [5, 12],
  [6, 11],
  [7, 10],
  [8, 9],
];

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Clear existing games first to make this operation idempotent
    await clearCollection('games');
    // Fetch all teams from Firestore
    const teamsSnap = await db.collection('teams').get();
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const mainRegions = ['East', 'West', 'South', 'Midwest'];
    const batch = db.batch();
    const gamesRef = db.collection('games');
    let gamesCreated = 0;

    for (const region of mainRegions) {
      const regionTeams = teams.filter((t: any) => t.region === region);

      for (const [highSeed, lowSeed] of MATCHUP_PAIRS) {
        const homeTeam = regionTeams.find((t: any) => t.seed === highSeed);
        const awayTeam = regionTeams.find((t: any) => t.seed === lowSeed);

        if (!homeTeam || !awayTeam) {
          // Skip if teams haven't been loaded yet for this seed matchup
          continue;
        }

        const gameTimeKey = `${region}-${highSeed}-${lowSeed}`;
        const newDoc = gamesRef.doc();
        batch.set(newDoc, {
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homeSeed: highSeed,
          awaySeed: lowSeed,
          region,
          round: 'Round of 64',
          gameDate: GAME_TIMES[gameTimeKey] ?? null,
          winner: null,
          isComplete: false,
          createdAt: new Date().toISOString(),
        });
        gamesCreated++;
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Reset and generated ${gamesCreated} Round of 64 games.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

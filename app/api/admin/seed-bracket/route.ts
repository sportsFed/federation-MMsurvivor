import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

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

        const newDoc = gamesRef.doc();
        batch.set(newDoc, {
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homeSeed: highSeed,
          awaySeed: lowSeed,
          region,
          round: 'Round of 64',
          gameDate: body.gameDate ?? null,
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
      message: `Generated ${gamesCreated} Round of 64 games.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

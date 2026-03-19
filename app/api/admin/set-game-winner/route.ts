import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { scoreCompletedGame } from '@/lib/scoreGame';

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { gameId, winner } = await request.json();
    if (!gameId || !winner) {
      return NextResponse.json({ error: 'Missing gameId or winner' }, { status: 400 });
    }

    // Read game document to get team/seed data needed for scoring
    const gameSnap = await db.collection('games').doc(gameId).get();
    if (!gameSnap.exists) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const gameData = gameSnap.data() as any;

    // Mark game complete
    await db.collection('games').doc(gameId).update({ winner, isComplete: true });

    // Determine loser and seeds (seeds may be null for skeleton/R32 games)
    const loserName: string = gameData.homeTeam === winner ? gameData.awayTeam : gameData.homeTeam;
    const winnerSeed: number = (gameData.homeTeam === winner ? gameData.homeSeed : gameData.awaySeed) ?? 0;
    const loserSeed: number = (gameData.homeTeam === winner ? gameData.awaySeed : gameData.homeSeed) ?? 0;
    const round: string = gameData.round ?? 'Round of 64';

    // Score entries and mark losing team as eliminated
    await scoreCompletedGame(gameId, winner, loserName, round, winnerSeed, loserSeed);

    await db.collection('pickLog').add({
      action: 'admin_set_winner',
      gameId,
      winner,
      timestamp: new Date().toISOString(),
      adminAction: true,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

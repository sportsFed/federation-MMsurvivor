import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { calculateSurvivorScore } from '@/lib/scoring';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch live scores from ESPN
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard'
    );
    const data = await res.json();
    const espnGames: any[] = data.events ?? [];

    // 2. Load all incomplete Firestore games
    const fsGamesSnap = await db.collection('games').where('isComplete', '==', false).get();
    const fsGames = fsGamesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    let processed = 0;

    for (const espnGame of espnGames) {
      if (!espnGame.status?.type?.completed) continue;

      const competition = espnGame.competitions?.[0];
      const winnerCompetitor = competition?.competitors?.find((c: any) => c.winner);
      if (!winnerCompetitor) continue;

      const winnerName: string = winnerCompetitor.team.displayName;

      // Find matching Firestore game by home or away team name
      const fsGame = fsGames.find(
        (g: any) => g.homeTeam === winnerName || g.awayTeam === winnerName
      );
      if (!fsGame) continue;

      const round: string = fsGame.round ?? 'Round of 64';

      // Find winner seed for scoring
      const winnerSeed: number =
        fsGame.homeTeam === winnerName ? fsGame.homeSeed : fsGame.awaySeed;
      const points = calculateSurvivorScore(winnerSeed, round);

      // Mark game complete
      await db.collection('games').doc(fsGame.id).update({
        winner: winnerName,
        isComplete: true,
      });

      // Score entries
      const entriesSnap = await db.collection('entries').where('isEliminated', '==', false).get();
      const batch = db.batch();

      for (const entryDoc of entriesSnap.docs) {
        const entry = entryDoc.data() as any;
        const survivorPicks: any[] = entry.survivorPicks ?? [];

        // Find the pick for this game
        const pickIndex = survivorPicks.findIndex((p: any) => p.gameId === fsGame.id);
        if (pickIndex === -1) continue; // Entry didn't pick in this game

        const pickedTeam = survivorPicks[pickIndex].team;
        const isWinner = pickedTeam === winnerName;

        // Update survivorPicks result
        const updatedPicks = [...survivorPicks];
        updatedPicks[pickIndex] = { ...updatedPicks[pickIndex], result: isWinner ? 'win' : 'loss' };

        if (isWinner) {
          batch.update(entryDoc.ref, {
            survivorPicks: updatedPicks,
            totalPoints: (entry.totalPoints ?? 0) + points,
          });
        } else {
          batch.update(entryDoc.ref, {
            survivorPicks: updatedPicks,
            isEliminated: true,
          });
        }
      }

      await batch.commit();
      processed++;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error('Cron update-games error:', error);
    return NextResponse.json({ success: false, error: 'Scoring update failed' }, { status: 500 });
  }
}

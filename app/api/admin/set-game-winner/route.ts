import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { scoreCompletedGame } from '@/lib/scoreGame';
import { resolveSkeletonGames } from '@/lib/resolveSkeletonGames';
import { calculateFinalFourScore, calculateNationalChampScore } from '@/lib/scoring';

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

    // Auto-resolve any R32 skeleton games whose upstream R64 games are now complete
    try {
      const resolveResult = await resolveSkeletonGames();
      console.log('[set-game-winner] resolveSkeletonGames:', resolveResult);
    } catch (resolveErr: unknown) {
      console.warn('[set-game-winner] resolveSkeletonGames failed (non-fatal):', resolveErr);
    }

    // Auto-score F4 regional or National Championship picks
    try {
      const REGION_TO_SLOT: Record<string, string> = {
        'East': 'f1',
        'West': 'f2',
        'South': 'f3',
        'Midwest': 'f4',
      };

      if (gameData.round === 'Elite Eight' || gameData.round === 'National Championship') {
        const isEliteEight = gameData.round === 'Elite Eight';
        const isNatty = gameData.round === 'National Championship';

        // Look up winner's seeds from teams collection
        const teamQuery = await db.collection('teams').where('name', '==', winner).limit(1).get();
        if (!teamQuery.empty) {
          const teamData = teamQuery.docs[0].data();
          const regionalSeed: number = teamData.regionalSeed ?? 0;
          const nationalSeed: number = teamData.nationalSeed ?? 0;

          let slotKey: string | null = null;
          if (isEliteEight) {
            slotKey = REGION_TO_SLOT[gameData.region as string] ?? null;
            if (!slotKey) {
              console.warn(`[set-game-winner] F4 auto-score: unknown region "${gameData.region}" — skipping`);
            }
          }

          if (isEliteEight && slotKey || isNatty) {
            const entriesSnap = await db.collection('entries').get();
            const f4Batch = db.batch();
            let f4UpdateCount = 0;

            for (const entryDoc of entriesSnap.docs) {
              const data = entryDoc.data();
              const fp = data.finalFourPicks as Record<string, string> | undefined;
              if (!fp) continue;

              let pts = 0;
              let fieldKey: string | null = null;

              if (isEliteEight && slotKey && fp[slotKey] === winner) {
                pts = calculateFinalFourScore(regionalSeed);
                fieldKey = slotKey;
              } else if (isNatty && fp['champ'] === winner) {
                pts = calculateNationalChampScore(nationalSeed);
                fieldKey = 'champ';
              }

              if (fieldKey && pts > 0) {
                const currentTotal: number = data.totalPoints ?? 0;
                f4Batch.update(entryDoc.ref, {
                  totalPoints: parseFloat((currentTotal + pts).toFixed(1)),
                  [`finalFourResults.${fieldKey}`]: { team: winner, points: pts, scored: true },
                });
                f4UpdateCount++;
              }
            }

            await f4Batch.commit();
            const regionLabel = isNatty ? 'National Championship' : `region ${gameData.region as string}`;
            console.log(`[set-game-winner] F4 auto-score: ${f4UpdateCount} entries updated for ${regionLabel} slot ${slotKey ?? 'champ'}`);
          }
        }
      }
    } catch (f4Err: unknown) {
      console.warn('[set-game-winner] F4 auto-score failed (non-fatal):', f4Err);
    }

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

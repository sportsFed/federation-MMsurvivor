import { db } from '@/lib/firebase/adminApp';
import { calculateSurvivorScore, calculateConsolationScore } from '@/lib/scoring';

/**
 * Score all active entries for a completed game and mark the losing team as
 * eliminated in the teams collection.
 *
 * This is the single source of truth for game-completion side effects, shared
 * between the ESPN cron path and the admin manual set-winner path.
 *
 * @param gameId      - Firestore document ID of the completed game
 * @param winnerName  - Display name of the winning team
 * @param loserName   - Display name of the losing team
 * @param round       - Round name string (e.g. "Round of 64")
 * @param winnerSeed  - Regional seed of the winning team (for point calc)
 * @param loserSeed   - Regional seed of the losing team (for consolation calc)
 * @returns Number of entry documents updated
 */
export async function scoreCompletedGame(
  gameId: string,
  winnerName: string,
  loserName: string,
  round: string,
  winnerSeed: number,
  loserSeed: number,
): Promise<number> {
  const points = calculateSurvivorScore(winnerSeed, round);

  // 1. Mark losing team as eliminated in the teams collection
  const loserSnap = await db.collection('teams').where('name', '==', loserName).limit(1).get();
  if (!loserSnap.empty) {
    await loserSnap.docs[0].ref.update({ isEliminated: true });
  }

  // 2. Score all active entries that have a pick for this game
  const entriesSnap = await db.collection('entries').where('isEliminated', '==', false).get();
  const batch = db.batch();
  let scored = 0;

  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data() as any;
    const survivorPicks: any[] = entry.survivorPicks ?? [];

    const pickIndex = survivorPicks.findIndex((p: any) => p.gameId === gameId);
    if (pickIndex === -1) continue;

    const pickedTeam = survivorPicks[pickIndex].team;
    const isWinner = pickedTeam === winnerName;

    const updatedPicks = [...survivorPicks];
    updatedPicks[pickIndex] = { ...updatedPicks[pickIndex], result: isWinner ? 'win' : 'loss' };

    if (isWinner) {
      batch.update(entryDoc.ref, {
        survivorPicks: updatedPicks,
        totalPoints: (entry.totalPoints ?? 0) + points,
      });
    } else {
      const consolationPoints = calculateConsolationScore(loserSeed);
      batch.update(entryDoc.ref, {
        survivorPicks: updatedPicks,
        isEliminated: true,
        consolationPoints: (entry.consolationPoints ?? 0) + consolationPoints,
        totalPoints: (entry.totalPoints ?? 0) + consolationPoints,
      });
    }
    scored++;
  }

  await batch.commit();
  return scored;
}

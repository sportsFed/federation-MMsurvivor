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

  // 2. Score all entries that have a pick for this game.
  // Fetch ALL entries (not just active ones) so that already-eliminated entries can still
  // earn points for their second E8 pick, which scores independently of survival status.
  const entriesSnap = await db.collection('entries').get();
  const batch = db.batch();
  let scored = 0;

  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data() as any;
    const survivorPicks: any[] = entry.survivorPicks ?? [];

    const pickIndex = survivorPicks.findIndex((p: any) => p.gameId === gameId);
    if (pickIndex === -1) continue;

    const pickedTeam = survivorPicks[pickIndex].team;
    const isWinner = pickedTeam === winnerName;
    const isAlreadyEliminated = entry.isEliminated === true;

    const updatedPicks = [...survivorPicks];
    updatedPicks[pickIndex] = { ...updatedPicks[pickIndex], result: isWinner ? 'win' : 'loss' };

    if (isWinner) {
      // Award points regardless of elimination status — never flip isEliminated back to false
      batch.update(entryDoc.ref, {
        survivorPicks: updatedPicks,
        totalPoints: (entry.totalPoints ?? 0) + points,
      });
    } else {
      const consolationPoints = calculateConsolationScore(loserSeed);
      batch.update(entryDoc.ref, {
        survivorPicks: updatedPicks,
        totalPoints: (entry.totalPoints ?? 0) + consolationPoints,
        consolationPoints: (entry.consolationPoints ?? 0) + consolationPoints,
        // Only write isEliminated: true if not already eliminated — never re-write it
        ...(isAlreadyEliminated ? {} : { isEliminated: true }),
      });
    }
    scored++;
  }

  await batch.commit();
  return scored;
}
